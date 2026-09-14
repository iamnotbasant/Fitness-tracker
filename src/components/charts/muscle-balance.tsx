"use client"

import { useMemo, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts"
import type { Workout, Exercise } from "@/lib/types"

const SPLIT_COLORS: Record<string, string> = {
  push: "#38bdf8", // Sky blue
  pull: "#a855f7", // Purple
  legs: "#10b981", // Emerald
  core: "#f59e0b", // Amber
  arms: "#ec4899", // Pink
  other: "#94a3b8", // Slate
}

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  push: "Push (Chest/Delts)",
  pull: "Pull (Back/Lats)",
  legs: "Legs (Quads/Hams)",
  core: "Core & Abs",
  arms: "Arms",
  other: "Other / Cardio",
}

export function MuscleBalance({ workouts, exercises }: { workouts: Workout[]; exercises: Exercise[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const { data, totalPoints, topExerciseByGroup } = useMemo(() => {
    const splitPoints = new Map<string, number>()
    const exercisePoints = new Map<string, Map<string, number>>()

    workouts.forEach((w) => {
      const exercise = exercises.find((e) => e.id === w.exerciseId)
      const split = exercise?.split || "other"
      const points = w.points ?? w.total_points ?? 0

      // Track total points per split
      splitPoints.set(split, (splitPoints.get(split) || 0) + points)

      // Track points per exercise within each split
      if (!exercisePoints.has(split)) {
        exercisePoints.set(split, new Map())
      }
      const splitExercises = exercisePoints.get(split)!
      const exerciseName = exercise?.name || "Unknown"
      splitExercises.set(exerciseName, (splitExercises.get(exerciseName) || 0) + points)
    })

    const total = Array.from(splitPoints.values()).reduce((sum, v) => sum + v, 0)

    const chartData = Array.from(splitPoints.entries())
      .map(([name, value]) => ({
        name: MUSCLE_GROUP_LABELS[name] || name,
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0,
        originalName: name,
        color: SPLIT_COLORS[name] || SPLIT_COLORS.other,
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)

    // Top exercise per group
    const topExercises = new Map<string, string>()
    exercisePoints.forEach((exercises, split) => {
      const sorted = Array.from(exercises.entries()).sort((a, b) => b[1] - a[1])
      if (sorted.length > 0) {
        topExercises.set(split, sorted[0][0])
      }
    })

    return { data: chartData, totalPoints: total, topExerciseByGroup: topExercises }
  }, [workouts, exercises])

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground bg-secondary/20 rounded-2xl border border-dashed border-border/70">
        No workout data logged yet for muscle balance.
      </div>
    )
  }

  const hoveredData = hoveredIndex !== null ? data[hoveredIndex] : null

  return (
    <div className="w-full rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground">Muscular Balance Distribution</h3>
          <p className="text-xs text-muted-foreground">Volume and load ratio across major functional movement splits</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-secondary text-foreground self-start sm:self-auto">
          Total: {totalPoints.toLocaleString()} pts
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Donut Chart */}
        <div className="md:col-span-7 h-[300px] w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={78}
                outerRadius={112}
                paddingAngle={4}
                dataKey="value"
                onMouseEnter={(_, index) => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    opacity={hoveredIndex !== null && hoveredIndex !== index ? 0.4 : 1}
                    className="transition-all duration-200 cursor-pointer"
                    stroke="#0f172a"
                    strokeWidth={2}
                  />
                ))}
                <Label
                  position="center"
                  content={({ viewBox }) => {
                    const { cx, cy } = viewBox as any
                    return (
                      <g className="select-none">
                        <text
                          x={cx}
                          y={cy - 6}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="fill-foreground font-black text-2xl tracking-tight"
                        >
                          {hoveredData ? `${hoveredData.percentage}%` : `${totalPoints.toLocaleString()}`}
                        </text>
                        <text
                          x={cx}
                          y={cy + 16}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="fill-muted-foreground text-xs font-medium"
                        >
                          {hoveredData ? hoveredData.name.split(" ")[0] : "Total Points"}
                        </text>
                      </g>
                    )
                  }}
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend & Breakdown List */}
        <div className="md:col-span-5 space-y-2.5">
          {data.map((item, idx) => {
            const isHovered = hoveredIndex === idx
            const topEx = topExerciseByGroup.get(item.originalName)

            return (
              <div
                key={item.originalName}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isHovered
                    ? "bg-secondary/70 border-primary/50 shadow-md"
                    : "bg-secondary/30 border-border/50 hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-bold text-xs text-foreground truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-foreground">
                      {item.percentage}%
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      ({item.value.toLocaleString()} pts)
                    </span>
                  </div>
                </div>

                {topEx && (
                  <div className="text-[11px] text-muted-foreground pl-5 mt-1 truncate">
                    Top lift: <span className="text-foreground font-medium">{topEx}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}