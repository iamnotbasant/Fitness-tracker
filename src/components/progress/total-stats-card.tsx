"use client"

import React from "react"
import type { AggregatedWorkoutSession } from "./workout-helpers"

interface TotalStatsCardProps {
  sessions: AggregatedWorkoutSession[]
}

export function TotalStatsCard({ sessions }: TotalStatsCardProps) {
  const workoutCount = sessions.length
  const totalTimeMin = sessions.reduce((acc, s) => acc + s.durationMin, 0)
  const totalReps = sessions.reduce((acc, s) => acc + s.totalReps, 0)

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 shadow-xs">
      <div className="grid grid-cols-3 divide-x divide-zinc-800">
        {/* Column 1: Workouts */}
        <div className="px-2 sm:px-4 py-1 flex flex-col items-center justify-center text-center">
          <span className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-display tabular-nums">
            {workoutCount}
          </span>
          <span className="text-[11px] sm:text-xs text-zinc-400 font-medium font-body mt-1">
            Workouts
          </span>
        </div>

        {/* Column 2: Time (min) */}
        <div className="px-2 sm:px-4 py-1 flex flex-col items-center justify-center text-center">
          <span className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-display tabular-nums">
            {totalTimeMin}
          </span>
          <span className="text-[11px] sm:text-xs text-zinc-400 font-medium font-body mt-1">
            Time (min)
          </span>
        </div>

        {/* Column 3: Total Reps */}
        <div className="px-2 sm:px-4 py-1 flex flex-col items-center justify-center text-center">
          <span className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-display tabular-nums">
            {totalReps.toLocaleString()}
          </span>
          <span className="text-[11px] sm:text-xs text-zinc-400 font-medium font-body mt-1">
            Total Reps
          </span>
        </div>
      </div>
    </div>
  )
}
