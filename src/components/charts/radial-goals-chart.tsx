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
import { AnimatedTarget, AnimatedFlame, AnimatedCheckmark } from "@/components/ui/animated-icons"

interface RadialGoalsChartProps {
  workouts: Workout[]
}

export function RadialGoalsChart({ workouts }: RadialGoalsChartProps) {
  const { chartData, totals, avgCompletion } = useMemo(() => {
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

    const avg = Math.round((pctWorkouts + pctSets + pctReps + pctPoints) / 4)

    // Recharts RadialBar expects outer rings to be at the end of the array
    const data = [
      {
        name: "Points Overload",
        value: pctPoints,
        actual: totalPoints,
        target: targetPoints,
        fill: "#ea384c", // DockOS coral/crimson
      },
      {
        name: "Reps Volume",
        value: pctReps,
        actual: totalReps,
        target: targetReps,
        fill: "#f97316", // orange
      },
      {
        name: "Total Sets",
        value: pctSets,
        actual: totalSets,
        target: targetSets,
        fill: "#eab308", // yellow/amber
      },
      {
        name: "Workouts Frequency",
        value: pctWorkouts,
        actual: totalWorkouts,
        target: targetWorkouts,
        fill: "#ffffff", // clean white
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
      avgCompletion: avg,
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
    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/40 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AnimatedTarget className="h-4.5 w-4.5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Weekly Goals & Targets
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            avgCompletion >= 100 
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" 
              : avgCompletion >= 60 
              ? "bg-primary/15 border-primary/30 text-primary" 
              : "bg-secondary border-border/60 text-muted-foreground"
          }`}>
            {avgCompletion >= 100 ? "Goal Crushed 🎉" : `${avgCompletion}% Complete`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Radial Chart */}
        <div className="md:col-span-6 h-64 w-full min-w-0 overflow-hidden relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="26%"
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
                background={{ fill: "#18181b" }}
                dataKey="value"
                cornerRadius={6}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          {/* Centered Ring Icon & % */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <AnimatedFlame className="h-6 w-6 text-primary mb-0.5" />
            <span className="text-base font-black text-foreground">
              {avgCompletion}%
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              Weekly
            </span>
          </div>
        </div>

        {/* Legend Cards with Mini Progress Bars */}
        <div className="md:col-span-6 space-y-2.5">
          {chartData
            .slice()
            .reverse()
            .map((item) => (
              <div
                key={item.name}
                className="p-3 rounded-xl border border-border/60 bg-secondary/30 text-xs space-y-2 hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: item.fill }}
                    />
                    <div>
                      <span className="font-semibold text-foreground block">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {item.actual.toLocaleString()} / {item.target.toLocaleString()} target
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black" style={{ color: item.fill }}>
                      {item.value}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.value}%`,
                      backgroundColor: item.fill,
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
