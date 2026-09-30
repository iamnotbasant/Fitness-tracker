"use client"

import React, { useMemo } from "react"
import { ChevronRight } from "lucide-react"
import soundManager from "@/lib/sounds"
import {
  type AggregatedWorkoutSession,
  toLocalDateStr,
} from "./workout-helpers"

interface ThisWeekCardProps {
  sessions: AggregatedWorkoutSession[]
  onOpenWeeklyOverview?: () => void
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const

export function ThisWeekCard({ sessions, onOpenWeeklyOverview }: ThisWeekCardProps) {
  const { days, todayMinutes, weeklyAvgMinutes } = useMemo(() => {
    const now = new Date()
    const todayStr = toLocalDateStr(now)
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, ... 6 = Saturday

    // Sunday of the current week
    const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)

    const workoutDatesSet = new Set(sessions.map((s) => s.date))

    const computedDays = []
    let totalWeekMinutes = 0
    let workoutDaysThisWeek = 0
    let todayMins = 0

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i)
      const dateStr = toLocalDateStr(d)
      const isToday = dateStr === todayStr
      const hasWorkout = workoutDatesSet.has(dateStr)

      // Sessions for this specific day
      const daySessions = sessions.filter((s) => s.date === dateStr)
      const dayMins = daySessions.reduce((acc, s) => acc + s.durationMin, 0)

      totalWeekMinutes += dayMins
      if (hasWorkout) {
        workoutDaysThisWeek++
      }
      if (isToday) {
        todayMins = dayMins
      }

      computedDays.push({
        dayName: DAY_LABELS[i],
        dateNumber: d.getDate(),
        dateStr,
        isToday,
        hasWorkout,
        dayMins,
      })
    }

    const avgMins = workoutDaysThisWeek > 0 ? Math.round(totalWeekMinutes / workoutDaysThisWeek) : 0

    return {
      days: computedDays,
      todayMinutes: todayMins,
      weeklyAvgMinutes: avgMins,
    }
  }, [sessions])

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-1 gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight font-display">
            This Week
          </h2>
          <p className="text-xs text-zinc-400 font-body mt-0.5">
            Daily consistency & session duration
          </p>
        </div>

        {onOpenWeeklyOverview && (
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              onOpenWeeklyOverview()
            }}
            className="h-10 min-h-[44px] px-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-850 hover:border-zinc-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
          >
            <span>Overview</span>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          </button>
        )}
      </div>

      {/* 7 Day Circles: S M T W T F S with dates inside */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 justify-items-center py-1">
        {days.map((day, idx) => (
          <div key={idx} className="flex flex-col items-center select-none">
            {/* Day of Week Label */}
            <span
              className={`text-[11px] font-medium font-body mb-1.5 ${
                day.isToday ? "text-white font-bold" : "text-zinc-400"
              }`}
            >
              {day.dayName}
            </span>

            {/* Date Circle */}
            <div
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-display tabular-nums text-xs sm:text-sm transition-all ${
                day.isToday
                  ? "bg-white text-zinc-950 font-bold shadow-md ring-2 ring-white/20"
                  : day.hasWorkout
                  ? "bg-zinc-800 text-white font-semibold border border-zinc-500/80"
                  : "bg-zinc-950 text-zinc-500 border border-zinc-800/80"
              }`}
            >
              {day.dateNumber}
            </div>

            {/* Workout Marker: dot below circle */}
            <div className="mt-1.5 flex items-center justify-center h-2">
              {day.hasWorkout ? (
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    day.isToday ? "bg-white ring-1 ring-zinc-950" : "bg-white"
                  }`}
                  title={`${day.dayMins} min`}
                />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-transparent" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Two Mini-Stats: Today (min) | Weekly avg (min) */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3 sm:p-4 text-center sm:text-left space-y-1">
          <span className="text-xs text-zinc-400 font-medium font-body block">
            Today (min)
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-white font-display tabular-nums">
            {todayMinutes}
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3 sm:p-4 text-center sm:text-left space-y-1">
          <span className="text-xs text-zinc-400 font-medium font-body block">
            Weekly avg (min)
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-white font-display tabular-nums">
            {weeklyAvgMinutes}
          </span>
        </div>
      </div>
    </div>
  )
}
