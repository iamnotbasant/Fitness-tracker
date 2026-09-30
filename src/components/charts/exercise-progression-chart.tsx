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
import { TrendingUp, Dumbbell, Award, Calendar, AlertCircle, CheckCircle } from "lucide-react"

interface ExerciseProgressionChartProps {
  workouts: Workout[]
  exercises: Exercise[]
}

type BodyweightMetric = "max_reps" | "total_reps"
type WeightedMetric = "e1rm" | "max_weight" | "total_reps"
type TimerMetric = "max_time" | "total_time"

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
  // Exercise catalog sorted by log frequency
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
    if (list.length === 0 && exercises.length > 0) {
      return exercises.map((e) => ({ id: String(e.id), name: e.name, count: 0 }))
    }
    return list
  }, [workouts, exercises])

  const [selectedId, setSelectedId] = useState<string>("")
  const [selectedMetric, setSelectedMetric] = useState<string>("default")

  useEffect(() => {
    if (exerciseOptions.length > 0) {
      if (!selectedId || !exerciseOptions.some((e) => e.id === selectedId)) {
        setSelectedId(exerciseOptions[0].id)
      }
    }
  }, [exerciseOptions, selectedId])

  const activeExercise = useMemo(() => {
    return (
      exerciseOptions.find((e) => e.id === selectedId) ||
      exerciseOptions[0] || { id: "", name: "Exercise", count: 0 }
    )
  }, [exerciseOptions, selectedId])

  // Categorize exercise: timer, weighted, or bodyweight
  const exerciseTypeInfo = useMemo(() => {
    const exObj = exercises.find(
      (e) => String(e.id) === selectedId || e.name.toLowerCase() === activeExercise.name.toLowerCase()
    )

    const matchingWorkouts = workouts.filter(
      (w) =>
        String(w.exerciseId) === selectedId ||
        (w.exerciseName && w.exerciseName.toLowerCase() === activeExercise.name.toLowerCase())
    )

    const isTimer =
      exObj?.type === "timer" ||
      matchingWorkouts.some((w) => (w.timeSeconds || 0) > 0 && (!w.reps || w.reps === 0))

    const isWeighted =
      !isTimer &&
      matchingWorkouts.some((w) => (w.weight || 0) > 0)

    return {
      isTimer,
      isWeighted,
      isBodyweight: !isTimer && !isWeighted,
      matchingWorkouts,
    }
  }, [exercises, selectedId, activeExercise.name, workouts])

  // Build Time Series Data & Detect Plateaus
  const { chartData, bestDisplay, averageDisplay, totalSessions, plateauStatus } = useMemo(() => {
    const { isTimer, isWeighted, isBodyweight, matchingWorkouts } = exerciseTypeInfo

    if (matchingWorkouts.length === 0) {
      return {
        chartData: [],
        bestDisplay: "—",
        averageDisplay: "—",
        totalSessions: 0,
        plateauStatus: null,
      }
    }

    // Group workouts by date
    const byDate = new Map<
      string,
      {
        date: string
        maxReps: number
        totalReps: number
        maxWeight: number
        maxTime: number
        totalTime: number
        bestE1RM: number
        setsCount: number
      }
    >()

    matchingWorkouts.forEach((w) => {
      const dateStr = (w.date || "").slice(0, 10)
      if (!dateStr) return

      const existing = byDate.get(dateStr) || {
        date: dateStr,
        maxReps: 0,
        totalReps: 0,
        maxWeight: 0,
        maxTime: 0,
        totalTime: 0,
        bestE1RM: 0,
        setsCount: 0,
      }

      const sets = Math.max(1, w.sets || 1)
      const reps = w.reps || 0
      const time = w.timeSeconds || 0
      const weight = w.weight || 0
      const e1rm = weight > 0 && reps > 0 ? Math.round(weight * (1 + reps / 30)) : 0

      existing.maxReps = Math.max(existing.maxReps, reps)
      existing.totalReps += reps * sets || reps
      existing.maxWeight = Math.max(existing.maxWeight, weight)
      existing.maxTime = Math.max(existing.maxTime, time)
      existing.totalTime += time * sets || time
      existing.bestE1RM = Math.max(existing.bestE1RM, e1rm)
      existing.setsCount += sets

      byDate.set(dateStr, existing)
    })

    const sortedSessions = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))

    // Determine active metric key
    let effectiveMetric = selectedMetric
    if (effectiveMetric === "default") {
      effectiveMetric = isTimer ? "max_time" : isWeighted ? "e1rm" : "max_reps"
    }

    let allTimeBest = 0
    let bestSetString = "—"
    let sumMetric = 0

    const data = sortedSessions.map((session) => {
      const d = new Date(session.date + "T00:00:00")
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })

      let value = 0
      let tooltipText = ""

      if (isTimer) {
        if (effectiveMetric === "total_time") {
          value = session.totalTime
          tooltipText = `Total: ${formatTimeSec(session.totalTime)}`
        } else {
          value = session.maxTime
          tooltipText = `Best Hold: ${formatTimeSec(session.maxTime)}`
        }
      } else if (isWeighted) {
        if (effectiveMetric === "max_weight") {
          value = session.maxWeight
          tooltipText = `Max Weight: +${session.maxWeight} kg`
        } else if (effectiveMetric === "total_reps") {
          value = session.totalReps
          tooltipText = `Total: ${session.totalReps} reps`
        } else {
          // e1RM default
          value = session.bestE1RM > 0 ? session.bestE1RM : session.maxReps
          tooltipText = session.bestE1RM > 0 ? `e1RM: ~${session.bestE1RM} kg` : `${session.maxReps} reps`
        }
      } else {
        // Bodyweight unweighted: reps-first, NO tonnage!
        if (effectiveMetric === "total_reps") {
          value = session.totalReps
          tooltipText = `Total Reps: ${session.totalReps}`
        } else {
          // max_reps default
          value = session.maxReps
          tooltipText = `Best Set: ${session.maxReps} reps`
        }
      }

      sumMetric += value
      if (value > allTimeBest) {
        allTimeBest = value
        bestSetString = isTimer
          ? formatTimeSec(value)
          : isWeighted && effectiveMetric === "e1rm"
          ? `~${value} kg`
          : isWeighted && effectiveMetric === "max_weight"
          ? `+${value} kg`
          : `${value} reps`
      }

      return {
        date: session.date,
        label,
        value,
        tooltipText,
        setsCount: session.setsCount,
      }
    })

    const avgVal = data.length > 0 ? Math.round(sumMetric / data.length) : 0
    const avgString = isTimer
      ? formatTimeSec(avgVal)
      : isWeighted && effectiveMetric !== "total_reps"
      ? `${avgVal} kg`
      : `${avgVal} reps`

    // Plateau Detection: analyze the last 4 recorded sessions
    let plateau: { type: "plateau" | "progressing" | "deload"; text: string } | null = null
    if (data.length >= 4) {
      const last4 = data.slice(-4).map((d) => d.value)
      const firstOf4 = last4[0]
      const lastOf4 = last4[3]

      if (lastOf4 === firstOf4 && last4.every((v) => v === firstOf4)) {
        plateau = {
          type: "plateau",
          text: `Plateau detected: Consistent at ${firstOf4} ${isTimer ? "sec" : "reps"} over last 4 sessions. Consider varying tempo, adjusting leverage, or taking a recovery week.`,
        }
      } else if (lastOf4 > firstOf4) {
        plateau = {
          type: "progressing",
          text: `Progression on track: +${lastOf4 - firstOf4} ${isTimer ? "sec" : "reps"} over the last 4 sessions!`,
        }
      }
    }

    return {
      chartData: data,
      bestDisplay: bestSetString,
      averageDisplay: avgString,
      totalSessions: data.length,
      plateauStatus: plateau,
    }
  }, [exerciseTypeInfo, selectedMetric])

  const { isTimer, isWeighted, isBodyweight } = exerciseTypeInfo

  return (
    <div className="rounded-3xl border border-border/60 bg-[#121318] p-4 sm:p-6 shadow-sm space-y-4">
      {/* Top Header & Exercise Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">Per-Exercise Progression</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/40">
                {isBodyweight ? "Bodyweight (Reps)" : isWeighted ? "Weighted Calisthenics" : "Hold Timer"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isBodyweight
                ? "Rep-progression over time (unweighted calisthenics overload)"
                : isWeighted
                ? "Estimated 1RM and added load progression"
                : "Isometric duration progression"}
            </p>
          </div>
        </div>

        {/* Exercise Dropdown */}
        <div className="w-full sm:w-auto">
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value)
              setSelectedMetric("default")
            }}
            className="w-full sm:w-56 px-3 py-1.5 rounded-xl bg-[#181920] border border-border/60 text-xs font-semibold text-foreground focus:outline-none focus:border-primary/60 cursor-pointer"
          >
            {exerciseOptions.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-popover text-foreground">
                {opt.name} {opt.count > 0 ? `(${opt.count} logs)` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric Mode Pill Buttons & Summary Stat Chips */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        {/* Metric Segmented Control */}
        <div className="flex items-center gap-1 bg-[#181920] p-1 rounded-xl border border-border/50">
          {isBodyweight && (
            <>
              <button
                type="button"
                onClick={() => setSelectedMetric("max_reps")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedMetric === "default" || selectedMetric === "max_reps"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Max Reps / Set
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetric("total_reps")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedMetric === "total_reps"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Total Reps
              </button>
            </>
          )}

          {isWeighted && (
            <>
              <button
                type="button"
                onClick={() => setSelectedMetric("e1rm")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedMetric === "default" || selectedMetric === "e1rm"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Estimated 1RM
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetric("max_weight")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedMetric === "max_weight"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Max Added Weight
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetric("total_reps")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedMetric === "total_reps"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Total Reps
              </button>
            </>
          )}

          {isTimer && (
            <>
              <button
                type="button"
                onClick={() => setSelectedMetric("max_time")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedMetric === "default" || selectedMetric === "max_time"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Best Hold
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetric("total_time")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedMetric === "total_time"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Total Duration
              </button>
            </>
          )}
        </div>

        {/* Stats Summary Chips */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          <span className="flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-amber-500" />
            Best: <strong className="text-foreground">{bestDisplay}</strong>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            Avg: <strong className="text-foreground">{averageDisplay}</strong>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-500" />
            Sessions: <strong className="text-foreground">{totalSessions}</strong>
          </span>
        </div>
      </div>

      {/* Plateau / Progression Flag Alert */}
      {plateauStatus && (
        <div
          className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 ${
            plateauStatus.type === "plateau"
              ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
          }`}
        >
          {plateauStatus.type === "plateau" ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="leading-snug">{plateauStatus.text}</span>
        </div>
      )}

      {/* Recharts Area Line Chart */}
      {chartData.length > 0 ? (
        <div className="h-60 sm:h-64 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="calisthenicsProgressionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255, 255, 255, 0.06)"
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
                domain={[0, "dataMax + 2"]}
                tickFormatter={(val) => (isTimer ? formatTimeSec(val) : String(val))}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="rounded-xl border border-border bg-[#14151b] p-2.5 shadow-md text-xs backdrop-blur-sm space-y-1">
                      <p className="font-semibold text-foreground">{d.label}</p>
                      <p className="text-primary font-bold font-mono">
                        {d.tooltipText}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
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
                strokeWidth={2.5}
                fill="url(#calisthenicsProgressionGradient)"
                dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 1 }}
                activeDot={{ r: 5, fill: "hsl(var(--primary))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center text-xs text-muted-foreground bg-secondary/15 rounded-2xl border border-dashed border-border/70 p-4 text-center">
          No workout history logged for {activeExercise.name} in this date range.
        </div>
      )}
    </div>
  )
}
