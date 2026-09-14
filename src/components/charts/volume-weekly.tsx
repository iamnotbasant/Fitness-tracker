"use client"

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts"
import type { Workout } from "@/lib/types"

function weekKey(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00")
  const first = new Date(d.getFullYear(), 0, 1)
  const diff = Math.floor((d.getTime() - first.getTime()) / (1000 * 60 * 60 * 24))
  const week = Math.floor(diff / 7) + 1
  return `${d.getFullYear()}-W${week}`
}

function weekly(workouts: Workout[]) {
  const map = new Map<string, number>()
  workouts.forEach((w) => map.set(weekKey(w.date), (map.get(weekKey(w.date)) ?? 0) + (w.volume ?? 0)))
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([wk, volume]) => ({ week: wk.slice(-3), volume }))
}

export function VolumeWeekly({ workouts }: { workouts: Workout[] }) {
  const data = weekly(workouts)
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis hide />
          <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: any) => [`${v} vol`, "Volume"]} />
          <Line
            type="monotone"
            dataKey="volume"
            stroke="currentColor"
            className="text-primary"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
