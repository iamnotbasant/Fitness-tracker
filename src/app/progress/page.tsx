"use client"

import { useMemo, useState, useEffect } from "react"
import { Space_Grotesk, Inter } from "next/font/google"
import { useWorkouts, useExercises } from "@/hooks/use-local-data"

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

import { WorkoutHeatmap } from "@/components/charts/workout-heatmap"
import { SmartInsights } from "@/components/charts/smart-insights"
import { MuscleAnatomyMap } from "@/components/charts/muscle-anatomy-map"
import { ExerciseProgressionChart } from "@/components/charts/exercise-progression-chart"
import { PersonalRecords } from "@/components/charts/personal-records"
import {
  DateRangeFilter,
  type DateFilterValue,
  getPresetDates,
} from "@/components/ui/date-range-filter"

/**
 * Analytics v5 Design System:
 * - Strict monochrome black, white & zinc palette
 * - Surfaces: bg-zinc-950 (base), bg-zinc-900 (cards), bg-zinc-950 (control wells)
 * - Borders: border-zinc-800
 * - Text: text-white (headings/metrics), text-zinc-300, text-zinc-400, text-zinc-500
 * - Accents: Pure white is the only accent. No other hues.
 * - Drilldowns: Focused, dismissible DetailBottomSheet modal (no inline expanding clutter).
 */

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false)
  const { workouts, isLoading: workoutsLoading } = useWorkouts()
  const { exercises } = useExercises()
  const [filterValue, setFilterValue] = useState<DateFilterValue>({
    preset: "all_time",
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Filter workouts by date range
  const filtered = useMemo(() => {
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

  if (!mounted || workoutsLoading) {
    return (
      <main
        className={`${spaceGrotesk.variable} ${inter.variable} font-body min-h-screen bg-zinc-950 flex items-center justify-center p-4`}
      >
        <div className="w-full max-w-xs rounded-2xl bg-zinc-900 p-6 border border-zinc-800 text-center space-y-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto" />
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
            Loading analytics...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main
      className={`${spaceGrotesk.variable} ${inter.variable} font-body min-h-screen bg-zinc-950 text-zinc-100 pb-32 max-w-4xl mx-auto px-4 pt-6 space-y-6 sm:space-y-8`}
    >
      {/* ─── 1. PAGE HEADER: Title + Monochrome Date-Range Filter (Tap >= 44px) ─── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            Progress
          </h1>
          <p className="text-xs text-zinc-400 font-body mt-0.5">
            Consistency, muscle activation & personal milestones
          </p>
        </div>

        <div className="self-start sm:self-auto">
          <DateRangeFilter value={filterValue} onChange={setFilterValue} />
        </div>
      </header>

      {/* ─── 2. CONSISTENCY: Current Streak + White GitHub-Style Heatmap ─── */}
      <section>
        <WorkoutHeatmap workouts={workouts} />
      </section>

      {/* ─── 3. SMART INSIGHTS: Training Time + Progress Snapshot ─── */}
      <section>
        <SmartInsights workouts={filtered} exercises={exercises} />
      </section>

      {/* ─── 4. MUSCLES: Activation Overview + Anatomy Figure (Both/Front/Back) ─── */}
      <section>
        <MuscleAnatomyMap workouts={filtered} exercises={exercises} />
      </section>

      {/* ─── 5. PROGRESSION: Exercise Progression + White Line/Area Chart ─── */}
      <section>
        <ExerciseProgressionChart workouts={filtered} exercises={exercises} />
      </section>

      {/* ─── 6. RECORDS: Milestones Reached + History Drilldown ─── */}
      <section>
        <PersonalRecords workouts={filtered} />
      </section>
    </main>
  )
}