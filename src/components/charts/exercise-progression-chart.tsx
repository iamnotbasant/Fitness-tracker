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

  // Categorize exercise: timer vs reps (no tonnage for bodyweight)
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6 shadow-sm space-y-5">
      {/* ─── Control Header: Exercise Selector & Reps Toggle ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight">Progression</h2>
          <p className="text-[11px] text-zinc-500 font-mono">
            {isTimer ? "Hold duration over time" : "Reps over time"}
          </p>
        </div>

        {/* Exercise Selector */}
        <select
          value={selectedId}
          onChange={(e) => {
            soundManager.play("click", 0.2)
            setSelectedId(e.target.value)
          }}
          className="w-full sm:w-56 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
        >
          {exerciseOptions.map((opt) => (
            <option key={opt.id} value={opt.id} className="bg-zinc-950 text-white">
              {opt.name} {opt.count > 0 ? `(${opt.count})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* ─── Reps Toggle Strip & Inline Stat ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Toggle: Max Reps per Set vs Total Reps */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              setMetric("max_reps")
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              metric === "max_reps"
                ? "bg-white text-black shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {isTimer ? "Max Hold" : "Max Reps / Set"}
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              setMetric("total_reps")
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              metric === "total_reps"
                ? "bg-white text-black shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {isTimer ? "Total Duration" : "Total Reps"}
          </button>
        </div>

        {/* Minimal Inline Stat */}
        <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
          <span>
            Best: <strong className="text-white">{bestDisplay}</strong>
          </span>
          <span className="text-zinc-600">·</span>
          <span>
            Sessions: <strong className="text-white">{totalSessions}</strong>
          </span>
        </div>
      </div>

      {/* ─── ONE White Line/Area Chart ─── */}
      {chartData.length > 0 ? (
        <div className="h-60 sm:h-64 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="whiteProgressionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255, 255, 255, 0.05)"
              />
              <XAxis
                dataKey="label"
                stroke="#71717a"
                tick={{ fontSize: 10, fill: "#71717a", fontFamily: "monospace" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#71717a"
                tick={{ fontSize: 10, fill: "#71717a", fontFamily: "monospace" }}
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
                      <p className="font-semibold text-white">{d.label}</p>
                      <p className="text-white font-mono font-bold">
                        {d.tooltipText}
                      </p>
                      <p className="text-[11px] text-zinc-500 font-mono">
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
                strokeWidth={2}
                fill="url(#whiteProgressionGradient)"
                dot={{ r: 3, fill: "#ffffff", strokeWidth: 1 }}
                activeDot={{ r: 5, fill: "#ffffff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-44 items-center justify-center text-xs text-zinc-500 bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800 p-4 text-center">
          No workout history logged for {activeExercise.name} in this date range.
        </div>
      )}
    </div>
  )
}
