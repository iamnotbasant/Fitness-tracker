"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Space_Grotesk, Inter } from "next/font/google"
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  X,
  Flame,
} from "lucide-react"
import { useWorkouts, useExercises } from "@/hooks/use-local-data"
import soundManager from "@/lib/sounds"
import {
  groupWorkoutsIntoSessions,
  toLocalDateStr,
  getMondayOfWeek,
  calculateCurrentStreak,
  formatDateDisplay,
} from "@/components/progress/workout-helpers"
import { TotalStatsCard } from "@/components/progress/total-stats-card"
import { WorkoutHeatmap } from "@/components/charts/workout-heatmap"
import { TrainingFrequencyCard } from "@/components/progress/training-frequency-card"
import { MuscleDistributionRadar } from "@/components/progress/muscle-distribution-radar"
import { MonthlyReportModal } from "@/components/progress/monthly-report-modal"
import { PersonalRecords } from "@/components/charts/personal-records"
import { PageTransition } from "@/components/ui/page-transition"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

type PeriodFilter = "today" | "week" | "month" | "year" | "all"

const PERIOD_FILTERS: { id: PeriodFilter; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All" },
]

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false)
  const [period, setPeriod] = useState<PeriodFilter>("today")
  const [navOffset, setNavOffset] = useState<number>(0)
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")
  const [showCustomRangeModal, setShowCustomRangeModal] = useState<boolean>(false)
  const [tempStart, setTempStart] = useState<string>("")
  const [tempEnd, setTempEnd] = useState<string>("")
  const [monthlyReportOpen, setMonthlyReportOpen] = useState(false)

  const { workouts, isLoading: workoutsLoading } = useWorkouts()
  const { exercises } = useExercises()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handlePeriodChange = (newPeriod: PeriodFilter) => {
    soundManager.play("click", 0.15)
    setPeriod(newPeriod)
    setNavOffset(0)
  }

  // Calculate navigated date range and comparison range
  const {
    startDateStr,
    endDateStr,
    prevStartDateStr,
    prevEndDateStr,
    navigatorLabel,
    currentPeriodLabel,
    previousPeriodLabel,
  } = useMemo(() => {
    const now = new Date()

    if (period === "today") {
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + navOffset)
      const targetStr = toLocalDateStr(target)

      const prev = new Date(target)
      prev.setDate(prev.getDate() - 1)
      const prevStr = toLocalDateStr(prev)

      const isToday = navOffset === 0
      const isYesterday = navOffset === -1
      const formatted = target.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      const navLabel = isToday
        ? `Today, ${target.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : isYesterday
        ? `Yesterday, ${target.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : formatted

      return {
        startDateStr: targetStr,
        endDateStr: targetStr,
        prevStartDateStr: prevStr,
        prevEndDateStr: prevStr,
        navigatorLabel: navLabel,
        currentPeriodLabel: isToday ? "Today" : formatted,
        previousPeriodLabel: isToday
          ? "Yesterday"
          : prev.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }
    }

    if (period === "week") {
      const monday = getMondayOfWeek(now)
      monday.setDate(monday.getDate() + navOffset * 7)
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)

      const startStr = toLocalDateStr(monday)
      const endStr = toLocalDateStr(sunday)

      const prevMonday = new Date(monday)
      prevMonday.setDate(prevMonday.getDate() - 7)
      const prevSunday = new Date(monday)
      prevSunday.setDate(prevSunday.getDate() - 1)
      const prevStartStr = toLocalDateStr(prevMonday)
      const prevEndStr = toLocalDateStr(prevSunday)

      const startMonth = monday.toLocaleDateString("en-US", { month: "short" })
      const endMonth = sunday.toLocaleDateString("en-US", { month: "short" })
      const year = sunday.getFullYear()
      const navLabel =
        startMonth === endMonth
          ? `${startMonth} ${monday.getDate()} - ${sunday.getDate()}, ${year}`
          : `${startMonth} ${monday.getDate()} - ${endMonth} ${sunday.getDate()}, ${year}`

      return {
        startDateStr: startStr,
        endDateStr: endStr,
        prevStartDateStr: prevStartStr,
        prevEndDateStr: prevEndStr,
        navigatorLabel: navLabel,
        currentPeriodLabel: navOffset === 0 ? "This Week" : navLabel,
        previousPeriodLabel: navOffset === 0 ? "Last Week" : "Prev Week",
      }
    }

    if (period === "month") {
      const focal = new Date(now.getFullYear(), now.getMonth() + navOffset, 1)
      const lastDay = new Date(focal.getFullYear(), focal.getMonth() + 1, 0)
      const startStr = toLocalDateStr(focal)
      const endStr = toLocalDateStr(lastDay)

      const prevMonthFocal = new Date(focal.getFullYear(), focal.getMonth() - 1, 1)
      const prevMonthLastDay = new Date(focal.getFullYear(), focal.getMonth(), 0)
      const prevStartStr = toLocalDateStr(prevMonthFocal)
      const prevEndStr = toLocalDateStr(prevMonthLastDay)

      const navLabel = focal.toLocaleDateString("en-US", { month: "long", year: "numeric" })

      return {
        startDateStr: startStr,
        endDateStr: endStr,
        prevStartDateStr: prevStartStr,
        prevEndDateStr: prevEndStr,
        navigatorLabel: navLabel,
        currentPeriodLabel: navOffset === 0 ? "This Month" : navLabel,
        previousPeriodLabel:
          navOffset === 0
            ? "Last Month"
            : prevMonthFocal.toLocaleDateString("en-US", { month: "short" }),
      }
    }

    if (period === "year") {
      const targetYear = now.getFullYear() + navOffset
      const startStr = `${targetYear}-01-01`
      const endStr = `${targetYear}-12-31`
      const prevStartStr = `${targetYear - 1}-01-01`
      const prevEndStr = `${targetYear - 1}-12-31`

      const navLabel = `${targetYear}`

      return {
        startDateStr: startStr,
        endDateStr: endStr,
        prevStartDateStr: prevStartStr,
        prevEndDateStr: prevEndStr,
        navigatorLabel: navLabel,
        currentPeriodLabel: navOffset === 0 ? "This Year" : `${targetYear}`,
        previousPeriodLabel: navOffset === 0 ? "Last Year" : `${targetYear - 1}`,
      }
    }

    // period === "all"
    if (customStartDate && customEndDate) {
      const sDisplay = formatDateDisplay(customStartDate)
      const eDisplay = formatDateDisplay(customEndDate)
      const rangeLabel = `${sDisplay} - ${eDisplay}`
      return {
        startDateStr: customStartDate,
        endDateStr: customEndDate,
        prevStartDateStr: "",
        prevEndDateStr: "",
        navigatorLabel: rangeLabel,
        currentPeriodLabel: rangeLabel,
        previousPeriodLabel: "",
      }
    }

    return {
      startDateStr: "1970-01-01",
      endDateStr: "2099-12-31",
      prevStartDateStr: "",
      prevEndDateStr: "",
      navigatorLabel: "All Time",
      currentPeriodLabel: "All Time",
      previousPeriodLabel: "",
    }
  }, [period, navOffset, customStartDate, customEndDate])

  // Filter workouts according to navigated date range
  const { filteredWorkouts, previousPeriodWorkouts } = useMemo(() => {
    if (period === "all" && !customStartDate && !customEndDate) {
      return {
        filteredWorkouts: workouts,
        previousPeriodWorkouts: [],
      }
    }

    const curr = workouts.filter((w) => {
      const d = (w.date || "").slice(0, 10)
      return d >= startDateStr && d <= endDateStr
    })

    const prev =
      prevStartDateStr && prevEndDateStr
        ? workouts.filter((w) => {
            const d = (w.date || "").slice(0, 10)
            return d >= prevStartDateStr && d <= prevEndDateStr
          })
        : []

    return {
      filteredWorkouts: curr,
      previousPeriodWorkouts: prev,
    }
  }, [
    workouts,
    period,
    startDateStr,
    endDateStr,
    prevStartDateStr,
    prevEndDateStr,
    customStartDate,
    customEndDate,
  ])

  // Grouped sessions
  const allSessions = useMemo(() => groupWorkoutsIntoSessions(workouts), [workouts])
  const filteredSessions = useMemo(
    () => groupWorkoutsIntoSessions(filteredWorkouts),
    [filteredWorkouts]
  )

  // Sunday-safe streak calculation for Streak Hero (f3bcae6)
  const { currentStreakDays, weekStreak } = useMemo(() => {
    const dates = workouts.map((w) => (w.date || "").slice(0, 10)).filter(Boolean)
    const streakDays = calculateCurrentStreak(dates)
    return {
      currentStreakDays: streakDays,
      weekStreak: Math.floor(streakDays / 6),
    }
  }, [workouts])

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString("en-US", { month: "long" })
  }, [])
  const currentYear = useMemo(() => new Date().getFullYear(), [])

  if (!mounted || workoutsLoading) {
    return (
      <main
        className={`${spaceGrotesk.variable} ${inter.variable} font-body min-h-screen bg-black flex items-center justify-center p-4`}
      >
        <div className="w-full max-w-xs rounded-2xl bg-zinc-950 p-6 border border-zinc-900 text-center space-y-3 shadow-xl">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto" />
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
            Loading analytics...
          </p>
        </div>
      </main>
    )
  }

  return (
    <PageTransition>
      <main
        className={`${spaceGrotesk.variable} ${inter.variable} font-body min-h-screen bg-black text-zinc-100 pb-32 max-w-lg md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 pt-4 space-y-6 sm:space-y-7`}
      >
        {/* ─── 1. HEADER: "Report" + Period Tabs + Date Navigator Pill ─── */}
        <header className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
              Report
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            {/* Period Segmented Control */}
            <div className="flex items-center p-1 rounded-full bg-zinc-900 border border-zinc-800 w-full sm:w-auto">
              {PERIOD_FILTERS.map((f) => {
                const isActive = period === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handlePeriodChange(f.id)}
                    className={`flex-1 sm:flex-initial sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer min-h-[36px] flex items-center justify-center active:scale-95 whitespace-nowrap ${
                      isActive
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>

            {/* Date Navigator Pill + Reset Affordance */}
            <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
              {period === "all" ? (
                /* All Time: Custom Range Affordance */
                <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-zinc-900 border border-zinc-800 shadow-sm min-h-[36px]">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.play("click", 0.15)
                      setTempStart(customStartDate)
                      setTempEnd(customEndDate)
                      setShowCustomRangeModal(true)
                    }}
                    className="h-7 px-3 rounded-full text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="truncate max-w-[190px]">
                      {customStartDate && customEndDate ? navigatorLabel : "Custom range"}
                    </span>
                  </button>
                  {customStartDate && customEndDate && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.play("click", 0.15)
                        setCustomStartDate("")
                        setCustomEndDate("")
                      }}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 mr-1 cursor-pointer transition-colors"
                      title="Clear custom range"
                      aria-label="Clear custom range"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                /* Today / Week / Month / Year: < Label > Pill */
                <div className="inline-flex items-center gap-1 p-1 rounded-full bg-zinc-900 border border-zinc-800 shadow-sm min-h-[36px]">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.play("click", 0.15)
                      setNavOffset((o) => o - 1)
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95"
                    aria-label="Previous period"
                    title="Previous"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs sm:text-sm font-semibold text-white font-display px-2 whitespace-nowrap min-w-[130px] text-center">
                    {navigatorLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.play("click", 0.15)
                      setNavOffset((o) => o + 1)
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95"
                    aria-label="Next period"
                    title="Next"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Reset to Today affordance when navigated away */}
              {(navOffset !== 0 || (period === "all" && customStartDate)) && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.play("click", 0.15)
                    setNavOffset(0)
                    setCustomStartDate("")
                    setCustomEndDate("")
                  }}
                  className="h-8 px-3 rounded-full text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-sm"
                  title="Reset to current period"
                >
                  <RotateCcw className="w-3 h-3 text-zinc-400" />
                  <span>Today</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ─── 2. TOTAL & STREAK HERO (Side-by-side on desktop) ─── */}
        <div className="grid gap-6 sm:gap-7 lg:grid-cols-2 lg:gap-8 items-stretch">
          {/* Total Section */}
          <section className="space-y-2 min-w-0 flex flex-col">
            <div className="flex items-center justify-between min-h-[32px]">
              <h2 className="text-base sm:text-lg font-bold text-white font-display">
                Total
              </h2>
            </div>
            <TotalStatsCard
              sessions={filteredSessions}
              allSessions={allSessions}
              className="flex-1 h-full"
            />
          </section>

          {/* Streak Section (Monthly-Report-Style Streak Hero) */}
          <section className="space-y-2 min-w-0 flex flex-col">
            <div className="flex items-center justify-between min-h-[32px]">
              <h2 className="text-base sm:text-lg font-bold text-white font-display">
                Streak
              </h2>
            </div>
            <div className="rounded-3xl border border-zinc-800/90 bg-[#121316] p-6 shadow-xl flex-1 flex flex-col items-center justify-center text-center min-h-[220px]">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Flame className="w-12 h-12 text-orange-500 fill-orange-500" />
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
                  {`${weekStreak} Week Streak`}
                </div>
                <p className="text-xs text-zinc-400 font-body">
                  {currentStreakDays} {currentStreakDays === 1 ? "day" : "days"} logged · Sundays excluded
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ─── 3. TRAINING FREQUENCY / MASCOT (Coral Anatomical Figures) ─── */}
        <section className="space-y-2 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-white font-display">
            Training Frequency
          </h2>
          <TrainingFrequencyCard
            workouts={filteredWorkouts}
            exercises={exercises}
            periodLabel={currentPeriodLabel}
          />
        </section>

        {/* ─── 4. GITHUB-STYLE WORKOUT HEATMAP (Contribution Graph) ─── */}
        <section className="space-y-2 min-w-0">
          <WorkoutHeatmap
            workouts={workouts}
            period={period}
            startDate={startDateStr}
            endDate={endDateStr}
          />
        </section>

        {/* ─── 5. MUSCLE DISTRIBUTION (Expanded Inline Radar + Delta Stats) ─── */}
        <section className="space-y-2 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-white font-display">
            Muscle Distribution
          </h2>
          <MuscleDistributionRadar
            workouts={workouts}
            exercises={exercises}
            customCurrentWorkouts={filteredWorkouts}
            customPreviousWorkouts={previousPeriodWorkouts}
            currentLabel={currentPeriodLabel}
            previousLabel={previousPeriodLabel}
            hidePeriodSelector={true}
            title=""
            subtitle=""
          />
        </section>

        {/* ─── 6. MORE ANALYTICS (Monthly Report Entry Card) ─── */}
        <section className="space-y-2 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-white font-display">
            More Analytics
          </h2>
          <div className="w-full">
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                soundManager.play("click", 0.2)
                setMonthlyReportOpen(true)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  soundManager.play("click", 0.2)
                  setMonthlyReportOpen(true)
                }
              }}
              className="group rounded-3xl border border-zinc-800/90 bg-[#121316] p-5 sm:p-6 flex items-center justify-between gap-4 hover:bg-zinc-900/90 hover:border-zinc-700 transition-all duration-200 cursor-pointer shadow-xl active:scale-[0.99] min-h-[72px]"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 flex items-center justify-center shrink-0 group-hover:bg-zinc-800 group-hover:border-zinc-600 group-hover:text-white transition-colors">
                  <CalendarIcon className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white font-display tracking-tight truncate">
                    Monthly Report
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 font-body truncate mt-0.5">
                    {`${currentMonthName} ${currentYear} · 12-mo trend, calendar log & share`}
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all shrink-0">
                <ChevronRight className="w-5 h-5 stroke-[2]" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 7. PERSONAL PR RECORDS (Follows Period Filter) ─── */}
        <section className="space-y-2 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-white font-display">
            Personal Records
          </h2>
          <PersonalRecords workouts={filteredWorkouts} />
        </section>

        {/* ─── MODALS ─── */}
        {/* Monthly Report Modal */}
        <MonthlyReportModal
          isOpen={monthlyReportOpen}
          onClose={() => setMonthlyReportOpen(false)}
          workouts={workouts}
          exercises={exercises}
        />

        {/* Custom Date Range Modal for Period === 'all' */}
        {showCustomRangeModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white font-display">
                  Custom Date Range
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCustomRangeModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-body">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-zinc-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-body">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-zinc-500 font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.play("click", 0.2)
                    if (tempStart && tempEnd) {
                      setCustomStartDate(tempStart)
                      setCustomEndDate(tempEnd)
                    }
                    setShowCustomRangeModal(false)
                  }}
                  className="flex-1 h-10 rounded-full bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.play("click", 0.15)
                    setTempStart("")
                    setTempEnd("")
                    setCustomStartDate("")
                    setCustomEndDate("")
                    setShowCustomRangeModal(false)
                  }}
                  className="flex-1 h-10 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </PageTransition>
  )
}