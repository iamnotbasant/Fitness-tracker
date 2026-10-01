"use client"

import React, { useMemo } from "react"
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
        .map((e) => e.name.toLowerCase().trim())
    )

    const exerciseMap = new Map<
      string,
      {
        name: string
        isTimer: boolean
        maxReps: number
        maxTimeSeconds: number
        maxWeight: number
      }
    >()

    workouts.forEach((w) => {
      const exName = (w.exerciseName || w.name || "").trim()
      if (!exName) return

      const lowerName = exName.toLowerCase()
      const isTimer =
        timerExerciseNames.has(lowerName) || Boolean(w.timeSeconds && w.timeSeconds > 0)

      const existing = exerciseMap.get(exName) || {
        name: exName,
        isTimer,
        maxReps: 0,
        maxTimeSeconds: 0,
        maxWeight: 0,
      }

      if (isTimer) existing.isTimer = true

      const reps = w.reps || 0
      const timeSeconds = w.timeSeconds || (isTimer && reps > 0 ? reps : 0)
      const weight = w.weight || 0

      if (isTimer) {
        existing.maxTimeSeconds = Math.max(existing.maxTimeSeconds, timeSeconds)
      } else {
        if (weight > existing.maxWeight) {
          existing.maxWeight = weight
          existing.maxReps = reps
        } else if (weight === existing.maxWeight) {
          existing.maxReps = Math.max(existing.maxReps, reps)
        }
      }

      exerciseMap.set(exName, existing)
    })

    const list: { name: string; valueDisplay: string }[] = []

    exerciseMap.forEach((r) => {
      let valueDisplay = ""
      if (r.isTimer) {
        if (r.maxTimeSeconds <= 0) return
        valueDisplay = formatTime(r.maxTimeSeconds)
      } else {
        if (r.maxReps <= 0 && r.maxWeight <= 0) return
        if (r.maxWeight > 0) {
          valueDisplay = r.maxReps > 0 ? `+${r.maxWeight} kg (${r.maxReps} reps)` : `+${r.maxWeight} kg`
        } else {
          valueDisplay = `${r.maxReps} reps`
        }
      }

      list.push({
        name: r.name,
        valueDisplay,
      })
    })

    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [workouts, exercises])

  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-850 bg-[#121316] p-5 text-center shadow-xs">
        <p className="text-xs text-zinc-500 font-body">No personal records logged yet</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-850 bg-[#121316] divide-y divide-zinc-800/60 px-4 sm:px-5 shadow-xs lg:grid lg:grid-cols-2 lg:divide-y-0 lg:gap-x-8">
      {records.map((r) => (
        <div
          key={r.name}
          className="flex items-center justify-between py-3 min-h-[44px] gap-3 lg:border-b lg:border-zinc-800/60"
        >
          <span className="text-sm font-medium text-zinc-300 font-body truncate">
            {r.name}
          </span>
          <span className="text-sm font-semibold text-white font-display tabular-nums shrink-0">
            {r.valueDisplay}
          </span>
        </div>
      ))}
    </div>
  )
}