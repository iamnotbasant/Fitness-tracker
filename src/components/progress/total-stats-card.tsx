"use client"

import React, { useMemo } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts"
import {
  type AggregatedWorkoutSession,
  getMondayOfWeek,
  formatWeekLabel,
  toLocalDateStr,
} from "./workout-helpers"

interface TotalStatsCardProps {
  sessions: AggregatedWorkoutSession[]
  allSessions?: AggregatedWorkoutSession[]
  className?: string
}

export function TotalStatsCard({ sessions, allSessions, className = "" }: TotalStatsCardProps) {
  // Stats calculation
  const workoutCount = sessions.length
  const totalTimeMin = sessions.reduce((acc, s) => acc + s.durationMin, 0)

  // Calculate weighted volume (kg) or total reps for unweighted
  const { totalWeightVolume, totalReps } = useMemo(() => {
    let weightVol = 0
    let reps = 0
    sessions.forEach((s) => {
      s.rawWorkouts.forEach((w) => {
        const wt = w.weight || 0
        const r = w.reps || 0
        const sets = Math.max(1, w.sets || 1)
        reps += r > 0 ? r * sets : sets
        if (wt > 0) {
          weightVol += wt * (r > 0 ? r : sets)
        } else if (w.volume && w.volume > 0) {
          weightVol += w.volume
        }
      })
    })
    return {
      totalWeightVolume: Math.round(weightVol),
      totalReps: reps,
    }
  }, [sessions])

  // Weekly bar chart (8 weeks like reference 01: 9 AUG ... 27 SEP)
  const chartSessions = allSessions || sessions
  const chartData = useMemo(() => {
    const now = new Date()
    const currentMonday = getMondayOfWeek(now)

    const weeks: {
      monday: Date
      label: string
      startStr: string
      endStr: string
      count: number
      isCurrent: boolean
    }[] = []

    for (let i = 7; i >= 0; i--) {
      const m = new Date(currentMonday)
      m.setDate(m.getDate() - i * 7)

      const sunday = new Date(m)
      sunday.setDate(sunday.getDate() + 6)

      weeks.push({
        monday: m,
        label: formatWeekLabel(m).toUpperCase(),
        startStr: toLocalDateStr(m),
        endStr: toLocalDateStr(sunday),
        count: 0,
        isCurrent: i === 0,
      })
    }

    // Count workout sessions falling within each week bucket
    chartSessions.forEach((s) => {
      const sDate = s.date.slice(0, 10)
      for (const w of weeks) {
        if (sDate >= w.startStr && sDate <= w.endStr) {
          w.count++
          break
        }
      }
    })

    return weeks
  }, [chartSessions])

  const maxCount = useMemo(() => {
    const maxVal = Math.max(0, ...chartData.map((d) => d.count))
    return Math.max(1, maxVal)
  }, [chartData])

  return (
    <div
      className={`rounded-3xl border border-zinc-800/90 bg-[#121316] p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-6 ${className}`}
    >
      {/* ─── Top Stats: Workout | Time(min) | Volume(kg) (Reference 01) ─── */}
      <div className="grid grid-cols-3 gap-2">
        {/* Workout */}
        <div className="min-w-0">
          <span className="text-xs text-zinc-400 font-medium block truncate">Workout</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#2563eb] font-display tabular-nums mt-1 block truncate">
            {workoutCount}
          </span>
        </div>

        {/* Time(min) */}
        <div className="min-w-0">
          <span className="text-xs text-zinc-400 font-medium block truncate">Time(min)</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#2563eb] font-display tabular-nums mt-1 block truncate">
            {totalTimeMin}
          </span>
        </div>

        {/* Volume(kg) or Total Reps */}
        <div className="min-w-0">
          <span className="text-xs text-zinc-400 font-medium block truncate">
            {totalWeightVolume > 0 ? "Volume (kg)" : "Total Reps"}
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#2563eb] font-display tabular-nums mt-1 block truncate">
            {totalWeightVolume > 0
              ? totalWeightVolume.toLocaleString()
              : totalReps.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ─── Workout times per week: Bar chart (Reference 01) ─── */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs sm:text-sm font-semibold text-zinc-300 font-display">
          Workout times per week
        </h3>

        <div className="w-full h-44 sm:h-48 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 4, left: -25, bottom: 0 }}
            >
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
                tick={{
                  fill: "#71717a",
                  fontSize: 9,
                  fontFamily: "var(--font-mono), monospace",
                }}
                dy={6}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#52525b", fontSize: 10 }}
                allowDecimals={false}
                domain={[0, maxCount]}
                tickCount={maxCount <= 2 ? 2 : 4}
              />
              <Tooltip
                cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 shadow-2xl text-xs space-y-0.5">
                        <span className="text-[11px] text-zinc-400 block font-body">
                          Week of {data.label}
                        </span>
                        <span className="text-white font-bold font-display tabular-nums text-sm">
                          {data.count} {data.count === 1 ? "workout" : "workouts"}
                        </span>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={22}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.count > 0 ? (entry.isCurrent ? "#2563eb" : "#3b82f6") : "#22242a"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
