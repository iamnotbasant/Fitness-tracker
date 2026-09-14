"use client"

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"
import type { Workout } from "@/lib/types"

function last7Data(workouts: Workout[]) {
  const map = new Map<string, number>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const k = d.toISOString().slice(0, 10)
    map.set(k, 0)
  }
  workouts.forEach((w) => {
    if (map.has(w.date)) map.set(w.date, (map.get(w.date) ?? 0) + (w.volume ?? 0))
  })
  return Array.from(map.entries()).map(([date, volume]) => ({
    date: date.slice(5),
    volume,
  }))
}

export function ActivityLast7({ workouts }: { workouts: Workout[] }) {
  const data = last7Data(workouts)
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            contentStyle={{ borderRadius: 8 }}
            formatter={(v: any) => [`${v} vol`, "Volume"]}
          />
          <Bar dataKey="volume" fill="currentColor" className="text-primary" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
