"use client"

import { useMemo, useState, useEffect } from "react"
import type { Workout, Exercise } from "@/lib/types"
import { TrendingUp } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import soundManager from "@/lib/sounds"

interface ExerciseProgressionChartProps {
  workouts: Workout[]
  exercises: Exercise[]
}

type RepsMetric = "max_reps" | "total_reps"

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
  const [metric, setMetric] = useState<RepsMetric>("max_reps")

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

  // Categorize exercise: timer vs reps
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

    return {
      isTimer,
      matchingWorkouts,
    }
  }, [exercises, selectedId, activeExercise.name, workouts])

  // Build Time Series Data
  const { chartData, bestDisplay, totalSessions } = useMemo(() => {
    const { isTimer, matchingWorkouts } = exerciseTypeInfo

    if (matchingWorkouts.length === 0) {
      return {
        chartData: [],
        bestDisplay: "—",
        totalSessions: 0,
      }
    }

    // Group workouts by date
    const byDate = new Map<
      string,
      {
        date: string
        maxReps: number
        totalReps: number
        maxTime: number
        totalTime: number
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
        maxTime: 0,
        totalTime: 0,
        setsCount: 0,
      }

      const sets = Math.max(1, w.sets || 1)
      const reps = w.reps || 0
      const time = w.timeSeconds || 0

      existing.maxReps = Math.max(existing.maxReps, reps)
      existing.totalReps += reps * sets || reps
      existing.maxTime = Math.max(existing.maxTime, time)
      existing.totalTime += time * sets || time
      existing.setsCount += sets

      byDate.set(dateStr, existing)
    })

    const sortedSessions = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))

    let maxVal = 0

    const data = sortedSessions.map((session) => {
      const d = new Date(session.date + "T00:00:00")
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })

      let value = 0
      let tooltipText = ""

      if (isTimer) {
        if (metric === "total_reps") {
          value = session.totalTime
          tooltipText = `Total: ${formatTimeSec(session.totalTime)}`
        } else {
          value = session.maxTime
          tooltipText = `Best Hold: ${formatTimeSec(session.maxTime)}`
        }
      } else {
        if (metric === "total_reps") {
          value = session.totalReps
          tooltipText = `Total: ${session.totalReps} reps`
        } else {
          value = session.maxReps
          tooltipText = `Max Set: ${session.maxReps} reps`
        }
      }

      if (value > maxVal) maxVal = value

      return {
        date: session.date,
        label,
        value,
        tooltipText,
        setsCount: session.setsCount,
      }
    })

    const bestFormatted = isTimer
      ? formatTimeSec(maxVal)
      : `${maxVal} reps`

    return {
      chartData: data,
      bestDisplay: bestFormatted,
      totalSessions: sortedSessions.length,
    }
  }, [exerciseTypeInfo, metric])

  const { isTimer } = exerciseTypeInfo

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6 shadow-sm space-y-5">
      {/* ─── Section Header (Monochrome Icon + Title) & Exercise Selector ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-white">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight font-display">Progression</h2>
            <p className="text-xs text-zinc-400 font-body">
              {isTimer ? "Hold duration trajectory" : "Repetition volume & set progression"}
            </p>
          </div>
        </div>

        {/* Exercise Selector (Tap >= 44px) */}
        <select
          value={selectedId}
          onChange={(e) => {
            soundManager.play("click", 0.2)
            setSelectedId(e.target.value)
          }}
          className="w-full sm:w-60 h-11 min-h-[44px] px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold text-white focus:outline-none focus:border-white cursor-pointer"
        >
          {exerciseOptions.map((opt) => (
            <option key={opt.id} value={opt.id} className="bg-zinc-900 text-white">
              {opt.name} {opt.count > 0 ? `(${opt.count})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* ─── Hero Metric: Best Performance & Metric Toggle Strip ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
        <div>
          <span className="text-[11px] font-body uppercase tracking-wider text-zinc-400 block mb-1">
            Best Performance
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-display tabular-nums">
              {bestDisplay}
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-body mt-1">
            Personal best for <strong className="text-zinc-200 font-medium">{activeExercise.name}</strong> · <span className="font-display font-semibold tabular-nums text-zinc-300">{totalSessions}</span> sessions logged
          </p>
        </div>

        {/* Toggle: Max Reps per Set vs Total Reps (Tap >= 44px) */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto min-h-[44px]">
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              setMetric("max_reps")
            }}
            className={`h-9 px-3.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
              metric === "max_reps"
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {isTimer ? "Max Hold" : "Max Set"}
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              setMetric("total_reps")
            }}
            className={`h-9 px-3.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
              metric === "total_reps"
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {isTimer ? "Total Time" : "Total Reps"}
          </button>
        </div>
      </div>

      {/* ─── Pure White Line/Area Chart ─── */}
      {chartData.length > 0 ? (
        <div className="h-60 sm:h-64 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="whiteProgressionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255, 255, 255, 0.07)"
              />
              <XAxis
                dataKey="label"
                stroke="#52525b"
                interval="preserveStartEnd"
                minTickGap={20}
                tick={{ fontSize: 10, fill: "#71717a", fontFamily: "var(--font-body), sans-serif" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#52525b"
                tick={{ fontSize: 10, fill: "#71717a", fontFamily: "var(--font-display), Space Grotesk, sans-serif" }}
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
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 shadow-xl text-xs space-y-1">
                      <p className="font-semibold text-white font-body">{d.label}</p>
                      <p className="text-white font-display font-bold tabular-nums">
                        {d.tooltipText}
                      </p>
                      <p className="text-[11px] text-zinc-500 font-body">
                        {d.setsCount} {d.setsCount === 1 ? "set" : "sets"} logged
                      </p>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2.5}
                fill="url(#whiteProgressionGradient)"
                dot={{ r: 3.5, fill: "#ffffff", strokeWidth: 1, stroke: "#18181b" }}
                activeDot={{ r: 5.5, fill: "#ffffff", stroke: "#000000", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-44 items-center justify-center text-xs text-zinc-500 bg-zinc-950/50 rounded-xl border border-dashed border-zinc-800 p-4 text-center font-body">
          No workout history logged for {activeExercise.name} in this date range.
        </div>
      )}
    </div>
  )
}
