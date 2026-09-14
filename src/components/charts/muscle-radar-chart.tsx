"use client"

import { useMemo } from "react"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import type { Workout, Exercise } from "@/lib/types"
import { Target, Activity } from "lucide-react"

interface MuscleRadarChartProps {
  workouts: Workout[]
  exercises: Exercise[]
}

export function MuscleRadarChart({ workouts, exercises }: MuscleRadarChartProps) {
  const radarData = useMemo(() => {
    // Categories: Push, Pull, Legs, Core, Arms, Shoulders
    const categories: Record<string, { totalPoints: number; sets: number; target: number }> = {
      Push: { totalPoints: 0, sets: 0, target: 100 },
      Pull: { totalPoints: 0, sets: 0, target: 100 },
      Legs: { totalPoints: 0, sets: 0, target: 100 },
      Core: { totalPoints: 0, sets: 0, target: 80 },
      Arms: { totalPoints: 0, sets: 0, target: 70 },
      Shoulders: { totalPoints: 0, sets: 0, target: 70 },
    }

    const exMap = new Map<string, Exercise>()
    exercises.forEach((e) => exMap.set(String(e.id), e))

    workouts.forEach((w) => {
      const ex = exMap.get(String(w.exerciseId))
      const split = ex?.split?.toLowerCase() || ""
      const bodyParts = (ex?.bodyParts || []).map((bp) => bp.toLowerCase())
      const points = w.points ?? w.total_points ?? 0

      // Categorize into categories
      if (split === "push" || bodyParts.some((p) => p.includes("chest"))) {
        categories.Push.totalPoints += points
        categories.Push.sets += 1
      }
      if (split === "pull" || bodyParts.some((p) => p.includes("lat") || p.includes("back"))) {
        categories.Pull.totalPoints += points
        categories.Pull.sets += 1
      }
      if (split === "legs" || bodyParts.some((p) => p.includes("quad") || p.includes("hamstring") || p.includes("glute") || p.includes("calv"))) {
        categories.Legs.totalPoints += points
        categories.Legs.sets += 1
      }
      if (split === "core" || bodyParts.some((p) => p.includes("core") || p.includes("abs") || p.includes("oblique"))) {
        categories.Core.totalPoints += points
        categories.Core.sets += 1
      }
      if (bodyParts.some((p) => p.includes("bicep") || p.includes("tricep") || p.includes("forearm"))) {
        categories.Arms.totalPoints += points
        categories.Arms.sets += 1
      }
      if (bodyParts.some((p) => p.includes("shoulder") || p.includes("delt"))) {
        categories.Shoulders.totalPoints += points
        categories.Shoulders.sets += 1
      }
    })

    // Find max points for normalization
    const maxActual = Math.max(
      ...Object.values(categories).map((c) => c.totalPoints),
      100
    )

    return Object.entries(categories).map(([subject, data]) => ({
      subject,
      points: data.totalPoints,
      sets: data.sets,
      normalized: Math.round((data.totalPoints / maxActual) * 100),
      target: 80, // balanced benchmark baseline
    }))
  }, [workouts, exercises])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-xl border border-border bg-popover/95 p-3 shadow-xl backdrop-blur-md text-xs">
          <p className="font-bold text-sm text-foreground mb-1">{data.subject}</p>
          <div className="space-y-1 text-muted-foreground">
            <div className="flex justify-between gap-4">
              <span>Actual Points:</span>
              <span className="font-semibold text-primary">{data.points.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Total Sets:</span>
              <span className="font-semibold text-foreground">{data.sets}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Split Score:</span>
              <span className="font-semibold text-sky-400">{data.normalized}%</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between pb-2 border-b border-border mb-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Activity className="h-4 w-4 text-sky-400" />
            Split Balance
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            <span className="text-muted-foreground">Your Output</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
            <span className="text-muted-foreground">Optimal Target</span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            <PolarGrid stroke="#334155" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: "#64748b", fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Target Baseline */}
            <Radar
              name="Optimal Target"
              dataKey="target"
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="#10b981"
              fillOpacity={0.08}
            />
            {/* User Actual Balance */}
            <Radar
              name="Your Score"
              dataKey="normalized"
              stroke="#38bdf8"
              strokeWidth={2}
              fill="#0ea5e9"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
