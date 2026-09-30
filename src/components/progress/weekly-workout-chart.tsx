"use client"

import React, { useMemo } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import {
  type AggregatedWorkoutSession,
  getMondayOfWeek,
  formatWeekLabel,
  toLocalDateStr,
} from "./workout-helpers"

interface WeeklyWorkoutChartProps {
  sessions: AggregatedWorkoutSession[]
}

export function WeeklyWorkoutChart({ sessions }: WeeklyWorkoutChartProps) {
  // Compute recent 7 Monday-start weeks
  const chartData = useMemo(() => {
    const now = new Date()
    const currentMonday = getMondayOfWeek(now)

    const weeks: {
      monday: Date
      label: string
      startStr: string
      endStr: string
      count: number
    }[] = []

    for (let i = 6; i >= 0; i--) {
      const m = new Date(currentMonday)
      m.setDate(m.getDate() - i * 7)

      const sunday = new Date(m)
      sunday.setDate(sunday.getDate() + 6)

      weeks.push({
        monday: m,
        label: formatWeekLabel(m),
        startStr: toLocalDateStr(m),
        endStr: toLocalDateStr(sunday),
        count: 0,
      })
    }

    // Count workout sessions falling within each week bucket
    sessions.forEach((s) => {
      const sDate = s.date.slice(0, 10)
      for (const w of weeks) {
        if (sDate >= w.startStr && sDate <= w.endStr) {
          w.count++
          break
        }
      }
    })

    return weeks
  }, [sessions])

  // Find max count to set a clean Y-axis domain
  const maxCount = useMemo(() => {
    const maxVal = Math.max(0, ...chartData.map((d) => d.count))
    return Math.max(4, Math.ceil(maxVal * 1.15))
  }, [chartData])

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Section Title */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight font-display">
            Workout times per week
          </h2>
          <p className="text-xs text-zinc-400 font-body mt-0.5">
            Weekly session frequency over past 7 weeks
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="w-full h-48 sm:h-52 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 8, left: -22, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#27272a"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "var(--font-body), sans-serif" }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#71717a", fontSize: 11, fontFamily: "var(--font-display), sans-serif" }}
              allowDecimals={false}
              domain={[0, maxCount]}
              tickCount={5}
            />
            <Tooltip
              cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 shadow-2xl text-xs space-y-0.5">
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
            <Bar
              dataKey="count"
              fill="#ffffff"
              radius={[5, 5, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
