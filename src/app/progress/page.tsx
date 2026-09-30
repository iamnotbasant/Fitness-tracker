"use client"

import { useMemo, useState, useEffect } from "react"
import { useWorkouts, useExercises } from "@/hooks/use-local-data"
import { WorkoutHeatmap } from "@/components/charts/workout-heatmap"
import { MuscleAnatomyMap } from "@/components/charts/muscle-anatomy-map"
import { ExerciseProgressionChart } from "@/components/charts/exercise-progression-chart"
import { PersonalRecords } from "@/components/charts/personal-records"
import {
  DateRangeFilter,
  type DateFilterValue,
  getPresetDates,
} from "@/components/ui/date-range-filter"

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
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-xs rounded-2xl bg-zinc-900 p-6 border border-zinc-800 text-center space-y-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto" />
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
            Loading...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white pb-32 max-w-4xl mx-auto px-4 pt-6 space-y-6">
      {/* ─── 1. HEADER: Title + Monochrome Date-Range Filter ─── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Progress
          </h1>
        </div>

        <div className="self-start sm:self-auto">
          <DateRangeFilter value={filterValue} onChange={setFilterValue} />
        </div>
      </header>

      {/* ─── 2. CONSISTENCY: Hero Current Streak + White GitHub Heatmap ─── */}
      <section>
        <WorkoutHeatmap workouts={workouts} />
      </section>

      {/* ─── 3. MUSCLES: Anatomy Figure + White Intensity + Simple List ─── */}
      <section>
        <MuscleAnatomyMap workouts={filtered} exercises={exercises} />
      </section>

      {/* ─── 4. PROGRESSION: Exercise Selector + White Reps Area Chart ─── */}
      <section>
        <ExerciseProgressionChart workouts={filtered} exercises={exercises} />
      </section>

      {/* ─── 5. RECORDS: Plain Minimal List (Exercise — Value — Date) ─── */}
      <section>
        <PersonalRecords workouts={filtered} />
      </section>
    </main>
  )
}