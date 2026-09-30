"use client"

import { useMemo, useState, useEffect } from "react"
import { useWorkouts, useExercises } from "@/hooks/use-local-data"
import { MuscleAnatomyMap } from "@/components/charts/muscle-anatomy-map"
import { PushPullBalance } from "@/components/charts/push-pull-balance"
import { WeeklyMuscleVolumeBand } from "@/components/charts/weekly-muscle-volume-band"
import { ExerciseProgressionChart } from "@/components/charts/exercise-progression-chart"
import { PersonalRecords } from "@/components/charts/personal-records"
import { WorkoutHeatmap } from "@/components/charts/workout-heatmap"
import {
  Flame,
  Calendar,
  Layers,
  Award,
  Activity,
  CheckCircle2,
} from "lucide-react"
import {
  AnimatedFlame,
  AnimatedCalendar,
  AnimatedDumbbell,
  AnimatedTrophy,
} from "@/components/ui/animated-icons"
import {
  DateRangeFilter,
  type DateFilterValue,
  getPresetDates,
  toLocalDateString,
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
  const { filtered, dateRangeDays } = useMemo(() => {
    let start = filterValue.startDate
    let end = filterValue.endDate

    if (filterValue.preset !== "custom" && filterValue.preset !== "all_time") {
      const dates = getPresetDates(filterValue.preset)
      start = dates.start
      end = dates.end
    }

    if (!start && !end) {
      // All time: calculate span from earliest workout to today
      let days = 28
      if (workouts.length > 0) {
        const sorted = [...workouts].filter((w) => w.date).sort((a, b) => a.date.localeCompare(b.date))
        if (sorted[0]?.date) {
          const earliestTime = new Date(sorted[0].date).getTime()
          days = Math.max(7, Math.round((Date.now() - earliestTime) / (1000 * 3600 * 24)) + 1)
        }
      }
      return { filtered: workouts, dateRangeDays: days }
    }

    const filteredList = workouts.filter((w) => {
      const wDate = (w.date || "").slice(0, 10)
      if (!wDate) return false
      if (start && wDate < start) return false
      if (end && wDate > end) return false
      return true
    })

    let spanDays = 28
    if (start && end) {
      spanDays = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 3600 * 24)) + 1)
    }

    return { filtered: filteredList, dateRangeDays: spanDays }
  }, [workouts, filterValue])

  // Overview stats with Sunday-streak logic strictly preserved (commit f3bcae6)
  const consistencyStats = useMemo(() => {
    const toLocalDateStr = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const day = String(d.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    }

    const dates = new Set(workouts.map((w) => w.date))
    let currentStreak = 0
    const today = new Date()
    const todayStr = toLocalDateStr(today)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    // Skip Sunday when checking yesterday
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

    // Longest streak ignoring Sundays
    let longestStreak = 0
    let tempStreak = 0
    if (workouts.length > 0) {
      const sortedDates = Array.from(dates).sort()
      if (sortedDates.length > 0) {
        const start = new Date(sortedDates[0])
        const end = new Date(today)
        const cur = new Date(start)

        while (cur <= end) {
          if (cur.getDay() === 0) {
            // Sunday is ignored
            cur.setDate(cur.getDate() + 1)
            continue
          }
          const dStr = toLocalDateStr(cur)
          if (dates.has(dStr)) {
            tempStreak++
            if (tempStreak > longestStreak) longestStreak = tempStreak
          } else {
            tempStreak = 0
          }
          cur.setDate(cur.getDate() + 1)
        }
      }
    }

    const uniqueDaysInFiltered = new Set(filtered.map((w) => w.date)).size
    const totalSetsInFiltered = filtered.reduce((acc, w) => acc + (w.sets || 1), 0)
    const weeksCount = Math.max(1, Number((dateRangeDays / 7).toFixed(1)))
    const workoutsPerWeek = Number((uniqueDaysInFiltered / weeksCount).toFixed(1))

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      uniqueDays: uniqueDaysInFiltered,
      totalSets: totalSetsInFiltered,
      workoutsPerWeek,
      totalWorkouts: filtered.length,
    }
  }, [filtered, workouts, dateRangeDays])

  if (!mounted || workoutsLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-3xl bg-[#121318] p-6 border border-border/40 text-center space-y-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
            Loading Analytics Engine...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-32 md:pb-20 max-w-4xl mx-auto px-4 pt-6 space-y-8">
      {/* ─── PAGE HEADER & TIME HORIZON FILTER ─── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            Analytics & Progress
          </h1>
          <p className="text-xs text-muted-foreground">
            Calisthenics volume, muscular activation, and personal milestones
          </p>
        </div>

        <div className="self-start sm:self-auto">
          <DateRangeFilter value={filterValue} onChange={setFilterValue} />
        </div>
      </section>

      {/* ─── SECTION 1: CONSISTENCY HERO & CALENDAR HEATMAP ─── */}
      <section className="space-y-4">
        {/* Consistency Hero Metric Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Hero Metric: Current Streak */}
          <div className="rounded-3xl bg-[#121318] p-4 sm:p-5 border border-border/50 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Streak
              </span>
              <div className="h-8 w-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                <AnimatedFlame className="h-4 w-4" />
              </div>
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                  {consistencyStats.currentStreak}
                </span>
                <span className="text-sm font-bold text-muted-foreground">days</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
              <span>Rest day: Sunday</span>
              <span className="font-mono">Best: <strong className="text-foreground">{consistencyStats.longestStreak}d</strong></span>
            </div>
          </div>

          {/* Supporting Metric: Workouts / Week */}
          <div className="rounded-3xl bg-[#121318] p-4 sm:p-5 border border-border/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Weekly Frequency
              </span>
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <AnimatedCalendar className="h-4 w-4" />
              </div>
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                  {consistencyStats.workoutsPerWeek}
                </span>
                <span className="text-sm font-bold text-muted-foreground">/ week</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
              <span>Target: 4–5 workouts</span>
              <span className="font-mono">{consistencyStats.uniqueDays} active days</span>
            </div>
          </div>

          {/* Supporting Metric: Total Volume */}
          <div className="rounded-3xl bg-[#121318] p-4 sm:p-5 border border-border/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Volume
              </span>
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <AnimatedDumbbell className="h-4 w-4" />
              </div>
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                  {consistencyStats.totalSets}
                </span>
                <span className="text-sm font-bold text-muted-foreground">sets</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
              <span>Selected period</span>
              <span className="font-mono">{consistencyStats.totalWorkouts} sessions</span>
            </div>
          </div>
        </div>

        {/* GitHub-style Heatmap Calendar (preserves Sunday streak math) */}
        <div>
          <WorkoutHeatmap workouts={workouts} />
        </div>
      </section>

      {/* ─── SECTION 2: MUSCLE TARGETING & ANATOMY CHARACTERS ─── */}
      <section className="space-y-4">
        {/* Anatomical Character Heatmap with Numeric % Labels */}
        <MuscleAnatomyMap workouts={filtered} exercises={exercises} />

        {/* Calisthenics Postural Balance & Guideline Band */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Push / Pull Balance Meter */}
          <PushPullBalance workouts={filtered} exercises={exercises} />

          {/* Sets-per-Muscle Bars vs 10–20 Guideline Band */}
          <WeeklyMuscleVolumeBand
            workouts={filtered}
            exercises={exercises}
            dateRangeDays={dateRangeDays}
          />
        </div>
      </section>

      {/* ─── SECTION 3: PER-EXERCISE PROGRESSION (REPS-FIRST) ─── */}
      <section>
        <ExerciseProgressionChart workouts={filtered} exercises={exercises} />
      </section>

      {/* ─── SECTION 4: PERSONAL RECORDS & CELEBRATION ─── */}
      <section className="rounded-3xl border border-border/60 bg-[#121318] p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Personal Records & Milestones
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Peak reps, hold times, and weighted calisthenics breakthroughs
              </p>
            </div>
          </div>
        </div>

        <PersonalRecords workouts={filtered} />
      </section>
    </main>
  )
}