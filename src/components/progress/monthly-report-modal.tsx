"use client"

import React, { useState, useMemo, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Workout, Exercise } from "@/lib/types"
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  Flame,
  Loader2,
  Calendar as CalendarIcon,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts"
import { toast } from "sonner"
import { toPng } from "html-to-image"
import soundManager from "@/lib/sounds"
import {
  toLocalDateStr,
  groupWorkoutsIntoSessions,
  calculateCurrentStreak,
} from "./workout-helpers"
import {
  getMonthAndPrecedingPeriod,
  calculatePeriodStats,
} from "./muscle-distribution-helpers"
import { MuscleDistributionRadar } from "./muscle-distribution-radar"

function normalizeDateStr(raw?: string): string {
  if (!raw) return ""
  const clean = raw.slice(0, 10).split("T")[0]
  const parts = clean.split("-")
  if (parts.length === 3) {
    const y = parts[0]
    const m = parts[1].padStart(2, "0")
    const d = parts[2].padStart(2, "0")
    return `${y}-${m}-${d}`
  }
  return clean
}

interface MonthlyReportModalProps {
  isOpen: boolean
  onClose: () => void
  workouts: Workout[]
  exercises?: Exercise[]
  initialYear?: number
  initialMonthIndex?: number // 0-11
}

type MetricTab = "workouts" | "duration" | "volume"

const CALENDAR_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function MonthlyReportModal({
  isOpen,
  onClose,
  workouts,
  exercises = [],
  initialYear,
  initialMonthIndex,
}: MonthlyReportModalProps) {
  const [mounted, setMounted] = useState(false)
  const now = new Date()
  const [year, setYear] = useState<number>(initialYear ?? now.getFullYear())
  const [monthIndex, setMonthIndex] = useState<number>(initialMonthIndex ?? now.getMonth())
  const [activeMetric, setActiveMetric] = useState<MetricTab>("workouts")
  const [isExporting, setIsExporting] = useState(false)

  const reportCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // Month navigation
  const handlePrevMonth = () => {
    soundManager.play("click", 0.15)
    if (monthIndex === 0) {
      setMonthIndex(11)
      setYear((y) => y - 1)
    } else {
      setMonthIndex((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    soundManager.play("click", 0.15)
    if (monthIndex === 11) {
      setMonthIndex(0)
      setYear((y) => y + 1)
    } else {
      setMonthIndex((m) => m + 1)
    }
  }

  // Current & preceding month period info
  const periodInfo = useMemo(() => {
    return getMonthAndPrecedingPeriod(year, monthIndex)
  }, [year, monthIndex])

  // Filter workouts for current and previous month
  const { currentMonthWorkouts, previousMonthWorkouts, currentMonthSessions, previousMonthSessions } =
    useMemo(() => {
      const curr = workouts.filter((w) => {
        const d = (w.date || "").slice(0, 10)
        return d >= periodInfo.currentStart && d <= periodInfo.currentEnd
      })
      const prev = workouts.filter((w) => {
        const d = (w.date || "").slice(0, 10)
        return d >= periodInfo.previousStart && d <= periodInfo.previousEnd
      })
      return {
        currentMonthWorkouts: curr,
        previousMonthWorkouts: prev,
        currentMonthSessions: groupWorkoutsIntoSessions(curr),
        previousMonthSessions: groupWorkoutsIntoSessions(prev),
      }
    }, [workouts, periodInfo])

  // 12-Month Bar Chart Data (Reference 04: "S O N D J F M A M J J A")
  const twelveMonthsData = useMemo(() => {
    const result: {
      key: string
      label: string
      letter: string
      monthShort: string
      workouts: number
      durationMin: number
      volumeKg: number
      isCurrent: boolean
    }[] = []

    for (let offset = 11; offset >= 0; offset--) {
      let m = monthIndex - offset
      let y = year
      while (m < 0) {
        m += 12
        y -= 1
      }
      const d = new Date(y, m, 1)
      const monthShort = d.toLocaleDateString("en-US", { month: "short" })
      const letter = monthShort.charAt(0).toUpperCase()
      const mStr = String(m + 1).padStart(2, "0")
      const lastDay = new Date(y, m + 1, 0).getDate()
      const startStr = `${y}-${mStr}-01`
      const endStr = `${y}-${mStr}-${String(lastDay).padStart(2, "0")}`

      const mWorkouts = workouts.filter((w) => {
        const wDate = (w.date || "").slice(0, 10)
        return wDate >= startStr && wDate <= endStr
      })
      const mSessions = groupWorkoutsIntoSessions(mWorkouts)
      const count = mSessions.length
      const duration = mSessions.reduce((acc, s) => acc + s.durationMin, 0)
      let vol = 0
      mWorkouts.forEach((w) => {
        const s = Math.max(1, w.sets || 1)
        const r = w.reps || 0
        const wt = w.weight || 0
        if (wt > 0) vol += wt * (r > 0 ? r : s)
        else if (w.volume && w.volume > 0) vol += w.volume
        else vol += s * r
      })

      result.push({
        key: `${y}-${m}`,
        label: `${monthShort} ${y}`,
        letter,
        monthShort,
        workouts: count,
        durationMin: duration,
        volumeKg: Math.round(vol),
        isCurrent: offset === 0,
      })
    }

    return result
  }, [workouts, year, monthIndex])

  // Summary stats (2x2 grid)
  const summary = useMemo(() => {
    const curr = calculatePeriodStats(currentMonthWorkouts)
    const prev = calculatePeriodStats(previousMonthWorkouts)

    return {
      workouts: { curr: currentMonthSessions.length, prev: previousMonthSessions.length },
      duration: { curr: curr.durationMin, prev: prev.durationMin },
      volume: { curr: curr.volumeKg, prev: prev.volumeKg },
      sets: { curr: curr.sets, prev: prev.sets },
    }
  }, [currentMonthWorkouts, previousMonthWorkouts, currentMonthSessions, previousMonthSessions])

  // Calendar Workout Days Log
  const calendarLog = useMemo(() => {
    const daysInMonth = periodInfo.daysInCurrentMonth
    const firstDay = periodInfo.firstDayOfWeek // 0 = Sun ... 6 = Sat
    const trainedDates = new Set<string>()

    currentMonthWorkouts.forEach((w) => {
      const norm = normalizeDateStr(w.date)
      if (norm) trainedDates.add(norm)
    })
    currentMonthSessions.forEach((s) => {
      const norm = normalizeDateStr(s.date)
      if (norm) trainedDates.add(norm)
    })

    const slots: {
      type: "empty" | "day"
      dayNum?: number
      dateStr?: string
      hasWorkout?: boolean
    }[] = []

    for (let i = 0; i < firstDay; i++) {
      slots.push({ type: "empty" })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, "0")
      const monthStr = String(monthIndex + 1).padStart(2, "0")
      const dateStr = `${year}-${monthStr}-${dayStr}`
      slots.push({
        type: "day",
        dayNum: d,
        dateStr,
        hasWorkout: trainedDates.has(dateStr),
      })
    }

    // Streak calculation with Sunday skipping (commit f3bcae6)
    const allWorkoutDates = workouts.map((w) => (w.date || "").slice(0, 10))
    const currentStreakDays = calculateCurrentStreak(allWorkoutDates)
    const weekStreak = Math.floor(currentStreakDays / 6) // Roughly weeks count or 0

    return {
      slots,
      activeDaysCount: trainedDates.size,
      totalDays: daysInMonth,
      weekStreak,
    }
  }, [periodInfo, currentMonthWorkouts, currentMonthSessions, monthIndex, year, workouts])

  // Share / Download PNG Handler
  const handleShareOrDownload = async () => {
    if (!reportCardRef.current || isExporting) return
    soundManager.play("click", 0.25)
    setIsExporting(true)

    const loadingToast = toast.loading("Generating report image...")

    try {
      const dataUrl = await toPng(reportCardRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: "#000000",
        cacheBust: true,
      })

      const fileName = `${periodInfo.currentMonthName.toLowerCase()}-${year}-fitness-report.png`

      // Mobile Native Share
      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
        try {
          const res = await fetch(dataUrl)
          const blob = await res.blob()
          const file = new File([blob], fileName, { type: "image/png" })

          if (navigator.canShare({ files: [file] })) {
            toast.dismiss(loadingToast)
            await navigator.share({
              title: `${periodInfo.currentMonthName} ${year} Workout Report`,
              text: `Check out my ${periodInfo.currentMonthName} ${year} performance report!`,
              files: [file],
            })
            toast.success("Report shared successfully!")
            setIsExporting(false)
            return
          }
        } catch (shareErr: any) {
          if (shareErr.name === "AbortError") {
            toast.dismiss(loadingToast)
            setIsExporting(false)
            return
          }
        }
      }

      // Desktop direct download fallback
      toast.dismiss(loadingToast)
      const link = document.createElement("a")
      link.download = fileName
      link.href = dataUrl
      link.click()
      toast.success("Report image downloaded!")
    } catch (err) {
      console.error("Failed to generate report image", err)
      toast.dismiss(loadingToast)
      toast.error("Failed to generate report image. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  // Delta line under title
  const currentMetricVal =
    activeMetric === "workouts"
      ? summary.workouts.curr
      : activeMetric === "duration"
      ? `${summary.duration.curr}m`
      : `${summary.volume.curr}kg`

  const prevMetricVal =
    activeMetric === "workouts"
      ? summary.workouts.prev
      : activeMetric === "duration"
      ? `${summary.duration.prev}m`
      : `${summary.volume.prev}kg`

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex justify-center overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-lg min-h-screen bg-black text-zinc-100 flex flex-col px-4 pt-3 pb-32 sm:px-6"
          >
            {/* ─── Top Bar: Back button, Monthly Report Title, Month Switcher ─── */}
            <div className="sticky top-0 z-40 -mx-4 px-4 py-3 bg-black/95 backdrop-blur-md border-b border-zinc-900 flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => {
                  soundManager.play("click", 0.2)
                  onClose()
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
                aria-label="Back"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <span className="text-base font-semibold text-white font-display">
                Monthly Report
              </span>

              {/* Month Stepper */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ─── Exportable Report Area (Exact layout from 04-monthly-report.jpg) ─── */}
            <div ref={reportCardRef} className="bg-black text-white space-y-6 pb-6">
              {/* 1. Header: Month Year + Delta (e.g. "August 2026", "0 -> 0") */}
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
                  {periodInfo.currentMonthName} {year}
                </h1>
                <p className="text-xs text-zinc-400 font-mono">
                  {currentMetricVal} (prev month: {prevMetricVal})
                </p>
              </div>

              {/* 2. 12-Month Bar Chart (S O N D J F M A M J J A) */}
              <div className="space-y-3">
                <div className="w-full h-44 sm:h-48 pt-1">
                  {!mounted ? (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-600 font-mono">
                      Loading trend...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={twelveMonthsData}
                        margin={{ top: 16, right: 4, left: -25, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="monthShort"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#a1a1aa", fontSize: 10, fontFamily: "inherit" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#52525b", fontSize: 10 }}
                          allowDecimals={false}
                          domain={[0, (dataMax: number) => Math.max(4, Math.ceil(dataMax * 1.25))]}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload
                              const val =
                                activeMetric === "workouts"
                                  ? `${d.workouts} workouts`
                                  : activeMetric === "duration"
                                  ? `${d.durationMin} min`
                                  : `${d.volumeKg} kg`
                              return (
                                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs shadow-xl space-y-0.5">
                                  <p className="text-[10px] text-zinc-400 font-mono">{d.label}</p>
                                  <p className="text-white font-bold font-display">{val}</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar
                          dataKey={
                            activeMetric === "workouts"
                              ? "workouts"
                              : activeMetric === "duration"
                              ? "durationMin"
                              : "volumeKg"
                          }
                          radius={[4, 4, 0, 0]}
                          maxBarSize={24}
                        >
                          {twelveMonthsData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.isCurrent ? "#3b82f6" : "#27272a"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* 3 Metric Pills (Workouts | Duration | Volume) */}
                <div className="inline-flex items-center p-1 rounded-full bg-zinc-900 border border-zinc-800 gap-1 pt-0.5">
                  {(["workouts", "duration", "volume"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        soundManager.play("click", 0.15)
                        setActiveMetric(tab)
                      }}
                      className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer capitalize ${
                        activeMetric === tab
                          ? "bg-white text-zinc-950 font-bold shadow-xs"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Section: "Summary" (2x2 grid cards matching Reference 04) */}
              <div className="space-y-3 pt-2">
                <h2 className="text-sm font-semibold text-white font-display">
                  Summary
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {/* Card 1: Workouts */}
                  <div className="rounded-2xl border border-zinc-850 bg-zinc-950 p-4 space-y-1">
                    <span className="text-xs text-zinc-400 font-medium block">Workouts</span>
                    <div className="text-2xl font-bold text-white font-display tabular-nums">
                      {summary.workouts.curr}
                    </div>
                    <div className="text-xs text-zinc-500 font-medium">
                      prev month: {summary.workouts.prev}
                    </div>
                  </div>

                  {/* Card 2: Duration */}
                  <div className="rounded-2xl border border-zinc-850 bg-zinc-950 p-4 space-y-1">
                    <span className="text-xs text-zinc-400 font-medium block">Duration</span>
                    <div className="text-2xl font-bold text-white font-display tabular-nums">
                      {summary.duration.curr}min
                    </div>
                    <div className="text-xs text-zinc-500 font-medium">
                      prev month: {summary.duration.prev}min
                    </div>
                  </div>

                  {/* Card 3: Volume */}
                  <div className="rounded-2xl border border-zinc-850 bg-zinc-950 p-4 space-y-1">
                    <span className="text-xs text-zinc-400 font-medium block">Volume</span>
                    <div className="text-2xl font-bold text-white font-display tabular-nums">
                      {summary.volume.curr} kg
                    </div>
                    <div className="text-xs text-zinc-500 font-medium">
                      prev month: {summary.volume.prev} kg
                    </div>
                  </div>

                  {/* Card 4: Sets */}
                  <div className="rounded-2xl border border-zinc-850 bg-zinc-950 p-4 space-y-1">
                    <span className="text-xs text-zinc-400 font-medium block">Sets</span>
                    <div className="text-2xl font-bold text-white font-display tabular-nums">
                      {summary.sets.curr}
                    </div>
                    <div className="text-xs text-zinc-500 font-medium">
                      prev month: {summary.sets.prev}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Section: "Workout Days Log" (Flame + Streak + Calendar Grid) */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white font-display">
                    Workout Days Log
                  </h2>
                  <span className="text-xs text-zinc-400 font-medium">
                    {calendarLog.activeDaysCount} {calendarLog.activeDaysCount === 1 ? "day" : "days"} active
                  </span>
                </div>

                {/* Streak Hero (Amber flame + streak label) */}
                <div className="flex flex-col items-center justify-center py-2 space-y-1">
                  <Flame className="w-8 h-8 text-orange-500 fill-orange-500" />
                  <div className="text-sm font-bold text-white font-display">
                    {`${calendarLog.weekStreak} Week Streak`}
                  </div>
                </div>

                {/* Calendar Table */}
                <div className="space-y-2">
                  <div className="grid grid-cols-7 text-center">
                    {CALENDAR_HEADERS.map((h, i) => (
                      <span key={i} className="text-xs text-zinc-400 font-medium py-1">
                        {h}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-y-2 text-center">
                    {calendarLog.slots.map((slot, idx) => {
                      if (slot.type === "empty") {
                        return <div key={`empty-${idx}`} className="h-9" />
                      }

                      return (
                        <div
                          key={`day-${slot.dayNum}`}
                          className="h-9 flex flex-col items-center justify-center relative"
                        >
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-display tabular-nums transition-colors ${
                              slot.hasWorkout
                                ? "bg-white text-zinc-950 font-bold shadow-xs ring-1 ring-white/20"
                                : "text-zinc-400 font-normal hover:text-zinc-200"
                            }`}
                          >
                            {slot.dayNum}
                          </span>
                          {slot.hasWorkout && (
                            <span className="absolute bottom-0 w-1 h-1 rounded-full bg-blue-500" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* 5. Section: "Muscle Distribution" (Hexagon Radar with 2 Month Comparison) */}
              <div className="space-y-3 pt-2">
                <h2 className="text-sm font-semibold text-white font-display">
                  Muscle Distribution
                </h2>
                <MuscleDistributionRadar
                  workouts={workouts}
                  exercises={exercises}
                  customCurrentWorkouts={currentMonthWorkouts}
                  customPreviousWorkouts={previousMonthWorkouts}
                  currentLabel={`${periodInfo.currentMonthName} ${year}`}
                  previousLabel={`${periodInfo.previousMonthName} ${
                    monthIndex === 0 ? year - 1 : year
                  }`}
                  hidePeriodSelector={true}
                  hideStatCards={true}
                  title=""
                  subtitle=""
                  className="border-none bg-transparent p-0 shadow-none"
                />
              </div>
            </div>

            {/* ─── 6. Bottom Sticky Full-width Primary Share Button ─── */}
            <div className="sticky bottom-0 z-40 -mx-4 px-4 py-3 bg-black/95 backdrop-blur-md border-t border-zinc-900 mt-auto">
              <button
                type="button"
                onClick={handleShareOrDownload}
                disabled={isExporting}
                className="w-full h-11 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 active:scale-[0.98]"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                    <span>Generating Image...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-zinc-950" />
                    <span>Share Report</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
