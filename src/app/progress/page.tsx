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

type PeriodFilter = "week" | "month" | "year" | "all"

const PERIOD_FILTERS: { id: PeriodFilter; label: string }[] = [
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

  // Filter workouts according to minimal header period selection
  const filteredWorkouts = useMemo(() => {
    if (period === "all") return workouts

    const now = new Date()
    const todayStr = toLocalDateStr(now)
    let startStr = ""

    if (period === "week") {
      const monday = getMondayOfWeek(now)
      startStr = toLocalDateStr(monday)
    } else if (period === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      startStr = toLocalDateStr(firstDay)
    } else if (period === "year") {
      const firstDay = new Date(now.getFullYear(), 0, 1)
      startStr = toLocalDateStr(firstDay)
    }

    return workouts.filter((w) => {
      const wDate = (w.date || "").slice(0, 10)
      if (!wDate) return false
      return wDate >= startStr && wDate <= todayStr
    })
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
        className={`${spaceGrotesk.variable} ${inter.variable} font-body min-h-screen bg-black text-zinc-100 pb-32 max-w-lg mx-auto px-4 pt-4 space-y-6`}
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
    <main
      className={`${spaceGrotesk.variable} ${inter.variable} font-body min-h-screen bg-black text-zinc-100 pb-32 max-w-lg mx-auto px-4 pt-4 space-y-6 sm:space-y-7`}
    >
      {/* ─── 1. MINIMAL HEADER: "REPORT" + Small Quiet Period Segmented Control + Monthly Quick Link ─── */}
      <header className="flex items-center justify-between gap-2 pt-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display uppercase">
          REPORT
        </h1>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Minimal Period Segmented Control (Task 5: Small, quiet, premium) */}
          <div className="flex items-center p-0.5 rounded-xl bg-zinc-900 border border-zinc-800">
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
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[32px] ${
                    isActive
                      ? "bg-zinc-800 text-white shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* Quick Monthly Report Action Button */}
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              setMonthlyReportOpen(true)
            }}
            className="h-8 min-h-[32px] px-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
            title="Open Monthly Report"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden xs:inline">Monthly</span>
          </button>
        </div>
      </header>

      {/* ─── 2. TOTAL SECTION (Reference 01: Workouts, Time, Volume + Weekly Bar Chart) ─── */}
      <section className="space-y-2">
        <h2 className="text-base sm:text-lg font-bold text-white font-display">
          Total
        </h2>
        <TotalStatsCard sessions={filteredSessions} allSessions={allSessions} />
      </section>

      {/* ─── 3. THIS WEEK SECTION (Reference 01: 7 Circles + Today & Avg min) ─── */}
      <section>
        <ThisWeekCard
          sessions={allSessions}
          onOpenWeeklyOverview={() => {
            soundManager.play("click", 0.2)
            setActiveTab("weekly")
          }}
        />
      </section>

      {/* ─── 4. TRAINING FREQUENCY / MASCOT (Reference 08: Coral Anatomical Figures + 7D/4W Toggle) ─── */}
      <section className="space-y-2">
        <h2 className="text-base sm:text-lg font-bold text-white font-display">
          Training Frequency
        </h2>
        <TrainingFrequencyCard workouts={workouts} exercises={exercises} />
      </section>

      {/* ─── 5. SECONDARY FEATURES BEHIND CLEAN ENTRY CARDS (Task 6: Minimal IA) ─── */}
      <section className="space-y-2.5">
        <h2 className="text-xs font-semibold text-zinc-400 font-display uppercase tracking-wider">
          More Analytics
        </h2>

        {/* Muscle Distribution Radar Entry Card */}
        <div
          onClick={() => {
            soundManager.play("click", 0.2)
            setRadarModalOpen(true)
          }}
          className="rounded-2xl border border-zinc-850 bg-zinc-950/80 p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-zinc-900 hover:border-zinc-800 transition-all cursor-pointer shadow-sm min-h-[56px]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#3b82f6] flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white font-display truncate">
                Muscle Distribution
              </h3>
              <p className="text-xs text-zinc-400 font-body truncate">
                6-zone balance radar & delta stats
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
        </div>

        {/* Monthly Report Entry Card */}
        <div
          onClick={() => {
            soundManager.play("click", 0.2)
            setMonthlyReportOpen(true)
          }}
          className="rounded-2xl border border-zinc-850 bg-zinc-950/80 p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-zinc-900 hover:border-zinc-800 transition-all cursor-pointer shadow-sm min-h-[56px]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-zinc-850 border border-zinc-750 text-white flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white font-display truncate">
                Monthly Report
              </h3>
              <p className="text-xs text-zinc-400 font-body truncate">
                {currentMonthName} {currentYear} · 12-mo trend, calendar log & share
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
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
      />
    </main>
  )
}