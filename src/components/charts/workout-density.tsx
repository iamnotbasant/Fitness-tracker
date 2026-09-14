"use client"

import { useMemo } from "react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import type { Workout } from "@/lib/types"

export function WorkoutDensity({ workouts }: { workouts: Workout[] }) {
  const data = useMemo(() => {
    // Group by workout session (date + time)
    const sessions = new Map<string, { totalReps: number; totalMinutes: number; date: string }>()

    workouts.forEach((w) => {
      const sessionKey = `${w.date}-${w.time || "00:00"}`
      const existing = sessions.get(sessionKey) || { totalReps: 0, totalMinutes: 0, date: w.date }
      
      // Calculate reps for this exercise
      const reps = w.sets * w.reps
      // Estimate duration: if we have durationSeconds use it, otherwise estimate
      const minutes = w.durationSeconds ? w.durationSeconds / 60 : w.sets * 2 // 2 min per set estimate
      
      sessions.set(sessionKey, {
        totalReps: existing.totalReps + reps,
        totalMinutes: existing.totalMinutes + minutes,
        date: w.date,
      })
    })

    return Array.from(sessions.values())
      .map((s) => ({
        date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        density: s.totalMinutes > 0 ? Math.round((s.totalReps / s.totalMinutes) * 10) / 10 : 0,
        fullDate: s.date,
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate))
      .slice(-15) // Last 15 sessions
  }, [workouts])

  const avgDensity = useMemo(() => {
    if (data.length === 0) return 0
    return Math.round((data.reduce((sum, d) => sum + d.density, 0) / data.length) * 10) / 10
  }, [data])

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No workout data yet
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#000000' }} />
          <span className="text-muted-foreground">Reps/Min</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 border-t-2 border-dashed border-muted-foreground" />
          <span className="text-muted-foreground">Avg: {avgDensity}</span>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
            <defs>
              <linearGradient id="densityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4A4A4A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4A4A4A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#4A4A4A" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#333333',
                border: '1px solid #4A4A4A',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                color: '#FFFFFF',
              }}
              formatter={(value: any) => [`${value} reps/min`, "Density"]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="density"
              stroke="#000000"
              strokeWidth={2.5}
              fill="url(#densityGradient)"
              dot={{ fill: '#000000', r: 4, strokeWidth: 2, stroke: '#FFFFFF' }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#FFFFFF' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}