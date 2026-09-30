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
import { MuscleAnatomyMap } from "@/components/charts/muscle-anatomy-map"
import { ExerciseProgressionChart } from "@/components/charts/exercise-progression-chart"
import { PersonalRecords } from "@/components/charts/personal-records"
import {
  DateRangeFilter,
  type DateFilterValue,
  getPresetDates,
} from "@/components/ui/date-range-filter"

/**
 * Analytics v4 Design System & Palette Specification:
 * - Surfaces:  #09090b (base background), #121216 (cards), #0c0c10 (inner wells)
 * - Borders:   rgba(255, 255, 255, 0.08)
 * - Text:      #f4f4f5 (primary), #a1a1aa (secondary), #71717a (muted)
 * - Accent:    #4fa8a0 (ONE calm desaturated teal)
 * - Per-Muscle Muted Category Hues:
 *     Push: #5e769e (Slate Indigo)
 *     Pull: #4fa8a0 (Calm Teal)
 *     Legs: #856a88 (Muted Heather)
 *     Core: #5b806d (Muted Sage)
 *     Arms: #947b67 (Warm Sandstone)
 * - BANNED: neon yellow, lime green, bright orange, garish gold, rainbow clutter.
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
        className={`${spaceGrotesk.variable} ${inter.variable} font-body min-h-screen bg-[#09090b] flex items-center justify-center p-4`}
      >
        <div className="w-full max-w-xs rounded-2xl bg-[#121216] p-6 border border-white/[0.08] text-center space-y-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4fa8a0] border-t-transparent mx-auto" />
          <p className="text-xs font-body text-zinc-400 uppercase tracking-wider">
            Loading analytics...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main
      className={`${spaceGrotesk.variable} ${inter.variable} font-body min-h-screen bg-[#09090b] text-zinc-100 pb-32 max-w-4xl mx-auto px-4 pt-6 space-y-6 sm:space-y-8`}
    >
      {/* ─── 1. PAGE HEADER: Title + Date-Range Filter (Tap >= 44px) ─── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
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

      {/* ─── 2. CONSISTENCY: Hero Current Streak + Calm Teal Heatmap ─── */}
      <section>
        <WorkoutHeatmap workouts={workouts} />
      </section>

      {/* ─── 3. MUSCLES: Hero Primary Focus + Anatomy Figure + Big % Rows ─── */}
      <section>
        <MuscleAnatomyMap workouts={filtered} exercises={exercises} />
      </section>

      {/* ─── 4. PROGRESSION: Hero Best Reps + Calm Teal Area Chart ─── */}
      <section>
        <ExerciseProgressionChart workouts={filtered} exercises={exercises} />
      </section>

      {/* ─── 5. RECORDS: Hero Total PRs + Clean List with Calm Teal Accents ─── */}
      <section>
        <PersonalRecords workouts={filtered} />
      </section>
    </main>
  )
}