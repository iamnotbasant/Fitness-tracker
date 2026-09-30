"use client"

import { useMemo, useState, useEffect } from "react"
import { useWorkouts, useExercises } from "@/hooks/use-local-data"
import { MuscleSplitBreakdown } from "@/components/charts/muscle-split-breakdown"
import { ExerciseProgressionChart } from "@/components/charts/exercise-progression-chart"
import { PersonalRecords } from "@/components/charts/personal-records"
import { WorkoutHeatmap } from "@/components/charts/workout-heatmap"
import { Award } from "lucide-react"
import {
  AnimatedDumbbell,
  AnimatedTrophy,
  AnimatedFlame,
  AnimatedCalendar,
} from "@/components/ui/animated-icons"
import { DateRangeFilter, type DateFilterValue, getPresetDates } from "@/components/ui/date-range-filter"

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

  const filtered = useMemo(() => {
    if (filterValue.preset === "all_time" && !filterValue.startDate && !filterValue.endDate) {
      return workouts
    }

    let start = filterValue.startDate
    let end = filterValue.endDate

    if (filterValue.preset !== "custom") {
      const dates = getPresetDates(filterValue.preset)
      start = dates.start
      end = dates.end
    }

    if (!start && !end) return workouts

    return workouts.filter((w) => {
      const wDate = (w.date || "").slice(0, 10)
      if (!wDate) return false
      if (start && wDate < start) return false
      if (end && wDate > end) return false
      return true
    })
  }, [workouts, filterValue])

  // Overview stats with Sunday-streak logic strictly preserved
  const quickStats = useMemo(() => {
    const totalPts = filtered.reduce((acc, w) => acc + (w.points ?? w.total_points ?? 0), 0)
    const totalSets = filtered.reduce((acc, w) => acc + (w.sets || 1), 0)
    const uniqueDays = new Set(filtered.map((w) => w.date)).size

    // Helper for timezone-safe local YYYY-MM-DD
    const toLocalDateStr = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const day = String(d.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    }

    // Calculate current streak with local timezone accuracy (ignoring Sundays)
    const dates = new Set(workouts.map((w) => w.date))
    let currentStreak = 0
    const today = new Date()
    const todayStr = toLocalDateStr(today)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (yesterday.getDay() === 0 && !dates.has(toLocalDateStr(yesterday))) {
      yesterday.setDate(yesterday.getDate() - 1)
    }
    const yesterdayStr = toLocalDateStr(yesterday)

    if (dates.has(todayStr) || dates.has(yesterdayStr)) {
      const check = new Date(dates.has(todayStr) ? today : yesterday)
      while (true) {
        if (check.getDay() === 0) {
          check.setDate(check.getDate() - 1)
          continue
        }
        if (dates.has(toLocalDateStr(check))) {
          currentStreak++
          check.setDate(check.getDate() - 1)
        } else {
          break
        }
      }
    }

    return {
      totalWorkouts: filtered.length,
      totalPoints: totalPts,
      totalSets,
      activeDays: uniqueDays,
      currentStreak,
    }
  }, [filtered, workouts])

  if (!mounted || workoutsLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent mx-auto" />
          <p className="text-xs font-medium text-muted-foreground">Loading Analytics & Progress...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="pb-32 md:pb-16 max-w-4xl mx-auto px-4 pt-6 space-y-6">
      {/* Page Header & Filter */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Progress</h1>
          <p className="text-xs text-muted-foreground">Training analytics, volume, and personal records</p>
        </div>

        <div className="self-start sm:self-auto">
          <DateRangeFilter value={filterValue} onChange={setFilterValue} />
        </div>
      </section>

      {/* Quick Highlights Summary Bar (4 cards) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <AnimatedDumbbell className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-muted-foreground block truncate">Total Volume</span>
            <span className="text-lg font-black text-foreground truncate block">
              {quickStats.totalSets} <span className="text-xs font-normal text-muted-foreground">sets</span>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <AnimatedTrophy className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-muted-foreground block truncate">Workout Points</span>
            <span className="text-lg font-black text-primary truncate block">
              {quickStats.totalPoints.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <AnimatedFlame className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-muted-foreground block truncate">Current Streak</span>
            <span className="text-lg font-black text-foreground truncate block">
              {quickStats.currentStreak} <span className="text-xs font-normal text-muted-foreground">days</span>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <AnimatedCalendar className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-muted-foreground block truncate">Active Days</span>
            <span className="text-lg font-black text-foreground truncate block">
              {quickStats.activeDays} <span className="text-xs font-normal text-muted-foreground">days</span>
            </span>
          </div>
        </div>
      </section>

      {/* Section 1: Muscle Group Breakdown (Clean horizontal bars) */}
      <section>
        <MuscleSplitBreakdown workouts={filtered} exercises={exercises} />
      </section>

      {/* Section 2: Per-Exercise Progression (Selector + Volume / Best-set trend) */}
      <section>
        <ExerciseProgressionChart workouts={filtered} exercises={exercises} />
      </section>

      {/* Section 3: Personal Records (Simplified top records) */}
      <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Personal Records</h2>
              <p className="text-[11px] text-muted-foreground">Top achievements & estimated 1RM</p>
            </div>
          </div>
        </div>
        <PersonalRecords workouts={filtered} />
      </section>

      {/* Section 4: Workout Consistency Activity Heatmap */}
      <section>
        <WorkoutHeatmap workouts={workouts} />
      </section>
    </main>
  )
}