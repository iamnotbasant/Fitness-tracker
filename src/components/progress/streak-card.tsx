"use client"

import React, { useMemo } from "react"
import type { Workout } from "@/lib/types"
import { Flame } from "lucide-react"
import { calculateCurrentStreak, toLocalDateStr } from "./workout-helpers"

interface StreakCardProps {
  workouts: Workout[]
  className?: string
}

export function StreakCard({ workouts, className = "" }: StreakCardProps) {
  const allWorkoutDates = useMemo(
    () => workouts.map((w) => (w.date || "").slice(0, 10)).filter(Boolean),
    [workouts]
  )

  // Current streak (with Sunday-skipping logic f3bcae6)
  const currentStreakDays = useMemo(
    () => calculateCurrentStreak(allWorkoutDates),
    [allWorkoutDates]
  )

  const weekStreak = Math.floor(currentStreakDays / 6)

  // Longest streak & active days calculation (ignoring Sundays, commit f3bcae6)
  const { longestStreak, activeDays } = useMemo(() => {
    const dates = new Set(allWorkoutDates)
    if (dates.size === 0) {
      return { longestStreak: 0, activeDays: 0 }
    }

    const sorted = Array.from(dates).sort()
    const earliest = new Date(sorted[0] + "T00:00:00")
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let longest = 0
    let temp = 0
    const cur = new Date(earliest)

    while (cur <= today) {
      if (cur.getDay() === 0) {
        // Sundays are fully ignored in streak math (commit f3bcae6)
        cur.setDate(cur.getDate() + 1)
        continue
      }
      const dStr = toLocalDateStr(cur)
      if (dates.has(dStr)) {
        temp++
        if (temp > longest) longest = temp
      } else {
        temp = 0
      }
      cur.setDate(cur.getDate() + 1)
    }

    return {
      longestStreak: Math.max(longest, currentStreakDays),
      activeDays: dates.size,
    }
  }, [allWorkoutDates, currentStreakDays])

  return (
    <div
      className={`rounded-3xl border border-zinc-800/90 bg-[#121316] p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-6 ${className}`}
    >
      {/* ─── Hero Streak: Flame + "X Week Streak" + Days active ─── */}
      <div className="flex-1 flex flex-col items-center justify-center text-center py-2 sm:py-4">
        {/* Flame badge with warm amber glow */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center mb-3.5 shadow-lg shadow-orange-500/5">
          <Flame className="w-8 h-8 sm:w-9 sm:h-9 text-orange-500 fill-orange-500" />
        </div>

        <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white font-display tracking-tight tabular-nums">
          {`${weekStreak} Week Streak`}
        </div>

        <div className="text-sm font-semibold text-zinc-300 font-body mt-1.5 tabular-nums">
          {currentStreakDays} {currentStreakDays === 1 ? "day" : "days"} logged
        </div>

        <p className="text-xs text-zinc-500 font-body mt-1">
          Sundays excluded from streak
        </p>
      </div>

      {/* ─── Bottom Streak Stats: Current | Best | Active Days ─── */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-zinc-800/80 text-center">
        <div>
          <span className="text-[11px] text-zinc-400 font-medium block font-body">Current</span>
          <span className="text-xl sm:text-2xl font-bold text-white font-display tabular-nums mt-0.5 block">
            {currentStreakDays}d
          </span>
        </div>
        <div>
          <span className="text-[11px] text-zinc-400 font-medium block font-body">Best</span>
          <span className="text-xl sm:text-2xl font-bold text-white font-display tabular-nums mt-0.5 block">
            {longestStreak}d
          </span>
        </div>
        <div>
          <span className="text-[11px] text-zinc-400 font-medium block font-body">Active Days</span>
          <span className="text-xl sm:text-2xl font-bold text-white font-display tabular-nums mt-0.5 block">
            {activeDays}
          </span>
        </div>
      </div>
    </div>
  )
}
