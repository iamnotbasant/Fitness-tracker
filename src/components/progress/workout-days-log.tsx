"use client"

import React, { useMemo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Flame } from "lucide-react"
import type { Workout } from "@/lib/types"
import { CountUp } from "./count-up"
import {
  type AggregatedWorkoutSession,
  calculateCurrentStreak,
} from "./workout-helpers"

const CALENDAR_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export interface WorkoutDaysLogProps {
  workouts: Workout[]
  sessions?: AggregatedWorkoutSession[]
  month?: number // 0-11 (January = 0)
  year?: number
  title?: string
  hideHeader?: boolean
  className?: string
}

export function WorkoutDaysLog({
  workouts,
  sessions,
  month,
  year,
  title = "Workout Days Log",
  hideHeader = false,
  className = "",
}: WorkoutDaysLogProps) {
  const now = new Date()
  const targetYear = year ?? now.getFullYear()
  const targetMonth = month ?? now.getMonth()

  // Sunday-safe streak calculation (commit f3bcae6)
  const streakInfo = useMemo(() => {
    const allWorkoutDates = workouts.map((w) => (w.date || "").slice(0, 10)).filter(Boolean)
    const currentStreakDays = calculateCurrentStreak(allWorkoutDates)
    return { currentStreakDays }
  }, [workouts])

  // Calendar Log for the given month & year
  const calendarLog = useMemo(() => {
    const firstDayDate = new Date(targetYear, targetMonth, 1)
    const firstDayOfWeek = firstDayDate.getDay() // 0 = Sun
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate()

    const trainedDates = new Set<string>()
    workouts.forEach((w) => {
      const d = (w.date || "").slice(0, 10)
      if (d) trainedDates.add(d)
    })
    if (sessions) {
      sessions.forEach((s) => {
        const d = (s.date || "").slice(0, 10)
        if (d) trainedDates.add(d)
      })
    }

    let activeDaysCount = 0
    const mStr = String(targetMonth + 1).padStart(2, "0")

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = String(d).padStart(2, "0")
      const dateKey = `${targetYear}-${mStr}-${dStr}`
      if (trainedDates.has(dateKey)) {
        activeDaysCount++
      }
    }

    const slots: {
      type: "empty" | "day"
      dayNum?: number
      dateStr?: string
      hasWorkout?: boolean
    }[] = []

    for (let i = 0; i < firstDayOfWeek; i++) {
      slots.push({ type: "empty" })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = String(d).padStart(2, "0")
      const dateKey = `${targetYear}-${mStr}-${dStr}`
      slots.push({
        type: "day",
        dayNum: d,
        dateStr: dateKey,
        hasWorkout: trainedDates.has(dateKey),
      })
    }

    return {
      slots,
      activeDaysCount,
      totalDays: daysInMonth,
    }
  }, [workouts, sessions, targetYear, targetMonth])

  const prefersReduced = useReducedMotion()

  let workoutDayIdx = 0

  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {!hideHeader && (
        <div className="flex items-center justify-between min-h-[32px]">
          <h2 className="text-base sm:text-lg font-bold text-white font-display">
            {title}
          </h2>
          <span className="text-xs text-zinc-400 font-mono">
            {calendarLog.activeDaysCount} {calendarLog.activeDaysCount === 1 ? "day" : "days"} active
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 items-stretch">
        {/* Streak Hero (Amber flame with warm pulsing glow + streak label) */}
        <div className="rounded-3xl border border-zinc-800/90 bg-[#121316] p-6 flex flex-col items-center justify-center space-y-2 text-center min-h-[160px] shadow-xl">
          <motion.div
            animate={
              prefersReduced
                ? {}
                : {
                    scale: [1, 1.06, 1],
                    filter: [
                      "drop-shadow(0 0 6px rgba(249, 115, 22, 0.45))",
                      "drop-shadow(0 0 16px rgba(249, 115, 22, 0.85)) drop-shadow(0 0 24px rgba(234, 88, 12, 0.4))",
                      "drop-shadow(0 0 6px rgba(249, 115, 22, 0.45))",
                    ],
                  }
            }
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="flex items-center justify-center"
          >
            <Flame className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500 fill-orange-500" />
          </motion.div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
            <CountUp value={streakInfo.currentStreakDays} duration={0.6} />
          </div>
          <div className="text-sm font-semibold text-zinc-300">
            {streakInfo.currentStreakDays === 1 ? "day" : "days"} streak
          </div>
          <span className="text-xs text-zinc-400 font-body">
            {calendarLog.activeDaysCount} {calendarLog.activeDaysCount === 1 ? "day" : "days"} active this month · Sundays excluded
          </span>
        </div>

        {/* Calendar Table */}
        <div className="space-y-2 rounded-3xl border border-zinc-800/90 bg-[#121316] p-4 sm:p-6 shadow-xl">
          <div className="grid grid-cols-7 text-center">
            {CALENDAR_HEADERS.map((h, i) => (
              <span key={i} className="text-xs text-zinc-400 font-medium py-1">
                {h}
              </span>
            ))}
          </div>

          <div
            key={`${targetYear}-${targetMonth}`}
            className="grid grid-cols-7 gap-y-2 text-center"
          >
            {calendarLog.slots.map((slot, idx) => {
              if (slot.type === "empty") {
                return <div key={`empty-${idx}`} className="h-9" />
              }

              const isWorkout = Boolean(slot.hasWorkout)
              const wIdx = isWorkout ? workoutDayIdx++ : 0

              return (
                <div
                  key={`day-${slot.dayNum}`}
                  className="h-9 flex flex-col items-center justify-center relative"
                >
                  {isWorkout ? (
                    <motion.span
                      initial={prefersReduced ? false : { scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={
                        prefersReduced
                          ? { duration: 0 }
                          : {
                              type: "spring",
                              stiffness: 420,
                              damping: 22,
                              delay: Math.min(wIdx * 0.02, 0.3),
                            }
                      }
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-display tabular-nums bg-white text-zinc-950 font-bold shadow-xs ring-1 ring-white/20"
                    >
                      {slot.dayNum}
                    </motion.span>
                  ) : (
                    <motion.span
                      initial={prefersReduced ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={
                        prefersReduced
                          ? { duration: 0 }
                          : {
                              duration: 0.2,
                              delay: Math.min((slot.dayNum || 0) * 0.004, 0.15),
                              ease: "easeOut",
                            }
                      }
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-display tabular-nums text-zinc-400 font-normal hover:text-zinc-200 transition-colors"
                    >
                      {slot.dayNum}
                    </motion.span>
                  )}
                  {isWorkout && (
                    <motion.span
                      initial={prefersReduced ? false : { scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={
                        prefersReduced
                          ? { duration: 0 }
                          : {
                              duration: 0.2,
                              delay: Math.min(wIdx * 0.02 + 0.06, 0.35),
                            }
                      }
                      className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-500"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
