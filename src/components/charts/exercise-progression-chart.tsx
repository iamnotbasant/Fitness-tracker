"use client"

import { useMemo, useState, useEffect } from "react"
import type { Workout, Exercise } from "@/lib/types"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { TrendingUp, Dumbbell, Award, Flame, Calendar } from "lucide-react"

interface ExerciseProgressionChartProps {
  workouts: Workout[]
  exercises: Exercise[]
}

type ProgressionMetric = "volume" | "best_set"

function formatTimeSec(sec: number) {
  if (!sec) return "0s"
  if (sec >= 60) {
    const mins = Math.floor(sec / 60)
    const rem = sec % 60
    return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`
  }
  return `${sec}s`
}

export function ExerciseProgressionChart({
  workouts,
  exercises,
}: ExerciseProgressionChartProps) {
  // 1. Find all available exercises sorted by session count
  const exerciseOptions = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; count: number }>()

    workouts.forEach((w) => {
      const name = w.exerciseName || w.name || "Unknown Exercise"
      const id = String(w.exerciseId || name)
      const existing = counts.get(id) || { id, name, count: 0 }
      existing.count += 1
      counts.set(id, existing)
    })

    const list = Array.from(counts.values()).sort((a, b) => b.count - a.count)

    // Fallback: if no workouts yet, provide list from exercises catalog
    if (list.length === 0 && exercises.length > 0) {
      return exercises.map((e) => ({ id: String(e.id), name: e.name, count: 0 }))
    }

    return list
  }, [workouts, exercises])

  // Selected exercise state
  const [selectedId, setSelectedId] = useState<string>("")
  const [metric, setMetric] = useState<ProgressionMetric>("volume")

  // Auto-select the most logged exercise on mount or when workouts load
  useEffect(() => {
    if (exerciseOptions.length > 0) {
      if (!selectedId || !exerciseOptions.some((e) => e.id === selectedId)) {
        setSelectedId(exerciseOptions[0].id)
      }
    }
  }, [exerciseOptions, selectedId])

  // Get active exercise metadata
  const activeExercise = useMemo(() => {
    return (
      exerciseOptions.find((e) => e.id === selectedId) ||
      exerciseOptions[0] || { id: "", name: "Exercise", count: 0 }
    )
  }, [exerciseOptions, selectedId])

  // Check if active exercise is timer-based
  const isTimer = useMemo(() => {
    const exObj = exercises.find((e) => String(e.id) === selectedId || e.name === activeExercise.name)
    if (exObj?.type === "timer") return true
    return workouts.some(
      (w) =>
        (String(w.exerciseId) === selectedId || w.exerciseName === activeExercise.name) &&
        (w.timeSeconds || 0) > 0 &&
        (!w.reps || w.reps === 0)
    )
  }, [exercises, selectedId, activeExercise.name, workouts])

  // Build time-series data for the selected exercise
  const { chartData, bestEverSet, peakSessionVolume, totalSessions } = useMemo(() => {
    const relevant = workouts.filter(
      (w) =>
        String(w.exerciseId) === selectedId ||
        (w.exerciseName && w.exerciseName.toLowerCase() === activeExercise.name.toLowerCase())
    )

    if (relevant.length === 0) {
      return {
        chartData: [],
        bestEverSet: "—",
        peakSessionVolume: 0,
        totalSessions: 0,
      }
    }

    // Group workouts by date
    const byDate = new Map<
      string,
      {
        date: string
        totalVolume: number
        bestReps: number
        bestWeight: number
        bestTime: number
        setsCount: number
      }
    >()

    let maxSetMetric = 0
    let maxSetLabel = "—"
    let maxSessionVol = 0

    relevant.forEach((w) => {
      const dateStr = (w.date || "").slice(0, 10)
      if (!dateStr) return

      const existing = byDate.get(dateStr) || {
        date: dateStr,
        totalVolume: 0,
        bestReps: 0,
        bestWeight: 0,
        bestTime: 0,
        setsCount: 0,
      }

      const sets = Math.max(1, w.sets || 1)
      const reps = w.reps || 0
      const timeSec = w.timeSeconds || 0
      const weight = w.weight || 0

      // Volume calculation
      const vol = isTimer
        ? timeSec * sets || timeSec
        : w.volume || (weight > 0 ? weight * reps * sets : reps * sets || reps)

      existing.totalVolume += vol
      existing.setsCount += sets
      existing.bestReps = Math.max(existing.bestReps, reps)
      existing.bestWeight = Math.max(existing.bestWeight, weight)
      existing.bestTime = Math.max(existing.bestTime, timeSec)

      byDate.set(dateStr, existing)
    })

    // Sort by date ascending
    const sortedDates = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))

    const data = sortedDates.map((item) => {
      const d = new Date(item.date + "T00:00:00")
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })

      // Determine metric value
      let value = 0
      let metricLabel = ""

      if (metric === "volume") {
        value = item.totalVolume
        metricLabel = isTimer ? formatTimeSec(value) : `${value} ${item.bestWeight > 0 ? "kg" : "reps"}`
      } else {
        // Best set
        if (isTimer) {
          value = item.bestTime
          metricLabel = formatTimeSec(value)
        } else if (item.bestWeight > 0) {
          value = item.bestWeight
          metricLabel = `${item.bestWeight}kg × ${item.bestReps}`
        } else {
          value = item.bestReps
          metricLabel = `${item.bestReps} reps`
        }
      }

      // Check all-time best
      if (isTimer) {
        if (item.bestTime > maxSetMetric) {
          maxSetMetric = item.bestTime
          maxSetLabel = formatTimeSec(item.bestTime)
        }
      } else if (item.bestWeight > 0) {
        const score = item.bestWeight * 100 + item.bestReps
        if (score > maxSetMetric) {
          maxSetMetric = score
          maxSetLabel = `${item.bestWeight}kg × ${item.bestReps}`
        }
      } else {
        if (item.bestReps > maxSetMetric) {
          maxSetMetric = item.bestReps
          maxSetLabel = `${item.bestReps} reps`
        }
      }

      if (item.totalVolume > maxSessionVol) {
        maxSessionVol = item.totalVolume
      }

      return {
        date: item.date,
        label,
        value,
        metricLabel,
        setsCount: item.setsCount,
        bestSetDisplay: isTimer
          ? formatTimeSec(item.bestTime)
          : item.bestWeight > 0
          ? `${item.bestWeight}kg × ${item.bestReps}`
          : `${item.bestReps} reps`,
      }
    })

    return {
      chartData: data,
      bestEverSet: maxSetLabel,
      peakSessionVolume: maxSessionVol,
      totalSessions: data.length,
    }
  }, [workouts, selectedId, activeExercise.name, metric, isTimer])

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4">
      {/* Top Header & Exercise Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Exercise Progression</h2>
            <p className="text-[11px] text-muted-foreground">Progression trends over time</p>
          </div>
        </div>

        {/* Exercise Dropdown */}
        <div className="w-full sm:w-auto">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full sm:w-56 px-3 py-1.5 rounded-xl bg-secondary/60 border border-border/60 text-xs font-semibold text-foreground focus:outline-none focus:border-primary/60 cursor-pointer"
          >
            {exerciseOptions.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-popover text-foreground">
                {opt.name} {opt.count > 0 ? `(${opt.count})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric Mode Pill Buttons */}
      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/50 border border-border/50">
          <button
            type="button"
            onClick={() => setMetric("volume")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              metric === "volume"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Volume Trend
          </button>
          <button
            type="button"
            onClick={() => setMetric("best_set")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              metric === "best_set"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Best Set Trend
          </button>
        </div>

        {/* Quick highlight stat chips */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Award className="h-3 w-3 text-amber-500" />
            Best: <strong className="text-foreground">{bestEverSet}</strong>
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:flex items-center gap-1">
            <Calendar className="h-3 w-3 text-emerald-500" />
            Sessions: <strong className="text-foreground">{totalSessions}</strong>
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      {chartData.length > 0 ? (
        <div className="h-56 sm:h-64 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="progressionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border) / 0.4)"
              />
              <XAxis
                dataKey="label"
                stroke="currentColor"
                className="stroke-muted-foreground/40 text-muted-foreground"
                tick={{ fontSize: 10, fill: "currentColor" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="currentColor"
                className="stroke-muted-foreground/40 text-muted-foreground"
                tick={{ fontSize: 10, fill: "currentColor" }}
                tickLine={false}
                axisLine={false}
                domain={[0, "dataMax + 10%"]}
                tickFormatter={(val) => (isTimer ? formatTimeSec(val) : String(val))}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="rounded-xl border border-border bg-popover/95 p-2.5 shadow-md text-xs backdrop-blur-sm space-y-1">
                      <p className="font-semibold text-foreground">{d.label}</p>
                      <p className="text-primary font-bold">
                        {metric === "volume" ? "Volume: " : "Best Set: "}
                        {d.metricLabel}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {d.setsCount} {d.setsCount === 1 ? "set" : "sets"} logged
                      </p>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#progressionGradient)"
                dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 1 }}
                activeDot={{ r: 5, fill: "hsl(var(--primary))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center text-xs text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border/70 p-4 text-center">
          No workout history logged for {activeExercise.name} in this date range.
        </div>
      )}
    </div>
  )
}
