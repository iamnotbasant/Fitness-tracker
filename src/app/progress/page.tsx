"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Space_Grotesk, Inter } from "next/font/google"
import { Calendar as CalendarIcon, ChevronRight, Activity } from "lucide-react"
import { useWorkouts, useExercises } from "@/hooks/use-local-data"
import soundManager from "@/lib/sounds"
import {
  groupWorkoutsIntoSessions,
  toLocalDateStr,
  getMondayOfWeek,
} from "@/components/progress/workout-helpers"
import { TotalStatsCard } from "@/components/progress/total-stats-card"
import { ThisWeekCard } from "@/components/progress/this-week-card"
import { TrainingFrequencyCard } from "@/components/progress/training-frequency-card"
import { MonthlyReportModal } from "@/components/progress/monthly-report-modal"
import { MuscleDistributionModal } from "@/components/progress/muscle-distribution-modal"
import { WeeklyOverview } from "@/components/progress/weekly-overview"
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
  const [activeTab, setActiveTab] = useState<"report" | "weekly">("report")
  const [period, setPeriod] = useState<PeriodFilter>("week")
  const [monthlyReportOpen, setMonthlyReportOpen] = useState(false)
  const [radarModalOpen, setRadarModalOpen] = useState(false)

  const { workouts, isLoading: workoutsLoading } = useWorkouts()
  const { exercises } = useExercises()

  useEffect(() => {
    setMounted(true)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("view") === "weekly") {
        setActiveTab("weekly")
      }
    }
  }, [])

  // Filter workouts and previous comparison period according to header selection
  const { filteredWorkouts, previousPeriodWorkouts, currentPeriodLabel, previousPeriodLabel } =
    useMemo(() => {
      const now = new Date()
      const todayStr = toLocalDateStr(now)

      if (period === "today") {
        const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        const yesterdayStr = toLocalDateStr(yesterday)
        const curr = workouts.filter((w) => (w.date || "").slice(0, 10) === todayStr)
        const prev = workouts.filter((w) => (w.date || "").slice(0, 10) === yesterdayStr)
        return {
          filteredWorkouts: curr,
          previousPeriodWorkouts: prev,
          currentPeriodLabel: "Today",
          previousPeriodLabel: "Yesterday",
        }
      }

      if (period === "week") {
        const monday = getMondayOfWeek(now)
        const startStr = toLocalDateStr(monday)
        const lastMonday = new Date(monday)
        lastMonday.setDate(lastMonday.getDate() - 7)
        const lastSunday = new Date(monday)
        lastSunday.setDate(lastSunday.getDate() - 1)
        const prevStartStr = toLocalDateStr(lastMonday)
        const prevEndStr = toLocalDateStr(lastSunday)

        const curr = workouts.filter((w) => {
          const d = (w.date || "").slice(0, 10)
          return d >= startStr && d <= todayStr
        })
        const prev = workouts.filter((w) => {
          const d = (w.date || "").slice(0, 10)
          return d >= prevStartStr && d <= prevEndStr
        })
        return {
          filteredWorkouts: curr,
          previousPeriodWorkouts: prev,
          currentPeriodLabel: "This Week",
          previousPeriodLabel: "Last Week",
        }
      }

      if (period === "month") {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        const startStr = toLocalDateStr(firstDay)
        const prevMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const prevMonthLast = new Date(now.getFullYear(), now.getMonth(), 0)
        const prevStartStr = toLocalDateStr(prevMonthFirst)
        const prevEndStr = toLocalDateStr(prevMonthLast)

        const curr = workouts.filter((w) => {
          const d = (w.date || "").slice(0, 10)
          return d >= startStr && d <= todayStr
        })
        const prev = workouts.filter((w) => {
          const d = (w.date || "").slice(0, 10)
          return d >= prevStartStr && d <= prevEndStr
        })
        return {
          filteredWorkouts: curr,
          previousPeriodWorkouts: prev,
          currentPeriodLabel: "This Month",
          previousPeriodLabel: "Last Month",
        }
      }

      if (period === "year") {
        const firstDay = new Date(now.getFullYear(), 0, 1)
        const startStr = toLocalDateStr(firstDay)
        const prevYearFirst = new Date(now.getFullYear() - 1, 0, 1)
        const prevYearLast = new Date(now.getFullYear() - 1, 11, 31)
        const prevStartStr = toLocalDateStr(prevYearFirst)
        const prevEndStr = toLocalDateStr(prevYearLast)

        const curr = workouts.filter((w) => {
          const d = (w.date || "").slice(0, 10)
          return d >= startStr && d <= todayStr
        })
        const prev = workouts.filter((w) => {
          const d = (w.date || "").slice(0, 10)
          return d >= prevStartStr && d <= prevEndStr
        })
        return {
          filteredWorkouts: curr,
          previousPeriodWorkouts: prev,
          currentPeriodLabel: "This Year",
          previousPeriodLabel: "Last Year",
        }
      }

      // period === "all"
      return {
        filteredWorkouts: workouts,
        previousPeriodWorkouts: [],
        currentPeriodLabel: "All Time",
        previousPeriodLabel: "",
      }
    }, [workouts, period])

  // Grouped sessions
  const allSessions = useMemo(() => groupWorkoutsIntoSessions(workouts), [workouts])
  const filteredSessions = useMemo(
    () => groupWorkoutsIntoSessions(filteredWorkouts),
    [filteredWorkouts]
  )

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

  // Dedicated Weekly Overview Screen (Reference 06 & 07)
  if (activeTab === "weekly") {
    return (
      <main
        className={`${spaceGrotesk.variable} ${inter.variable} font-body min-h-screen bg-black text-zinc-100 pb-32 max-w-lg md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 pt-4 space-y-6`}
      >
        <WeeklyOverview
          workouts={workouts}
          exercises={exercises}
          onBack={() => {
            soundManager.play("click", 0.2)
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
    <PageTransition>
      <main
        className={`${spaceGrotesk.variable} ${inter.variable} font-body min-h-screen bg-black text-zinc-100 pb-32 max-w-lg md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 pt-4 space-y-6 sm:space-y-7`}
      >
        {/* ─── 1. HEADER: "Report" + Period Segmented Control + Monthly Quick Link (Same Row) ─── */}
        <header className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
              Report
            </h1>
          </div>

          {/* Period Segmented Control */}
          <div className="flex items-center p-1 rounded-full bg-zinc-900 border border-zinc-800 w-full">
            {PERIOD_FILTERS.map((f) => {
              const isActive = period === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    soundManager.play("click", 0.15)
                    setPeriod(f.id)
                  }}
                  className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer min-h-[36px] flex items-center justify-center active:scale-95 whitespace-nowrap ${
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
        </header>

      {/* ─── 2+3. TOTAL + THIS WEEK (side-by-side on desktop) ─── */}
      <div className="grid gap-6 sm:gap-7 lg:grid-cols-2 lg:gap-8">
      {/* ─── 2. TOTAL SECTION (Reference 01: Workouts, Time, Volume + Weekly Bar Chart) ─── */}
      <section className="space-y-2 min-w-0">
        <h2 className="text-base sm:text-lg font-bold text-white font-display">
          Total
        </h2>
        <TotalStatsCard sessions={filteredSessions} />
      </section>

      {/* ─── 3. THIS WEEK SECTION (Reference 01: 7 Circles + Today & Avg min) ─── */}
      <section className="min-w-0">
        <ThisWeekCard
          sessions={filteredSessions}
          onOpenWeeklyOverview={() => {
            soundManager.play("click", 0.2)
            setActiveTab("weekly")
          }}
        />
      </section>
      </div>

      {/* ─── 4. TRAINING FREQUENCY / MASCOT (Reference 08: Coral Anatomical Figures) ─── */}
      <section className="space-y-2">
        <h2 className="text-base sm:text-lg font-bold text-white font-display">
          Training Frequency
        </h2>
        <TrainingFrequencyCard
          workouts={filteredWorkouts}
          exercises={exercises}
          periodLabel={currentPeriodLabel}
        />
      </section>

      {/* ─── 5. SECONDARY FEATURES BEHIND CLEAN ENTRY CARDS (Task 6: Minimal IA) ─── */}
      <section className="space-y-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-display">
          More Analytics
        </h2>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {/* Muscle Distribution Radar Entry Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              soundManager.play("click", 0.2)
              setRadarModalOpen(true)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                soundManager.play("click", 0.2)
                setRadarModalOpen(true)
              }
            }}
            className="group rounded-2xl border border-zinc-800 bg-[#121316] p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-zinc-900/90 hover:border-zinc-700 transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.99] min-h-[60px]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 flex items-center justify-center shrink-0 group-hover:bg-zinc-800 group-hover:border-zinc-600 group-hover:text-white transition-colors">
                <Activity className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white font-display tracking-tight truncate">
                  Muscle Distribution
                </h3>
                <p className="text-xs text-zinc-400 font-body truncate mt-0.5">
                  6-zone balance radar & delta stats ({currentPeriodLabel})
                </p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all shrink-0">
              <ChevronRight className="w-4 h-4 stroke-[2]" />
            </div>
          </div>

          {/* Monthly Report Entry Card */}
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
            className="group rounded-2xl border border-zinc-800 bg-[#121316] p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-zinc-900/90 hover:border-zinc-700 transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.99] min-h-[60px]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 flex items-center justify-center shrink-0 group-hover:bg-zinc-800 group-hover:border-zinc-600 group-hover:text-white transition-colors">
                <CalendarIcon className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white font-display tracking-tight truncate">
                  Monthly Report
                </h3>
                <p className="text-xs text-zinc-400 font-body truncate mt-0.5">
                  {`${currentMonthName} ${currentYear} · 12-mo trend, calendar log & share`}
                </p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all shrink-0">
              <ChevronRight className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. PERSONAL PR RECORDS (Ultra-minimal: Exercise name + PR only) ─── */}
      <section className="space-y-2">
        <h2 className="text-base sm:text-lg font-bold text-white font-display">
          Personal Records
        </h2>
        <PersonalRecords workouts={workouts} />
      </section>

      {/* ─── MODALS ─── */}
      {/* 1. Monthly Report Modal (Reference 04) */}
      <MonthlyReportModal
        isOpen={monthlyReportOpen}
        onClose={() => setMonthlyReportOpen(false)}
        workouts={workouts}
        exercises={exercises}
      />

      {/* 2. Muscle Distribution Radar Modal (Reference 03) */}
      <MuscleDistributionModal
        isOpen={radarModalOpen}
        onClose={() => setRadarModalOpen(false)}
        workouts={workouts}
        exercises={exercises}
        customCurrentWorkouts={filteredWorkouts}
        customPreviousWorkouts={previousPeriodWorkouts}
        currentLabel={currentPeriodLabel}
        previousLabel={previousPeriodLabel}
      />
    </main>
    </PageTransition>
  )
}