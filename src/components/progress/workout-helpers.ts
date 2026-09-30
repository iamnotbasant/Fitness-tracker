import type { Workout } from "@/lib/types"

export interface AggregatedWorkoutSession {
  id: string
  name: string
  date: string // YYYY-MM-DD
  time?: string // HH:MM
  durationMin: number
  durationSeconds: number
  totalReps: number
  totalSets: number
  points: number
  exercises: {
    name: string
    sets: number
    reps: number
    timeSeconds?: number
    weight?: number
    notes?: string
  }[]
  rawWorkouts: Workout[]
}

/**
 * Format a Date object to YYYY-MM-DD in local time
 */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Format date for display: "29 Sep 2026"
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const parts = dateStr.slice(0, 10).split("-")
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const d = new Date(year, month, day)
      return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
    }
  } catch {}
  return dateStr
}

/**
 * Format time for display: "6:30 PM" or "18:30"
 */
export function formatTimeDisplay(timeStr?: string): string {
  if (!timeStr) return ""
  const parts = timeStr.trim().split(":")
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10)
    const m = parts[1].slice(0, 2)
    if (!isNaN(h)) {
      const period = h >= 12 ? "PM" : "AM"
      const h12 = h % 12 || 12
      return `${h12}:${m} ${period}`
    }
  }
  return timeStr
}

/**
 * Groups raw Workout rows into coherent workout sessions (by date and time).
 * For calisthenics data:
 * - duration is derived from timeSeconds || durationSeconds || sets estimation
 * - total reps is sum of bodyweight reps (excluding weight multipliers)
 */
export function groupWorkoutsIntoSessions(workouts: Workout[]): AggregatedWorkoutSession[] {
  if (!workouts || workouts.length === 0) return []

  // Group by date + time session key
  const groups = new Map<string, Workout[]>()

  workouts.forEach((w) => {
    const dateKey = (w.date || "").slice(0, 10)
    if (!dateKey) return

    // All items logged in a finished session share the same time
    const timeKey = w.time ? w.time.trim().slice(0, 5) : ""
    // If time is missing, distinguish entries if they have distinct IDs, or group by date
    const sessionKey = timeKey ? `${dateKey}_${timeKey}` : `${dateKey}_${w.id || "entry"}`

    if (!groups.has(sessionKey)) {
      groups.set(sessionKey, [])
    }
    groups.get(sessionKey)!.push(w)
  })

  const sessions: AggregatedWorkoutSession[] = []

  groups.forEach((rows, key) => {
    // Sort rows by id
    const sorted = [...rows].sort((a, b) => {
      const idA = Number(String(a.id).replace(/\D/g, "")) || 0
      const idB = Number(String(b.id).replace(/\D/g, "")) || 0
      return idA - idB
    })

    const first = sorted[0]
    const date = (first.date || "").slice(0, 10)
    const time = first.time ? first.time.trim().slice(0, 5) : undefined

    // 1. Duration calculation: timeSeconds || durationSeconds || 0
    // If a session has durationSeconds on its items (e.g. 1800s), take max of durationSeconds
    const maxDurationSec = Math.max(0, ...sorted.map((w) => w.durationSeconds || 0))
    const totalTimeSec = sorted.reduce((sum, w) => sum + (w.timeSeconds || 0), 0)
    
    let durationSeconds = 0
    if (maxDurationSec > 0) {
      durationSeconds = maxDurationSec
    } else if (totalTimeSec > 0) {
      durationSeconds = totalTimeSec
    } else {
      // Fallback: estimate ~45s-60s per set
      const totalSetCount = sorted.reduce((acc, w) => acc + (w.sets || 1), 0)
      durationSeconds = totalSetCount * 60
    }

    const durationMin = Math.max(1, Math.round(durationSeconds / 60))

    // 2. Total reps: sum of calisthenics reps (sets * reps)
    let totalReps = 0
    let totalSets = 0
    let points = 0

    const exercisesMap = new Map<
      string,
      { name: string; sets: number; reps: number; timeSeconds?: number; weight?: number; notes?: string }
    >()

    sorted.forEach((w) => {
      const sets = Math.max(1, w.sets || 1)
      const isTimer = !!w.timeSeconds && (!w.reps || w.reps === 0)
      const repsForRecord = isTimer ? 0 : sets * (w.reps || 0)

      totalSets += sets
      totalReps += repsForRecord
      points += w.points ?? w.total_points ?? 0

      const exName = w.exerciseName || w.name || "Exercise"
      const existing = exercisesMap.get(exName.toLowerCase())

      if (existing) {
        existing.sets += sets
        existing.reps += repsForRecord
        if (w.timeSeconds) {
          existing.timeSeconds = (existing.timeSeconds || 0) + w.timeSeconds
        }
        if (w.notes && !existing.notes?.includes(w.notes)) {
          existing.notes = existing.notes ? `${existing.notes} · ${w.notes}` : w.notes
        }
      } else {
        exercisesMap.set(exName.toLowerCase(), {
          name: exName,
          sets,
          reps: repsForRecord,
          timeSeconds: w.timeSeconds,
          weight: w.weight,
          notes: w.notes,
        })
      }
    })

    const exercises = Array.from(exercisesMap.values())

    // 3. Workout Name
    let name = sorted.find((w) => w.workoutName)?.workoutName || sorted.find((w) => w.name)?.name
    if (!name) {
      if (exercises.length === 1) {
        name = exercises[0].name
      } else if (exercises.length === 2) {
        name = `${exercises[0].name} & ${exercises[1].name}`
      } else if (exercises.length > 2) {
        name = `${exercises[0].name}, ${exercises[1].name} +${exercises.length - 2}`
      } else {
        name = "Calisthenics Workout"
      }
    }

    sessions.push({
      id: `session-${key}`,
      name,
      date,
      time,
      durationMin,
      durationSeconds,
      totalReps,
      totalSets,
      points,
      exercises,
      rawWorkouts: sorted,
    })
  })

  // Sort sessions newest to oldest
  return sessions.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date)
    if (dateCmp !== 0) return dateCmp
    return (b.time || "").localeCompare(a.time || "")
  })
}

/**
 * Returns the Monday (00:00:00) of the week containing date d.
 */
export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = date.getDay() // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diffToMonday)
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Format week label: "9 Aug", "16 Aug"
 */
export function formatWeekLabel(monday: Date): string {
  const day = monday.getDate()
  const month = monday.toLocaleDateString("en-US", { month: "short" })
  return `${day} ${month}`
}

/**
 * Accurate streak calculation with Sunday-skipping logic (commit f3bcae6).
 * Sundays no longer increment or break the streak.
 */
export function calculateCurrentStreak(workoutDates: string[]): number {
  const dates = new Set(workoutDates.map((d) => (d || "").slice(0, 10)).filter(Boolean))
  if (dates.size === 0) return 0

  let streakCount = 0
  const today = new Date()
  const todayStr = toLocalDateStr(today)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (yesterday.getDay() === 0 && !dates.has(toLocalDateStr(yesterday))) {
    yesterday.setDate(yesterday.getDate() - 1)
  }
  const yesterdayStr = toLocalDateStr(yesterday)

  if (dates.has(todayStr) || dates.has(yesterdayStr)) {
    const check = new Date(dates.has(todayStr) ? today : yesterday)
    while (true) {
      if (check.getDay() === 0) {
        check.setDate(check.getDate() - 1)
        continue
      }
      const dStr = toLocalDateStr(check)
      if (dates.has(dStr)) {
        streakCount++
        check.setDate(check.getDate() - 1)
      } else {
        break
      }
    }
  }

  return streakCount
}
