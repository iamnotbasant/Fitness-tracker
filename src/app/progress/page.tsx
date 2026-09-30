"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Space_Grotesk, Inter } from "next/font/google"
import { ChevronDown, Check, Calendar as CalendarIcon } from "lucide-react"
import { useWorkouts, useExercises } from "@/hooks/use-local-data"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import soundManager from "@/lib/sounds"
import {
  type PresetRange,
  type DateFilterValue,
  getPresetDates,
  toLocalDateString,
} from "@/components/ui/date-range-filter"
import {
  groupWorkoutsIntoSessions,
  calculateCurrentStreak,
} from "@/components/progress/workout-helpers"
import { TotalStatsCard } from "@/components/progress/total-stats-card"
import { WeeklyWorkoutChart } from "@/components/progress/weekly-workout-chart"
import { ThisWeekCard } from "@/components/progress/this-week-card"
import { TrainingFrequencyCard } from "@/components/progress/training-frequency-card"
import { HistoryCard } from "@/components/progress/history-card"
import { MuscleDistributionRadar } from "@/components/progress/muscle-distribution-radar"
import { MonthlyReportModal } from "@/components/progress/monthly-report-modal"
import { WeeklyOverview } from "@/components/progress/weekly-overview"

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

const RANGE_PRESETS: { id: PresetRange; label: string }[] = [
  { id: "this_week", label: "This Week" },
  { id: "last_week", label: "Last Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "this_year", label: "This Year" },
  { id: "all_time", label: "All Time" },
]

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [monthlyReportOpen, setMonthlyReportOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"report" | "weekly">("report")
  const { workouts, isLoading: workoutsLoading } = useWorkouts()
  const { exercises } = useExercises()

  // Header date range filter defaulting to "this_week" like reference REPORT dashboard
  const [filterValue, setFilterValue] = useState<DateFilterValue>({
    preset: "this_week",
  })

  useEffect(() => {
    setMounted(true)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("view") === "weekly") {
        setActiveTab("weekly")
      }
    }
  }, [])

  // Filter workouts according to header range selection
  const filteredWorkouts = useMemo(() => {
    let start = filterValue.startDate
    let end = filterValue.endDate

    if (filterValue.preset !== "custom" && filterValue.preset !== "all_time") {
      const dates = getPresetDates(filterValue.preset)
      start = dates.start
      end = dates.end
    }

    if (!start && !end) {
      return workouts
    }

    return workouts.filter((w) => {
      const wDate = (w.date || "").slice(0, 10)
      if (!wDate) return false
      if (start && wDate < start) return false
      if (end && wDate > end) return false
      return true
    })
  }, [workouts, filterValue])

  // Grouped sessions
  const allSessions = useMemo(() => groupWorkoutsIntoSessions(workouts), [workouts])
  const filteredSessions = useMemo(
    () => groupWorkoutsIntoSessions(filteredWorkouts),
    [filteredWorkouts]
  )

  const activeLabel =
    filterValue.preset === "custom"
      ? "Custom"
      : RANGE_PRESETS.find((p) => p.id === filterValue.preset)?.label || "This Week"

  if (!mounted || workoutsLoading) {
    return (
      <main
        className={`${spaceGrotesk.variable} ${inter.variable} font-body min-h-screen bg-zinc-950 flex items-center justify-center p-4`}
      >
        <div className="w-full max-w-xs rounded-2xl bg-zinc-900 p-6 border border-zinc-800 text-center space-y-3 shadow-xl">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto" />
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
            Loading analytics...
          </p>
        </div>
      </main>
    )
  }

  if (activeTab === "weekly") {
    return (
      <main
        className={`${spaceGrotesk.variable} ${inter.variable} font-body min-h-screen bg-zinc-950 text-zinc-100 pb-32 max-w-2xl mx-auto px-4 pt-6 space-y-6 sm:space-y-7`}
      >
        <WeeklyOverview
          workouts={workouts}
          exercises={exercises}
          onBack={() => {
            setActiveTab("report")
            if (typeof window !== "undefined" && window.location.search.includes("view=weekly")) {
              window.history.replaceState({}, "", "/progress")
            }
          }}
        />
      </main>
    )
  }

  return (
    <main
      className={`${spaceGrotesk.variable} ${inter.variable} font-body min-h-screen bg-zinc-950 text-zinc-100 pb-32 max-w-2xl mx-auto px-4 pt-6 space-y-6 sm:space-y-7`}
    >
      {/* ─── 1. HEADER: "Progress" Title + Monthly Report Button + Range Dropdown ─── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div className="space-y-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
              Progress
            </h1>
            <p className="text-xs text-zinc-400 font-body mt-0.5">
              Calisthenics performance & training analytics
            </p>
          </div>

          {/* Clean Segmented Tab Control: Report vs Weekly Overview */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 w-fit">
            <button
              type="button"
              onClick={() => {
                soundManager.play("click", 0.2)
                setActiveTab("report")
              }}
              className="h-8 min-h-[40px] px-3 rounded-lg text-xs font-semibold bg-zinc-800 text-white shadow-xs cursor-pointer transition-all"
            >
              Report
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.play("click", 0.2)
                setActiveTab("weekly")
              }}
              className="h-8 min-h-[40px] px-3 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              Weekly Overview
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Monthly Report Quick Action Button (min 44px tap target) */}
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              setMonthlyReportOpen(true)
            }}
            className="h-11 min-h-[44px] px-3 sm:px-3.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-700 text-xs font-semibold text-white flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-zinc-300 shrink-0" />
            <span>Monthly Report</span>
          </button>

          {/* Range Dropdown (min 44px tap target) */}
          <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-11 min-h-[44px] px-3.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-700 text-xs font-medium text-white flex items-center justify-between gap-2.5 transition-all shadow-xs cursor-pointer min-w-[125px]"
              >
                <span>{activeLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={6}
              className="w-44 p-1 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl text-xs z-50"
            >
              <div className="space-y-0.5">
                {RANGE_PRESETS.map((opt) => {
                  const isSelected = filterValue.preset === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        soundManager.play("click", 0.2)
                        const dates = getPresetDates(opt.id)
                        setFilterValue({
                          preset: opt.id,
                          startDate: dates.start || undefined,
                          endDate: dates.end || undefined,
                        })
                        setDropdownOpen(false)
                      }}
                      className={`w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer text-xs ${
                        isSelected
                          ? "bg-zinc-800 text-white font-semibold border border-zinc-700 shadow-xs"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-850"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[2.5]" />}
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* ─── 2. MONTHLY REPORT BANNER CARD ─── */}
      <section>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-mono uppercase tracking-wider font-semibold">
                Monthly Report
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white font-display">
              Monthly Performance Summary
            </h2>
            <p className="text-xs text-zinc-400 font-body">
              Trends, calendar consistency, muscle distribution & shareable PNG
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              setMonthlyReportOpen(true)
            }}
            className="h-11 min-h-[44px] px-4 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
          >
            <span>Open Report</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      {/* ─── 3. TOTAL ROW: 3 Stat Columns (Workouts | Time (min) | Total Reps) ─── */}
      <section>
        <TotalStatsCard sessions={filteredSessions} />
      </section>

      {/* ─── 4. MUSCLE DISTRIBUTION RADAR + 4 DELTA STAT CARDS (PART A) ─── */}
      <section>
        <MuscleDistributionRadar workouts={workouts} exercises={exercises} />
      </section>

      {/* ─── 5. WORKOUT TIMES PER WEEK: Bar Chart (Monday-start weeks) ─── */}
      <section>
        <WeeklyWorkoutChart sessions={allSessions} />
      </section>

      {/* ─── 6. THIS WEEK: 7 Day Circles (S M T W T F S) + Today (min) & Weekly avg (min) ─── */}
      <section>
        <ThisWeekCard
          sessions={allSessions}
          onOpenWeeklyOverview={() => setActiveTab("weekly")}
        />
      </section>

      {/* ─── 7. TRAINING FREQUENCY: Front + Back Figures SIDE BY SIDE (White Monochrome) ─── */}
      <section>
        <TrainingFrequencyCard workouts={workouts} exercises={exercises} />
      </section>

      {/* ─── 8. HISTORY: "View all" Link + Recent Workout Cards + Detail Bottom Sheet ─── */}
      <section>
        <HistoryCard sessions={allSessions} />
      </section>

      {/* ─── 9. MONTHLY REPORT MODAL (PART B) ─── */}
      <MonthlyReportModal
        isOpen={monthlyReportOpen}
        onClose={() => setMonthlyReportOpen(false)}
        workouts={workouts}
        exercises={exercises}
      />
    </main>
  )
}