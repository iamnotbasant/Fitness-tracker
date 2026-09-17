"use client"

import { useMemo, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Flame, Dumbbell, Trophy } from "lucide-react"
import type { Workout } from "@/lib/types"

interface StrengthProgressionChartProps {
  workouts: Workout[]
}

type LiftType = "bench" | "squat" | "deadlift"

interface LiftMeta {
  key: LiftType
  name: string
  color: string
  keywords: string[]
}

const LIFTS: LiftMeta[] = [
  {
    key: "bench",
    name: "Bench Press",
    color: "var(--primary, #10b981)",
    keywords: ["bench", "chest press", "dumbbell bench", "incline bench"],
  },
  {
    key: "squat",
    name: "Squat",
    color: "#f59e0b",
    keywords: ["squat", "leg press", "hack squat", "front squat"],
  },
  {
    key: "deadlift",
    name: "Deadlift",
    color: "#8b5cf6",
    keywords: ["deadlift", "rdl", "romanian deadlift", "sumo deadlift"],
  },
]

// Epley Formula for 1RM: Weight * (1 + Reps / 30)
function calculate1RM(weight: number, reps: number): number {
  if (!weight || weight <= 0) return 0
  if (!reps || reps <= 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

export function StrengthProgressionChart({ workouts }: StrengthProgressionChartProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | LiftType>("all")

  // Match workouts to Big 3 lifts and calculate estimated 1RM
  const { chartData, currentMaxes, big3Total } = useMemo(() => {
    const datesMap: Record<string, { date: string; bench?: number; squat?: number; deadlift?: number }> = {}
    const maxMap: Record<LiftType, number> = { bench: 0, squat: 0, deadlift: 0 }

    // Sort chronologically
    const sortedWorkouts = [...workouts].sort((a, b) => (a.date || "").localeCompare(b.date || ""))

    sortedWorkouts.forEach((w) => {
      const exerciseName = (w.exerciseName || "").toLowerCase()
      const weight = Number(w.weight) || 0
      const reps = Number(w.reps) || 0
      const dateStr = (w.date || "").slice(0, 10)

      if (!dateStr || weight <= 0) return

      for (const lift of LIFTS) {
        const isMatch = lift.keywords.some((kw) => exerciseName.includes(kw))
        if (isMatch) {
          const est1RM = calculate1RM(weight, reps)
          if (est1RM > 0) {
            if (!datesMap[dateStr]) {
              datesMap[dateStr] = { date: dateStr }
            }
            const currentDayMax = datesMap[dateStr][lift.key] || 0
            if (est1RM > currentDayMax) {
              datesMap[dateStr][lift.key] = est1RM
            }
            if (est1RM > maxMap[lift.key]) {
              maxMap[lift.key] = est1RM
            }
          }
          break
        }
      }
    })

    const chartData = Object.values(datesMap).sort((a, b) => a.date.localeCompare(b.date))
    const big3Total = maxMap.bench + maxMap.squat + maxMap.deadlift

    return { chartData, currentMaxes: maxMap, big3Total }
  }, [workouts])

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-6 text-center space-y-3">
        <div className="mx-auto h-10 w-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
          <Dumbbell className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-semibold text-sm text-foreground">Big 3 Strength Progression</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Log sets with weight for Bench Press, Squat, or Deadlift to track your estimated 1-Rep Max.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-5">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Big 3 Lifts (Estimated 1RM)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Strength timeline computed via Epley formula
          </p>
        </div>

        {/* Lift Selector Pills */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/50 text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
              activeFilter === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Lifts
          </button>
          {LIFTS.map((lift) => (
            <button
              key={lift.key}
              type="button"
              onClick={() => setActiveFilter(lift.key)}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                activeFilter === lift.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lift.name}
            </button>
          ))}
        </div>
      </div>

      {/* Top PR Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl border border-border/50 bg-muted/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bench 1RM</div>
          <div className="text-base font-black text-foreground mt-0.5 font-mono">
            {currentMaxes.bench > 0 ? `${currentMaxes.bench} kg` : "-"}
          </div>
        </div>
        <div className="p-3 rounded-xl border border-border/50 bg-muted/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Squat 1RM</div>
          <div className="text-base font-black text-foreground mt-0.5 font-mono">
            {currentMaxes.squat > 0 ? `${currentMaxes.squat} kg` : "-"}
          </div>
        </div>
        <div className="p-3 rounded-xl border border-border/50 bg-muted/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Deadlift 1RM</div>
          <div className="text-base font-black text-foreground mt-0.5 font-mono">
            {currentMaxes.deadlift > 0 ? `${currentMaxes.deadlift} kg` : "-"}
          </div>
        </div>
        <div className="p-3 rounded-xl border border-primary/20 bg-primary/10">
          <div className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            Big 3 Total
          </div>
          <div className="text-base font-black text-primary mt-0.5 font-mono">
            {big3Total > 0 ? `${Math.round(big3Total)} kg` : "-"}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full min-w-0 overflow-hidden pt-2">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => {
                const parts = val.split("-")
                return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : val
              }}
            />
            <YAxis
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={["dataMin - 5", "dataMax + 10"]}
              unit="kg"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                return (
                  <div className="rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1.5">
                    <div className="font-semibold text-muted-foreground border-b border-border/50 pb-1">
                      {label}
                    </div>
                    {payload.map((entry: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-3">
                        <span className="font-medium" style={{ color: entry.color }}>
                          {entry.name}:
                        </span>
                        <span className="font-bold text-foreground font-mono">{entry.value} kg</span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
              iconType="circle"
              iconSize={8}
            />

            {(activeFilter === "all" || activeFilter === "bench") && (
              <Line
                type="monotone"
                dataKey="bench"
                name="Bench Press"
                stroke="var(--primary, #10b981)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--primary, #10b981)" }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
            {(activeFilter === "all" || activeFilter === "squat") && (
              <Line
                type="monotone"
                dataKey="squat"
                name="Squat"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#f59e0b" }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
            {(activeFilter === "all" || activeFilter === "deadlift") && (
              <Line
                type="monotone"
                dataKey="deadlift"
                name="Deadlift"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#8b5cf6" }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
