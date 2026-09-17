"use client"

import { useMemo, useState, useEffect } from "react"
import { useWorkouts, useExercises } from "@/hooks/use-local-data"
import { MuscleAnatomyMap } from "@/components/charts/muscle-anatomy-map"
import { TotalVolumeChart } from "@/components/charts/total-volume-chart"
import { PersonalRecords } from "@/components/charts/personal-records"
import { WorkoutHeatmap } from "@/components/charts/workout-heatmap"
import { MuscleBalance } from "@/components/charts/muscle-balance"
import { ProgressionTimeline } from "@/components/charts/progression-timeline"
import { WorkoutDensity } from "@/components/charts/workout-density"
import { TimeUnderTension } from "@/components/charts/time-under-tension"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadialGoalsChart } from "@/components/charts/radial-goals-chart"
import { MuscleRadarChart } from "@/components/charts/muscle-radar-chart"
import { Dumbbell, Award, Flame, Calendar } from "lucide-react"
import { AnimatedDumbbell, AnimatedTrophy, AnimatedFlame, AnimatedCalendar } from "@/components/ui/animated-icons"

type TimeRange = "7days" | "month" | "3months" | "year" | "all"

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false)
  const { workouts, isLoading: workoutsLoading } = useWorkouts()
  const { exercises } = useExercises()
  const [timeRange, setTimeRange] = useState<TimeRange>("all")

  useEffect(() => {
    setMounted(true)
  }, [])

  const filtered = useMemo(() => {
    if (timeRange === "all") return workouts

    const now = new Date()
    let daysToSubtract = 0

    switch (timeRange) {
      case "7days":
        daysToSubtract = 7
        break
      case "month":
        daysToSubtract = 30
        break
      case "3months":
        daysToSubtract = 90
        break
      case "year":
        daysToSubtract = 365
        break
    }

    const startDate = new Date(now)
    startDate.setDate(now.getDate() - daysToSubtract)
    const y = startDate.getFullYear()
    const m = String(startDate.getMonth() + 1).padStart(2, "0")
    const d = String(startDate.getDate()).padStart(2, "0")
    const startDateStr = `${y}-${m}-${d}`

    return workouts.filter((w) => {
      const wDate = (w.date || "").slice(0, 10)
      return wDate >= startDateStr
    })
  }, [workouts, timeRange])

  // Overview unique non-repetitive stats
  const quickStats = useMemo(() => {
    const totalPts = filtered.reduce((acc, w) => acc + (w.points ?? w.total_points ?? 0), 0)
    const totalSets = filtered.reduce((acc, w) => acc + (w.sets || 1), 0)
    const uniqueDays = new Set(filtered.map((w) => w.date)).size

    // Helper for timezone-safe local YYYY-MM-DD
    const toLocalDateStr = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Calculate current streak with local timezone accuracy
    const dates = new Set(workouts.map((w) => w.date))
    let currentStreak = 0
    const today = new Date()
    const todayStr = toLocalDateStr(today)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yesterdayStr = toLocalDateStr(yesterday)

    if (dates.has(todayStr) || dates.has(yesterdayStr)) {
      const check = new Date(dates.has(todayStr) ? today : yesterday)
      while (dates.has(toLocalDateStr(check))) {
        currentStreak++
        check.setDate(check.getDate() - 1)
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
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent mx-auto"></div>
          <p className="text-xs font-medium text-muted-foreground">Loading Analytics & Heatmaps...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="pb-32 md:pb-16">
      {/* Page Header */}
      <section className="mx-auto max-w-5xl px-4 pt-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Progress
            </h1>
          </div>

          {/* Time Range Filter */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-medium text-muted-foreground">Range:</span>
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="w-[140px] h-9 text-xs rounded-xl bg-card border-border/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="year">Past Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Highlights Summary Bar (Non-repetitive metrics) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <AnimatedDumbbell className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Total Volume</span>
              <span className="text-lg font-black text-foreground">{quickStats.totalSets} <span className="text-xs font-normal text-muted-foreground">sets</span></span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <AnimatedTrophy className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Workout Points</span>
              <span className="text-lg font-black text-primary">{quickStats.totalPoints.toLocaleString()}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
              <AnimatedFlame className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Current Streak</span>
              <span className="text-lg font-black text-foreground">{quickStats.currentStreak} <span className="text-xs font-normal text-muted-foreground">days</span></span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <AnimatedCalendar className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Active Days</span>
              <span className="text-lg font-black text-foreground">{quickStats.activeDays} <span className="text-xs font-normal text-muted-foreground">days</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Layout */}
      <section className="mx-auto max-w-5xl px-4">
        <Tabs defaultValue="heatmaps" className="w-full">
          <TabsList className="w-full justify-start mb-6 bg-secondary/50 p-1 rounded-2xl border border-border/60">
            <TabsTrigger value="heatmaps" className="rounded-xl text-xs sm:text-sm font-semibold px-4 py-2">
              Anatomy & Consistency
            </TabsTrigger>
            <TabsTrigger value="strength" className="rounded-xl text-xs sm:text-sm font-semibold px-4 py-2">
              Progressive Overload & PRs
            </TabsTrigger>
            <TabsTrigger value="balance" className="rounded-xl text-xs sm:text-sm font-semibold px-4 py-2">
              Muscular Balance & Density
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Consistency & Activity */}
          <TabsContent value="heatmaps" className="space-y-8 focus-visible:outline-none">
            {/* Male Muscle Anatomy Heatmap from Melih Colpan */}
            <div>
              <MuscleAnatomyMap workouts={filtered} exercises={exercises} />
            </div>

            {/* Workout Consistency Activity Heatmap */}
            <div>
              <WorkoutHeatmap workouts={filtered.length > 0 ? filtered : workouts} />
            </div>

            {/* Weekly Goal Completion Rings */}
            <div>
              <RadialGoalsChart 
                workouts={filtered} 
                period={timeRange === "7days" ? "weekly" : timeRange === "month" ? "monthly" : timeRange === "year" ? "yearly" : timeRange} 
              />
            </div>
          </TabsContent>

          {/* TAB 2: Strength & Overload */}
          <TabsContent value="strength" className="space-y-8 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Volume Progression</h3>
              <TotalVolumeChart workouts={filtered} />
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Personal Records</h3>
              <PersonalRecords workouts={filtered} />
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Milestones</h3>
              <ProgressionTimeline workouts={filtered.length > 0 ? filtered : workouts} />
            </div>
          </TabsContent>

          {/* TAB 3: Muscular Balance & Pro Analytics */}
          <TabsContent value="balance" className="space-y-8 focus-visible:outline-none">
            {/* Radar Symmetry Chart */}
            <div>
              <MuscleRadarChart workouts={filtered} exercises={exercises} />
            </div>

            {/* Muscular Distribution Donut & Top Lifts */}
            <div>
              <MuscleBalance workouts={filtered} exercises={exercises} />
            </div>

            {/* Workout Density & TUT Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Workout Density</h3>
                <WorkoutDensity workouts={filtered} />
              </div>

              <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Time Under Tension</h3>
                <TimeUnderTension workouts={filtered} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  )
}