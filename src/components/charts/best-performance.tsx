"use client"

import type { Workout } from "@/lib/types"

export function BestPerformance({
  workouts,
}: {
  workouts: Workout[]
}) {
  const best = new Map<string, { reps: number; volume: number }>()
  workouts.forEach((w) => {
    const cur = best.get(w.exerciseName) ?? { reps: 0, volume: 0 }
    best.set(w.exerciseName, {
      reps: Math.max(cur.reps, w.reps),
      volume: Math.max(cur.volume, w.volume || 0),
    })
  })

  const entries = Array.from(best.entries()).sort(([a], [b]) => (a < b ? -1 : 1))

  return (
    <div className="grid gap-2">
      {entries.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
      {entries.map(([name, v]) => (
        <div key={name} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
          <div>
            <div className="text-sm font-medium">{name}</div>
            <div className="text-xs text-muted-foreground">Best reps</div>
          </div>
          <div className="text-right">
            <div className="text-sm">{v.reps}</div>
            <div className="text-xs text-muted-foreground">Volume {v.volume}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
