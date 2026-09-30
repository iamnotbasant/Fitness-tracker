"use client"

import { useMemo } from "react"
import type { Workout } from "@/lib/types"
import { useExercises } from "@/hooks/use-local-data"

export const formatTime = (sec: number) => {
  if (!sec) return "0s"
  if (sec >= 60) {
    const mins = Math.floor(sec / 60)
    const rem = sec % 60
    return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`
  }
  return `${sec}s`
}

export function PersonalRecords({ workouts }: { workouts: Workout[] }) {
  const { exercises } = useExercises()

  const records = useMemo(() => {
    const timerExerciseNames = new Set(
      (exercises || [])
        .filter((e) => e.type === "timer")
        .map((e) => e.name.toLowerCase())
    )

    const exerciseMap = new Map<
      string,
      {
        name: string
        isTimer: boolean
        maxReps: number
        maxTimeSeconds: number
        maxWeight: number
        prDate: string
      }
    >()

    workouts.forEach((w) => {
      const exName = w.exerciseName || w.name || "Unknown Exercise"
      const lowerName = exName.toLowerCase()
      const isTimer = timerExerciseNames.has(lowerName) || Boolean(w.timeSeconds && w.timeSeconds > 0)

      const existing = exerciseMap.get(exName) || {
        name: exName,
        isTimer,
        maxReps: 0,
        maxTimeSeconds: 0,
        maxWeight: 0,
        prDate: w.date || "",
      }

      if (isTimer) existing.isTimer = true

      const reps = w.reps || 0
      const timeSeconds = w.timeSeconds || (isTimer && reps > 0 ? reps : 0)
      const weight = w.weight || 0

      if (isTimer) {
        if (timeSeconds > existing.maxTimeSeconds) {
          existing.prDate = w.date || existing.prDate
        }
        existing.maxTimeSeconds = Math.max(existing.maxTimeSeconds, timeSeconds)
      } else {
        if (reps > existing.maxReps || (reps === existing.maxReps && weight > existing.maxWeight)) {
          existing.prDate = w.date || existing.prDate
        }
        existing.maxReps = Math.max(existing.maxReps, reps)
        existing.maxWeight = Math.max(existing.maxWeight, weight)
      }

      exerciseMap.set(exName, existing)
    })

    const list = Array.from(exerciseMap.values()).map((r) => {
      let valueDisplay = ""
      if (r.isTimer) {
        valueDisplay = formatTime(r.maxTimeSeconds)
      } else {
        if (r.maxWeight > 0) {
          valueDisplay = `+${r.maxWeight}kg (${r.maxReps}r)`
        } else {
          valueDisplay = `${r.maxReps} reps`
        }
      }

      let dateDisplay = "—"
      if (r.prDate) {
        try {
          const [y, m, d] = r.prDate.slice(0, 10).split("-").map(Number)
          if (y && m && d) {
            dateDisplay = new Date(y, m - 1, d).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          }
        } catch {
          dateDisplay = r.prDate
        }
      }

      return {
        ...r,
        valueDisplay,
        dateDisplay,
      }
    })

    // Sort by recent PR date or reps
    return list.sort((a, b) => b.prDate.localeCompare(a.prDate))
  }, [workouts, exercises])

  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6 shadow-sm space-y-3">
        <div className="pb-2 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-white tracking-tight">Records</h2>
          <p className="text-[11px] text-zinc-500 font-mono">Personal bests</p>
        </div>
        <p className="text-xs text-zinc-500 py-3">No personal records logged yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6 shadow-sm space-y-4">
      <div className="pb-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-white tracking-tight">Records</h2>
        <p className="text-[11px] text-zinc-500 font-mono">Personal bests</p>
      </div>

      {/* Plain Minimal List: Exercise — Value — Date */}
      <div className="divide-y divide-zinc-800/80">
        {records.map((r) => (
          <div
            key={r.name}
            className="py-3 flex items-center justify-between text-xs gap-3 min-h-[44px]"
          >
            <span className="font-medium text-white truncate min-w-0">
              {r.name}
            </span>
            <div className="flex items-center gap-4 shrink-0 font-mono">
              <span className="font-bold text-white text-xs">
                {r.valueDisplay}
              </span>
              <span className="text-[11px] text-zinc-500 min-w-[70px] text-right">
                {r.dateDisplay}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}