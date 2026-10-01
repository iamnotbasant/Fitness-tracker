"use client"

import React, { useState, useMemo, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Workout, Exercise } from "@/lib/types"
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  Loader2,
  X,
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
  groupWorkoutsIntoSessions,
} from "./workout-helpers"
import {
  getMonthAndPrecedingPeriod,
  calculatePeriodStats,
} from "./muscle-distribution-helpers"
import { MuscleDistributionRadar } from "./muscle-distribution-radar"
import { WorkoutDaysLog } from "./workout-days-log"

interface MonthlyReportModalProps {
  isOpen: boolean
  onClose: () => void
  workouts: Workout[]
  exercises?: Exercise[]
  initialYear?: number
  initialMonthIndex?: number // 0-11
}

type MetricTab = "workouts" | "duration" | "volume"

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

  // Summary stats (2x2 grid mobile, 4-col desktop)
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
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-0 lg:p-6 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-lg lg:max-w-4xl xl:max-w-5xl min-h-screen lg:min-h-0 lg:max-h-[90vh] bg-black text-zinc-100 flex flex-col lg:rounded-3xl lg:border lg:border-zinc-800 lg:shadow-2xl overflow-hidden relative"
          >
            {/* ─── Top Bar: Back button, Monthly Report Title, Month Switcher, Desktop Close ─── */}
            <div className="sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3.5 bg-black/95 backdrop-blur-md border-b border-zinc-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.play("click", 0.2)
                    onClose()
                  }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-850 transition-all cursor-pointer"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-base font-semibold text-white font-display">
                  Monthly Report
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Month Stepper */}
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-7 h-7 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                    aria-label="Previous month"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-zinc-200 px-2 font-display tabular-nums whitespace-nowrap">
                    {periodInfo.currentMonthName.slice(0, 3)} {year}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-7 h-7 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                    aria-label="Next month"
                    title="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Desktop Close X Button */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.play("click", 0.2)
                    onClose()
                  }}
                  className="hidden lg:flex w-8 h-8 rounded-full items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ─── Scrollable Exportable Report Area ─── */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5">
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
                  <div className="w-full h-44 sm:h-52 lg:h-56 pt-1">
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

                {/* 3. Section: "Summary" (2x2 on mobile, 4-col on desktop) */}
                <div className="space-y-3 pt-2">
                  <h2 className="text-sm font-semibold text-white font-display">
                    Summary
                  </h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Card 1: Workouts */}
                    <div className="rounded-2xl border border-zinc-850 bg-zinc-950 p-4 space-y-1">
                      <span className="text-xs text-zinc-400 font-medium block">Workouts</span>
                      <div className="text-2xl font-bold text-white font-display tabular-nums">
                        {summary.workouts.curr}
                      </div>
                      <div className="text-xs text-zinc-500 font-mono">
                        prev month: {summary.workouts.prev}
                      </div>
                    </div>

                    {/* Card 2: Duration */}
                    <div className="rounded-2xl border border-zinc-850 bg-zinc-950 p-4 space-y-1">
                      <span className="text-xs text-zinc-400 font-medium block">Duration</span>
                      <div className="text-2xl font-bold text-white font-display tabular-nums">
                        {summary.duration.curr}min
                      </div>
                      <div className="text-xs text-zinc-500 font-mono">
                        prev month: {summary.duration.prev}min
                      </div>
                    </div>

                    {/* Card 3: Volume */}
                    <div className="rounded-2xl border border-zinc-850 bg-zinc-950 p-4 space-y-1">
                      <span className="text-xs text-zinc-400 font-medium block">Volume</span>
                      <div className="text-2xl font-bold text-white font-display tabular-nums">
                        {summary.volume.curr} kg
                      </div>
                      <div className="text-xs text-zinc-500 font-mono">
                        prev month: {summary.volume.prev} kg
                      </div>
                    </div>

                    {/* Card 4: Sets */}
                    <div className="rounded-2xl border border-zinc-850 bg-zinc-950 p-4 space-y-1">
                      <span className="text-xs text-zinc-400 font-medium block">Sets</span>
                      <div className="text-2xl font-bold text-white font-display tabular-nums">
                        {summary.sets.curr}
                      </div>
                      <div className="text-xs text-zinc-500 font-mono">
                        prev month: {summary.sets.prev}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Section: "Workout Days Log" (Shared component, side-by-side hero + calendar) */}
                <div className="pt-2">
                  <WorkoutDaysLog
                    workouts={workouts}
                    sessions={currentMonthSessions}
                    month={monthIndex}
                    year={year}
                    title="Workout Days Log"
                  />
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
            </div>

            {/* ─── 6. Bottom Sticky Share Button ─── */}
            <div className="sticky bottom-0 z-40 px-4 sm:px-6 lg:px-8 py-3.5 bg-black/95 backdrop-blur-md border-t border-zinc-850 shrink-0 mt-auto">
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
