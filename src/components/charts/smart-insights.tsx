"use client"

import { useMemo } from "react"
import type { Workout, Exercise } from "@/lib/types"
import { Clock, Sparkles } from "lucide-react"

interface SmartInsightsProps {
  workouts: Workout[]
  exercises?: Exercise[]
}

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dt = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dt}`
}

export function SmartInsights({ workouts, exercises = [] }: SmartInsightsProps) {
  // ─── 1. Training Time Analysis (Average start time + Morning/Afternoon/Evening split) ───
  const timeAnalysis = useMemo(() => {
    if (!workouts || workouts.length === 0) {
      return null
    }

    // Map of session keys (date_hour_min_bucket) -> minutes from midnight
    const sessions = new Map<string, number>()

    workouts.forEach((w) => {
      let mins: number | null = null

      if (w.time && typeof w.time === "string") {
        const parts = w.time.trim().split(":")
        if (parts.length >= 2) {
          const h = parseInt(parts[0], 10)
          const m = parseInt(parts[1], 10)
          if (!isNaN(h) && !isNaN(m) && h >= 0 && h < 24 && m >= 0 && m < 60) {
            mins = h * 60 + m
          }
        }
      }

      if (mins === null && (w as any).createdAt) {
        const d = new Date((w as any).createdAt)
        if (!isNaN(d.getTime())) {
          mins = d.getHours() * 60 + d.getMinutes()
        }
      }

      if (mins !== null) {
        // Group by date and roughly 30-min block to treat as a single session
        const dateKey = (w.date || "").slice(0, 10) || "unknown"
        const sessionKey = `${dateKey}_${Math.floor(mins / 30)}`
        if (!sessions.has(sessionKey)) {
          sessions.set(sessionKey, mins)
        }
      }
    })

    const minuteValues = Array.from(sessions.values())
    if (minuteValues.length === 0) {
      return {
        hasData: false,
        headline: `Training logged across ${workouts.length} sets`,
        subline: "Workout start times will show as sessions are recorded",
        morningPct: 0,
        afternoonPct: 0,
        eveningPct: 0,
      }
    }

    const totalSessions = minuteValues.length
    const avgMinutes = Math.round(minuteValues.reduce((a, b) => a + b, 0) / totalSessions)
    const avgHour = Math.floor(avgMinutes / 60) % 24
    const avgMin = avgMinutes % 60

    const period = avgHour >= 12 ? "PM" : "AM"
    const h12 = avgHour % 12 || 12
    const mStr = String(avgMin).padStart(2, "0")
    const formattedAvgTime = `~${h12}:${mStr} ${period}`

    let morningCount = 0
    let afternoonCount = 0
    let eveningCount = 0

    minuteValues.forEach((m) => {
      if (m >= 300 && m < 720) {
        // 05:00 - 11:59
        morningCount++
      } else if (m >= 720 && m < 1020) {
        // 12:00 - 16:59
        afternoonCount++
      } else {
        // 17:00 - 04:59
        eveningCount++
      }
    })

    const morningPct = Math.round((morningCount / totalSessions) * 100)
    const afternoonPct = Math.round((afternoonCount / totalSessions) * 100)
    const eveningPct = Math.max(0, 100 - morningPct - afternoonPct)

    return {
      hasData: true,
      headline: `You usually train at ${formattedAvgTime}`,
      subline: `Based on ${totalSessions} workout ${totalSessions === 1 ? "session" : "sessions"}`,
      morningPct,
      afternoonPct,
      eveningPct,
    }
  }, [workouts])

  // ─── 2. Progress Snapshot (2–3 plain language short insight lines) ───
  const snapshotLines = useMemo(() => {
    if (!workouts || workouts.length === 0) {
      return ["Start logging workouts to generate personal training insights."]
    }

    const lines: string[] = []
    const today = new Date()
    const d30 = new Date(today.getTime() - 30 * 86400000)
    const d60 = new Date(today.getTime() - 60 * 86400000)

    const todayStr = toLocalDateStr(today)
    const d30Str = toLocalDateStr(d30)
    const d60Str = toLocalDateStr(d60)

    // Calculate volume in last 30d vs 30-60d
    let current30Vol = 0
    let prev30Vol = 0

    const currentExVol = new Map<string, number>()
    const prevExVol = new Map<string, number>()

    workouts.forEach((w) => {
      const wDate = (w.date || "").slice(0, 10)
      const vol = w.volume || (w.sets && w.reps ? w.sets * w.reps : 0) || w.points || 0
      const exName = w.exerciseName || w.name || "Exercise"

      if (wDate >= d30Str && wDate <= todayStr) {
        current30Vol += vol
        currentExVol.set(exName, (currentExVol.get(exName) || 0) + vol)
      } else if (wDate >= d60Str && wDate < d30Str) {
        prev30Vol += vol
        prevExVol.set(exName, (prevExVol.get(exName) || 0) + vol)
      }
    })

    // Insight 1: Total Volume Comparison vs last month
    if (prev30Vol > 0 && current30Vol > 0) {
      const volDelta = Math.round(((current30Vol - prev30Vol) / prev30Vol) * 100)
      const sign = volDelta >= 0 ? "+" : ""
      lines.push(`Total volume ${sign}${volDelta}% vs previous 30 days`)
    } else if (current30Vol > 0) {
      lines.push(`${current30Vol.toLocaleString()} total volume reps logged in the last 30 days`)
    } else {
      lines.push(`${workouts.length} total workout sets logged all-time`)
    }

    // Insight 2: Specific Exercise Progression
    let topGrowingExName: string | null = null
    let topGrowthPct = -Infinity

    currentExVol.forEach((currVol, exName) => {
      const prev = prevExVol.get(exName) || 0
      if (prev > 0) {
        const growth = Math.round(((currVol - prev) / prev) * 100)
        if (growth > topGrowthPct) {
          topGrowthPct = growth
          topGrowingExName = exName
        }
      }
    })

    if (topGrowingExName && topGrowthPct > 0) {
      lines.push(`${topGrowingExName} volume +${topGrowthPct}% vs last month`)
    } else {
      // Fallback: most consistent exercise in current period
      let maxEx = ""
      let maxVol = 0
      currentExVol.forEach((v, k) => {
        if (v > maxVol) {
          maxVol = v
          maxEx = k
        }
      })
      if (maxEx) {
        lines.push(`${maxEx} is your primary movement this month (${maxVol.toLocaleString()} reps)`)
      }
    }

    // Insight 3: Streak / Milestone
    // Calculate current streak with Sunday-skipping (commit f3bcae6)
    const workoutDates = new Set(workouts.map((w) => (w.date || "").slice(0, 10)).filter(Boolean))
    let currentStreak = 0
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (yesterday.getDay() === 0 && !workoutDates.has(toLocalDateStr(yesterday))) {
      yesterday.setDate(yesterday.getDate() - 1)
    }

    const hasToday = workoutDates.has(todayStr)
    const hasYesterday = workoutDates.has(toLocalDateStr(yesterday))

    if (hasToday || hasYesterday) {
      let checkDate = new Date(hasToday ? today : yesterday)
      while (true) {
        if (checkDate.getDay() === 0) {
          checkDate.setDate(checkDate.getDate() - 1)
          continue
        }
        const dStr = toLocalDateStr(checkDate)
        if (workoutDates.has(dStr)) {
          currentStreak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
    }

    if (currentStreak >= 2) {
      lines.push(`${currentStreak}-day active streak (rest Sundays excluded)`)
    } else {
      lines.push(`${workoutDates.size} active workout days logged across all routines`)
    }

    return lines.slice(0, 3)
  }, [workouts])

  if (!timeAnalysis) return null

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5 shadow-sm space-y-4">
      {/* ─── Compact Row 1: Training Time & Split ─── */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700/60 text-white shrink-0">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold text-white font-display">
              {timeAnalysis.headline}
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono sm:text-right">
            {timeAnalysis.subline}
          </span>
        </div>

        {/* Tiny distribution segmented bar (Morning / Afternoon / Evening split) */}
        {timeAnalysis.hasData && (
          <div className="space-y-1.5 pt-1">
            <div className="h-1.5 w-full bg-zinc-800 rounded-full flex overflow-hidden">
              {timeAnalysis.morningPct > 0 && (
                <div
                  style={{ width: `${timeAnalysis.morningPct}%` }}
                  className="bg-white h-full transition-all duration-300"
                  title={`Morning: ${timeAnalysis.morningPct}%`}
                />
              )}
              {timeAnalysis.afternoonPct > 0 && (
                <div
                  style={{ width: `${timeAnalysis.afternoonPct}%` }}
                  className="bg-zinc-400 h-full transition-all duration-300"
                  title={`Afternoon: ${timeAnalysis.afternoonPct}%`}
                />
              )}
              {timeAnalysis.eveningPct > 0 && (
                <div
                  style={{ width: `${timeAnalysis.eveningPct}%` }}
                  className="bg-zinc-600 h-full transition-all duration-300"
                  title={`Evening: ${timeAnalysis.eveningPct}%`}
                />
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0" />
                Morning <strong className="text-zinc-200">{timeAnalysis.morningPct}%</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 shrink-0" />
                Afternoon <strong className="text-zinc-200">{timeAnalysis.afternoonPct}%</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 shrink-0" />
                Evening <strong className="text-zinc-200">{timeAnalysis.eveningPct}%</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Compact Row 2: Progress Snapshot (2–3 short plain-language lines) ─── */}
      <div className="pt-3 border-t border-zinc-800/80 space-y-2">
        <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-wider">
          <Sparkles className="h-3 w-3 text-white" />
          <span>Progress Snapshot</span>
        </div>

        <div className="space-y-1.5">
          {snapshotLines.map((line, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-zinc-300 font-body">
              <span className="h-1 w-1 rounded-full bg-white shrink-0" />
              <span className="truncate">{line}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
