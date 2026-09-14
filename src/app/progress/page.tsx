"use client"

import { useMemo, useState, useEffect } from "react"
import { useWorkouts, useExercises } from "@/hooks/use-local-data"
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
import { Activity, Dumbbell, TrendingUp, Award, Flame, Calendar } from "lucide-react"

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
    const now = new Date()
    let startDate = new Date()

    switch (timeRange) {
      case "7days":
        startDate.setDate(now.getDate() - 7)
        break
      case "month":
        startDate.setMonth(now.getMonth() - 1)
        break
      case "3months":
        startDate.setMonth(now.getMonth() - 3)
        break
      case "year":
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case "all":
        return workouts
    }

    const startDateStr = startDate.toISOString().slice(0, 10)
    return workouts.filter((w) => w.date >= startDateStr)
  }, [workouts, timeRange])

  // Overview quick stats
  const quickStats = useMemo(() => {
    const totalPts = filtered.reduce((acc, w) => acc + (w.points ?? w.total_points ?? 0), 0)
    const totalSets = filtered.reduce((acc, w) => acc + (w.sets || 1), 0)
    const uniqueDays = new Set(filtered.map((w) => w.date)).size

    return {
      totalWorkouts: filtered.length,
      totalPoints: totalPts,
      totalSets,
      activeDays: uniqueDays,
    }
  }, [filtered])

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
    <main className="pb-24 md:pb-12">
      {/* Page Header */}
      <section className="mx-auto max-w-5xl px-4 pt-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <span>Analytics & Progress</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Comprehensive anatomical activation, training consistency, and progressive overload metrics
            </p>
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

        {/* Quick Highlights Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Dumbbell className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Total Volume</span>
              <span className="text-lg font-black text-foreground">{quickStats.totalSets} <span className="text-xs font-normal text-muted-foreground">sets</span></span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Award className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Workout Points</span>
              <span className="text-lg font-black text-primary">{quickStats.totalPoints.toLocaleString()}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Active Days</span>
              <span className="text-lg font-black text-foreground">{quickStats.activeDays} <span className="text-xs font-normal text-muted-foreground">days</span></span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Sessions Logged</span>
              <span className="text-lg font-black text-foreground">{quickStats.totalWorkouts}</span>
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
            {/* Workout Consistency 365-Day Activity Heatmap */}
            <div>
              <WorkoutHeatmap workouts={workouts} />
            </div>

            {/* Weekly Goal Completion Rings */}
            <div>
              <RadialGoalsChart workouts={filtered} />
            </div>
          </TabsContent>

          {/* TAB 2: Strength & Overload */}
          <TabsContent value="strength" className="space-y-8 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Point Volume Progression</h3>
                <p className="text-xs text-muted-foreground">Historical progressive overload and points trajectory</p>
              </div>
              <TotalVolumeChart workouts={filtered} />
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Personal Records (PRs)</h3>
                <p className="text-xs text-muted-foreground">Peak single-session volume and max performance milestones</p>
              </div>
              <PersonalRecords workouts={filtered} />
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Skill Progression Timeline</h3>
                <p className="text-xs text-muted-foreground">Milestones unlocked throughout your training journey</p>
              </div>
              <ProgressionTimeline workouts={workouts} />
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
                <div>
                  <h3 className="text-base font-bold text-foreground">Workout Density</h3>
                  <p className="text-xs text-muted-foreground">Pace efficiency: Reps completed per minute of workout</p>
                </div>
                <WorkoutDensity workouts={filtered} />
              </div>

              <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Time Under Tension (TUT)</h3>
                  <p className="text-xs text-muted-foreground">Estimated muscle contraction duration for hypertrophy stimulus</p>
                </div>
                <TimeUnderTension workouts={filtered} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  )
}