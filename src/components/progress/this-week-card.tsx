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
    let todayMins = 0

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i)
      const dateStr = toLocalDateStr(d)
      const isToday = dateStr === todayStr
      const hasWorkout = workoutDatesSet.has(dateStr)

      const daySessions = sessions.filter((s) => s.date === dateStr)
      const dayMins = daySessions.reduce((acc, s) => acc + s.durationMin, 0)

      totalWeekMinutes += dayMins
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

    const avgMins = Number((totalWeekMinutes / 7).toFixed(1))

    return {
      days: computedDays,
      todayMinutes: todayMins,
      weeklyAvgMinutes: avgMins,
    }
  }, [sessions])

  return (
    <div className="rounded-3xl border border-zinc-800/90 bg-[#121316] p-5 sm:p-6 shadow-xl space-y-6">
      {/* ─── 1. Header: "This Week" (Reference 01) ─── */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-white font-display">
          This Week
        </h2>

        {onOpenWeeklyOverview && (
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              onOpenWeeklyOverview()
            }}
            className="text-xs font-semibold text-[#3b82f6] hover:text-blue-400 flex items-center gap-1 transition-colors cursor-pointer py-1 px-1.5"
          >
            <span>Weekly Overview</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ─── 2. 7 Day Circles (S M T W T F S) ─── */}
      <div className="space-y-3">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 justify-items-center py-1">
          {days.map((day, idx) => (
            <div key={idx} className="flex flex-col items-center select-none">
              {/* Day of Week Label */}
              <span
                className={`text-xs font-medium font-body mb-2 ${
                  day.isToday ? "text-white font-semibold" : "text-zinc-500"
                }`}
              >
                {day.dayName}
              </span>

              {/* Unified Date Circle:
                  - Workout Day: filled white circle with dark text
                  - Today: marked with distinctive blue ring
                  - Rest Day: subtle dark circle */}
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-display tabular-nums text-xs sm:text-sm transition-all ${
                  day.hasWorkout && day.isToday
                    ? "bg-white text-zinc-950 font-bold ring-2 ring-[#3b82f6] ring-offset-2 ring-offset-[#121316] shadow-md shadow-blue-500/20"
                    : day.isToday
                    ? "bg-blue-600/20 text-blue-400 ring-2 ring-[#3b82f6] ring-offset-2 ring-offset-[#121316] font-bold"
                    : day.hasWorkout
                    ? "bg-white text-zinc-950 font-bold shadow-xs"
                    : "bg-zinc-900/80 text-zinc-500 border border-zinc-800/80 font-normal"
                }`}
              >
                {day.dateNumber}
              </div>
            </div>
          ))}
        </div>

        {/* Tiny Clear Legend */}
        <div className="flex items-center justify-center gap-5 pt-1 text-[11px] text-zinc-400 select-none">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full ring-2 ring-[#3b82f6] ring-offset-1 ring-offset-[#121316] bg-blue-600/20" />
            <span>Today</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white" />
            <span>Workout</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-750" />
            <span>Rest</span>
          </span>
        </div>
      </div>

      {/* ─── 3. Two Mini-Stats: Today(min) | Weekly average(min) (Reference 01) ─── */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div>
          <span className="text-xs text-zinc-400 font-medium block">
            Today(min)
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#2563eb] font-display tabular-nums mt-1 block">
            {todayMinutes}
          </span>
        </div>

        <div>
          <span className="text-xs text-zinc-400 font-medium block">
            Weekly average(min)
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#2563eb] font-display tabular-nums mt-1 block">
            {weeklyAvgMinutes}
          </span>
        </div>
      </div>
    </div>
  )
}
