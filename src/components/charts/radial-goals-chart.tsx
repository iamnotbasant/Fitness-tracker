"use client"

import { useMemo } from "react"
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
  Tooltip,
} from "recharts"
import type { Workout } from "@/lib/types"
import { Target, Flame, Dumbbell, Zap } from "lucide-react"

interface RadialGoalsChartProps {
  workouts: Workout[]
}

export function RadialGoalsChart({ workouts }: RadialGoalsChartProps) {
  const { chartData, totals } = useMemo(() => {
    // Calculate stats from workouts
    const totalWorkouts = workouts.length
    const totalSets = workouts.reduce((acc, w) => acc + (w.sets || 1), 0)
    const totalReps = workouts.reduce((acc, w) => acc + (w.reps || 0), 0)
    const totalPoints = workouts.reduce(
      (acc, w) => acc + (w.points ?? w.total_points ?? 0),
      0
    )

    // Benchmark targets
    const targetWorkouts = 5
    const targetSets = 25
    const targetReps = 300
    const targetPoints = 1200

    const pctWorkouts = Math.min(Math.round((totalWorkouts / targetWorkouts) * 100), 100)
    const pctSets = Math.min(Math.round((totalSets / targetSets) * 100), 100)
    const pctReps = Math.min(Math.round((totalReps / targetReps) * 100), 100)
    const pctPoints = Math.min(Math.round((totalPoints / targetPoints) * 100), 100)

    // Recharts RadialBar expects outer rings to be at the end of the array
    const data = [
      {
        name: "Points Overload",
        value: pctPoints,
        actual: totalPoints,
        target: targetPoints,
        fill: "#f43f5e", // rose
      },
      {
        name: "Reps Volume",
        value: pctReps,
        actual: totalReps,
        target: targetReps,
        fill: "#f59e0b", // amber
      },
      {
        name: "Total Sets",
        value: pctSets,
        actual: totalSets,
        target: targetSets,
        fill: "#10b981", // emerald
      },
      {
        name: "Workouts Frequency",
        value: pctWorkouts,
        actual: totalWorkouts,
        target: targetWorkouts,
        fill: "#0ea5e9", // sky blue
      },
    ]

    return {
      chartData: data,
      totals: {
        workouts: totalWorkouts,
        sets: totalSets,
        reps: totalReps,
        points: totalPoints,
      },
    }
  }, [workouts])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-xl border border-border bg-popover/95 p-3 shadow-xl backdrop-blur-md text-xs">
          <p className="font-semibold text-foreground mb-1">{data.name}</p>
          <div className="space-y-1 text-muted-foreground">
            <div className="flex justify-between gap-4">
              <span>Progress:</span>
              <span className="font-bold text-foreground">{data.value}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Completed:</span>
              <span className="font-semibold" style={{ color: data.fill }}>
                {data.actual.toLocaleString()} / {data.target.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Target className="h-4 w-4 text-primary" />
            Weekly Goals
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Radial Chart */}
        <div className="md:col-span-6 h-64 w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="25%"
              outerRadius="95%"
              barSize={12}
              data={chartData}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <RadialBar
                background={{ fill: "#141417" }}
                dataKey="value"
                cornerRadius={6}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          {/* Centered Ring Icon */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <Flame className="h-6 w-6 text-primary animate-pulse" />
            <span className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">
              Goals
            </span>
          </div>
        </div>

        {/* Legend Cards */}
        <div className="md:col-span-6 space-y-2.5">
          {chartData
            .slice()
            .reverse()
            .map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-secondary/30 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: item.fill }}
                  />
                  <div>
                    <span className="font-semibold text-foreground block">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {item.actual.toLocaleString()} of {item.target.toLocaleString()} target
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold" style={{ color: item.fill }}>
                    {item.value}%
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
