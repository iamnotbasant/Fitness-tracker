"use client"

import React, { useState, useMemo, useRef, useEffect } from "react"
import type { Workout, Exercise } from "@/lib/types"
import {
  X,
  Share2,
  Download,
  Flame,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Loader2,
  Check,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
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
  formatMonochromeDelta,
} from "./muscle-distribution-helpers"
import { MuscleDistributionRadar } from "./muscle-distribution-radar"

interface MonthlyReportModalProps {
  isOpen: boolean
  onClose: () => void
  workouts: Workout[]
  exercises?: Exercise[]
  initialYear?: number
  initialMonthIndex?: number // 0-11
}

type MetricTab = "workouts" | "duration" | "reps"

const DAY_OF_WEEK_LABELS = ["S", "M", "T", "W", "T", "F", "S"]

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
    soundManager.play("click", 0.2)
    if (monthIndex === 0) {
      setMonthIndex(11)
      setYear((y) => y - 1)
    } else {
      setMonthIndex((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    soundManager.play("click", 0.2)
    if (monthIndex === 11) {
      setMonthIndex(0)
      setYear((y) => y + 1)
    } else {
      setMonthIndex((m) => m + 1)
    }
  }

  // Periods calculation
  const periodInfo = useMemo(() => {
    return getMonthAndPrecedingPeriod(year, monthIndex)
  }, [year, monthIndex])

  // Filter workouts for current and previous month
  const { currentMonthWorkouts, previousMonthWorkouts, currentMonthSessions } = useMemo(() => {
    const curr = workouts.filter((w) => {
      const d = (w.date || "").slice(0, 10)
      return d >= periodInfo.currentStart && d <= periodInfo.currentEnd
    })
    const prev = workouts.filter((w) => {
      const d = (w.date || "").slice(0, 10)
      return d >= periodInfo.previousStart && d <= periodInfo.previousEnd
    })
    const sessions = groupWorkoutsIntoSessions(curr)

    return {
      currentMonthWorkouts: curr,
      previousMonthWorkouts: prev,
      currentMonthSessions: sessions,
    }
  }, [workouts, periodInfo])

  // Summary stats with deltas vs previous month
  const { currentStats, deltaWorkouts, deltaDuration, deltaSets, deltaReps } = useMemo(() => {
    const curr = calculatePeriodStats(currentMonthWorkouts)
    const prev = calculatePeriodStats(previousMonthWorkouts)

    return {
      currentStats: curr,
      deltaWorkouts: formatMonochromeDelta(curr.workouts - prev.workouts),
      deltaDuration: formatMonochromeDelta(curr.durationMin - prev.durationMin, "m"),
      deltaSets: formatMonochromeDelta(curr.sets - prev.sets),
      deltaReps: formatMonochromeDelta(curr.reps - prev.reps),
    }
  }, [currentMonthWorkouts, previousMonthWorkouts])

  // Metric area chart data (daily breakdown across the month)
  const chartData = useMemo(() => {
    const daysCount = periodInfo.daysInCurrentMonth
    const data: { day: string; fullDate: string; value: number }[] = []

    const dailySessionsMap = new Map<string, typeof currentMonthSessions>()
    currentMonthSessions.forEach((s) => {
      if (!dailySessionsMap.has(s.date)) {
        dailySessionsMap.set(s.date, [])
      }
      dailySessionsMap.get(s.date)!.push(s)
    })

    for (let dayNum = 1; dayNum <= daysCount; dayNum++) {
      const dayStr = String(dayNum).padStart(2, "0")
      const monthStr = String(monthIndex + 1).padStart(2, "0")
      const dateKey = `${year}-${monthStr}-${dayStr}`
      const daySessions = dailySessionsMap.get(dateKey) || []

      let val = 0
      if (activeMetric === "workouts") {
        val = daySessions.length
      } else if (activeMetric === "duration") {
        val = daySessions.reduce((acc, s) => acc + s.durationMin, 0)
      } else if (activeMetric === "reps") {
        val = daySessions.reduce((acc, s) => acc + s.totalReps, 0)
      }

      data.push({
        day: String(dayNum),
        fullDate: dateKey,
        value: val,
      })
    }

    return data
  }, [periodInfo, currentMonthSessions, monthIndex, year, activeMetric])

  // Calendar Log data
  const calendarLog = useMemo(() => {
    const daysInMonth = periodInfo.daysInCurrentMonth
    const firstDay = periodInfo.firstDayOfWeek // 0 = Sun, ..., 6 = Sat
    const todayStr = toLocalDateStr(new Date())

    const trainedDates = new Set(
      currentMonthSessions.map((s) => s.date).filter(Boolean)
    )

    // Preceding empty slots
    const slots: {
      type: "empty" | "day"
      dayNum?: number
      dateStr?: string
      hasWorkout?: boolean
      isToday?: boolean
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
        isToday: dateStr === todayStr,
      })
    }

    // Current Streak using Sunday-skipping logic from commit f3bcae6
    const allWorkoutDates = workouts.map((w) => (w.date || "").slice(0, 10))
    const currentStreak = calculateCurrentStreak(allWorkoutDates)

    return {
      slots,
      activeDaysCount: trainedDates.size,
      totalDays: daysInMonth,
      currentStreak,
    }
  }, [periodInfo, currentMonthSessions, monthIndex, year, workouts])

  // Share / Download PNG Handler
  const handleShareOrDownload = async () => {
    if (!reportCardRef.current || isExporting) return
    soundManager.play("click", 0.25)
    setIsExporting(true)

    const loadingToast = toast.loading("Generating monochrome report image...")

    try {
      // Capture element as PNG with 2x retina clarity
      const dataUrl = await toPng(reportCardRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: "#09090b",
        cacheBust: true,
      })

      const fileName = `${periodInfo.currentMonthName.toLowerCase()}-${year}-fitness-report.png`

      // On mobile / supported browsers, attempt native Web Share API with File
      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
        try {
          const res = await fetch(dataUrl)
          const blob = await res.blob()
          const file = new File([blob], fileName, { type: "image/png" })

          if (navigator.canShare({ files: [file] })) {
            toast.dismiss(loadingToast)
            await navigator.share({
              title: `${periodInfo.currentMonthName} ${year} Workout Report`,
              text: `Check out my ${periodInfo.currentMonthName} calisthenics performance report!`,
              files: [file],
            })
            toast.success("Report shared successfully!")
            setIsExporting(false)
            return
          }
        } catch (shareErr: any) {
          if (shareErr.name === "AbortError") {
            // User cancelled share dialog
            toast.dismiss(loadingToast)
            setIsExporting(false)
            return
          }
          // If share failed, fall through to direct download
        }
      }

      // Desktop or fallback: direct download
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex justify-center overflow-y-auto">
      <div className="w-full max-w-2xl min-h-screen bg-zinc-950 text-zinc-100 flex flex-col px-4 pt-4 pb-32 sm:px-6">
        {/* ─── Top Floating Bar: Close & Share Action ─── */}
        <div className="sticky top-0 z-40 -mx-4 px-4 py-3 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              onClose()
            }}
            className="h-11 min-h-[44px] min-w-[44px] px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer text-xs font-medium"
            aria-label="Close report"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Close</span>
          </button>

          {/* Month Title & Prev/Next Switcher */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="px-2 text-center">
              <span className="text-sm sm:text-base font-bold text-white font-display whitespace-nowrap block">
                {periodInfo.currentMonthName} {year}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block">
                vs {periodInfo.previousMonthName}
              </span>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Download / Share Button (min 44px tap target) */}
          <button
            type="button"
            onClick={handleShareOrDownload}
            disabled={isExporting}
            className="h-11 min-h-[44px] px-3 sm:px-4 rounded-xl bg-white text-zinc-950 font-semibold hover:bg-zinc-200 transition-all flex items-center gap-2 text-xs shadow-md cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Exporting...</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 shrink-0 sm:hidden" />
                <Download className="h-4 w-4 shrink-0 hidden sm:inline" />
                <span>Share / Save</span>
              </>
            )}
          </button>
        </div>

        {/* ─── Exportable Report Area ─── */}
        <div
          ref={reportCardRef}
          className="bg-zinc-950 rounded-3xl border border-zinc-800/90 p-4 sm:p-6 space-y-6 shadow-2xl"
        >
          {/* ─── 1. Report Title Header ─── */}
          <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-mono uppercase tracking-wider">
                  Monthly Performance Report
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight mt-1.5">
                {periodInfo.currentMonthName} {year}
              </h1>
              <p className="text-xs text-zinc-400 font-body mt-0.5">
                Calisthenics workout volume, consistency & muscle distribution
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-xs text-zinc-500 font-mono">FITNESS TRACKER</span>
            </div>
          </div>

          {/* ─── 2. Metric Tabs & Area Chart ─── */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white font-display uppercase tracking-wider">
                  Monthly Trend
                </h2>
                <span className="text-xs text-zinc-400 font-body">
                  Daily distribution across {periodInfo.currentMonthName}
                </span>
              </div>

              {/* Metric Toggle Tabs (tap target >= 44px) */}
              <div className="grid grid-cols-3 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
                {(["workouts", "duration", "reps"] as MetricTab[]).map((tab) => {
                  const isActive = activeMetric === tab
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        soundManager.play("click", 0.15)
                        setActiveMetric(tab)
                      }}
                      className={`h-9 min-h-[36px] sm:h-8 px-3 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                        isActive
                          ? "bg-white text-zinc-950 font-bold shadow-xs"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {tab}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Metric Area Chart */}
            <div className="w-full h-48 sm:h-52 pt-2">
              {!mounted ? (
                <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
                  Loading trend...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reportMonochromeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      stroke="#3f3f46"
                      tick={{ fill: "#a1a1aa", fontSize: 10 }}
                      interval="preserveStartEnd"
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#3f3f46"
                      tick={{ fill: "#a1a1aa", fontSize: 10 }}
                      allowDecimals={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload
                          const suffix =
                            activeMetric === "duration"
                              ? " min"
                              : activeMetric === "workouts"
                              ? " workouts"
                              : " reps"
                          return (
                            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 shadow-2xl text-xs space-y-1">
                              <p className="text-zinc-400 font-mono text-[10px]">
                                {d.fullDate} (Day {d.day})
                              </p>
                              <p className="text-sm font-bold text-white tabular-nums font-display">
                                {d.value.toLocaleString()}
                                {suffix}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#ffffff"
                      strokeWidth={2}
                      fill="url(#reportMonochromeGrad)"
                      activeDot={{ r: 4, fill: "#ffffff", stroke: "#09090b", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ─── 3. Summary Cards with Monochrome Deltas ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Card 1: Workouts */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-1">
              <span className="text-xs text-zinc-400 font-medium font-body block truncate">
                Workouts
              </span>
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-2xl font-bold text-white font-display tabular-nums">
                  {currentStats.workouts}
                </span>
                <span
                  className={`text-xs tabular-nums ${
                    deltaWorkouts.isPositive ? "text-white font-medium" : "text-zinc-500 font-medium"
                  }`}
                >
                  {deltaWorkouts.text}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-body">vs {periodInfo.previousMonthName}</span>
            </div>

            {/* Card 2: Duration */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-1">
              <span className="text-xs text-zinc-400 font-medium font-body block truncate">
                Duration
              </span>
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-2xl font-bold text-white font-display tabular-nums">
                  {currentStats.durationMin}m
                </span>
                <span
                  className={`text-xs tabular-nums ${
                    deltaDuration.isPositive ? "text-white font-medium" : "text-zinc-500 font-medium"
                  }`}
                >
                  {deltaDuration.text}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-body">vs {periodInfo.previousMonthName}</span>
            </div>

            {/* Card 3: Sets */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-1">
              <span className="text-xs text-zinc-400 font-medium font-body block truncate">
                Sets
              </span>
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-2xl font-bold text-white font-display tabular-nums">
                  {currentStats.sets}
                </span>
                <span
                  className={`text-xs tabular-nums ${
                    deltaSets.isPositive ? "text-white font-medium" : "text-zinc-500 font-medium"
                  }`}
                >
                  {deltaSets.text}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-body">vs {periodInfo.previousMonthName}</span>
            </div>

            {/* Card 4: Total Reps */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-1">
              <span className="text-xs text-zinc-400 font-medium font-body block truncate">
                Total Reps
              </span>
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-2xl font-bold text-white font-display tabular-nums">
                  {currentStats.reps.toLocaleString()}
                </span>
                <span
                  className={`text-xs tabular-nums ${
                    deltaReps.isPositive ? "text-white font-medium" : "text-zinc-500 font-medium"
                  }`}
                >
                  {deltaReps.text}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-body">vs {periodInfo.previousMonthName}</span>
            </div>
          </div>

          {/* ─── 4. Workout Days Log (Streak Flame + Monthly Calendar Grid) ─── */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-white">
                  <Flame className="h-4 w-4 fill-white text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white font-display">
                    Workout Days Log
                  </h3>
                  <span className="text-xs text-zinc-400 font-body">
                    {calendarLog.activeDaysCount} of {calendarLog.totalDays} days trained
                  </span>
                </div>
              </div>

              {/* Sunday-Preserving Streak Callout */}
              <div className="px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center gap-2">
                <Flame className="h-3.5 w-3.5 text-white" />
                <span className="text-xs font-semibold text-white font-display tabular-nums">
                  {calendarLog.currentStreak} day streak
                </span>
              </div>
            </div>

            {/* Calendar Grid: S M T W T F S */}
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAY_OF_WEEK_LABELS.map((label, idx) => (
                  <span key={idx} className="text-[11px] font-medium text-zinc-500">
                    {label}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {calendarLog.slots.map((slot, index) => {
                  if (slot.type === "empty") {
                    return <div key={`empty-${index}`} className="h-9 sm:h-10" />
                  }

                  return (
                    <div
                      key={`day-${slot.dayNum}`}
                      className={`h-9 sm:h-10 rounded-xl flex flex-col items-center justify-center font-display tabular-nums text-xs transition-all relative ${
                        slot.hasWorkout
                          ? "bg-white text-zinc-950 font-bold shadow-xs"
                          : "bg-zinc-950/60 text-zinc-500 border border-zinc-850/60"
                      } ${slot.isToday ? "ring-2 ring-white/40" : ""}`}
                    >
                      <span>{slot.dayNum}</span>
                      {slot.hasWorkout && (
                        <span className="w-1 h-1 rounded-full bg-zinc-950 absolute bottom-1" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ─── 5. Muscle Distribution Radar (This Month vs Last Month) ─── */}
          <MuscleDistributionRadar
            workouts={workouts}
            exercises={exercises}
            customCurrentWorkouts={currentMonthWorkouts}
            customPreviousWorkouts={previousMonthWorkouts}
            currentLabel={`${periodInfo.currentMonthName} (This Month)`}
            previousLabel={`${periodInfo.previousMonthName} (Last Month)`}
            hidePeriodSelector={true}
            hideStatCards={true}
            title="Muscle Distribution"
            subtitle={`${periodInfo.currentMonthName} vs ${periodInfo.previousMonthName}`}
            className="border-zinc-800 bg-zinc-900"
          />

          {/* Footer in export */}
          <div className="pt-2 text-center border-t border-zinc-800/60">
            <p className="text-[11px] text-zinc-500 font-mono">
              FITNESS TRACKER · MONOCHROME PERFORMANCE ANALYTICS
            </p>
          </div>
        </div>

        {/* ─── Bottom Share / Download Button Bar ─── */}
        <div className="mt-5 flex items-center justify-center">
          <button
            type="button"
            onClick={handleShareOrDownload}
            disabled={isExporting}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-2xl bg-white text-zinc-950 font-bold text-sm hover:bg-zinc-200 transition-all flex items-center justify-center gap-2.5 shadow-xl cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Generating Image...</span>
              </>
            ) : (
              <>
                <Share2 className="h-5 w-5" />
                <span>Download / Share Monthly Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
