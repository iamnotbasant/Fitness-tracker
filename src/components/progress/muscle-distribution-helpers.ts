import type { Workout, Exercise } from "@/lib/types"
import {
  toLocalDateStr,
  groupWorkoutsIntoSessions,
} from "./workout-helpers"

export type RadarMuscleGroup = "Chest" | "Back" | "Shoulders" | "Arms" | "Legs" | "Core"

export const RADAR_MUSCLE_GROUPS: RadarMuscleGroup[] = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Legs",
  "Core",
]

export interface RadarDataPoint {
  muscle: RadarMuscleGroup
  current: number
  previous: number
  fullMark?: number
}

export interface PeriodStats {
  workouts: number
  durationMin: number
  sets: number
  reps: number
  volumeKg: number
}

export interface DeltaInfo {
  text: string
  rawDelta: number
  isPositive: boolean
  isNegative: boolean
  isZero: boolean
}

/**
 * Format delta value into monochrome representation:
 * Positive: ↑ +N
 * Negative: ↓ -N
 * Zero: — 0
 */
export function formatMonochromeDelta(delta: number, suffix = ""): DeltaInfo {
  if (delta > 0) {
    return {
      text: `↑ +${delta.toLocaleString()}${suffix}`,
      rawDelta: delta,
      isPositive: true,
      isNegative: false,
      isZero: false,
    }
  }
  if (delta < 0) {
    return {
      text: `↓ -${Math.abs(delta).toLocaleString()}${suffix}`,
      rawDelta: delta,
      isPositive: false,
      isNegative: true,
      isZero: false,
    }
  }
  return {
    text: `— 0${suffix}`,
    rawDelta: 0,
    isPositive: false,
    isNegative: false,
    isZero: true,
  }
}

/**
 * Common Calisthenics Exercise Target Mapping
 */
const EXERCISE_TARGET_DICTIONARY: Record<
  string,
  { primary: RadarMuscleGroup[]; secondary?: RadarMuscleGroup[] }
> = {
  // Push / Chest
  "push up": { primary: ["Chest"], secondary: ["Shoulders", "Arms"] },
  "push-up": { primary: ["Chest"], secondary: ["Shoulders", "Arms"] },
  "pushup": { primary: ["Chest"], secondary: ["Shoulders", "Arms"] },
  "dip": { primary: ["Chest", "Arms"], secondary: ["Shoulders"] },
  "dips": { primary: ["Chest", "Arms"], secondary: ["Shoulders"] },
  "diamond push": { primary: ["Arms", "Chest"], secondary: ["Shoulders"] },
  "archer push": { primary: ["Chest"], secondary: ["Arms", "Shoulders"] },
  "bench press": { primary: ["Chest"], secondary: ["Arms", "Shoulders"] },
  "chest fly": { primary: ["Chest"], secondary: ["Shoulders"] },

  // Pull / Back
  "pull up": { primary: ["Back"], secondary: ["Arms"] },
  "pull-up": { primary: ["Back"], secondary: ["Arms"] },
  "pullup": { primary: ["Back"], secondary: ["Arms"] },
  "chin up": { primary: ["Back", "Arms"], secondary: [] },
  "chin-up": { primary: ["Back", "Arms"], secondary: [] },
  "chinup": { primary: ["Back", "Arms"], secondary: [] },
  "inverted row": { primary: ["Back"], secondary: ["Arms"] },
  "australian pull": { primary: ["Back"], secondary: ["Arms"] },
  "dead hang": { primary: ["Arms", "Back"] },
  "bar hang": { primary: ["Arms", "Back"] },
  "lat pulldown": { primary: ["Back"], secondary: ["Arms"] },
  "cable row": { primary: ["Back"], secondary: ["Arms"] },
  "scapular pull": { primary: ["Back"] },

  // Shoulders
  "pike push": { primary: ["Shoulders"], secondary: ["Arms", "Core"] },
  "pike-push": { primary: ["Shoulders"], secondary: ["Arms", "Core"] },
  "handstand": { primary: ["Shoulders"], secondary: ["Arms", "Core"] },
  "overhead press": { primary: ["Shoulders"], secondary: ["Arms"] },
  "shoulder press": { primary: ["Shoulders"], secondary: ["Arms"] },
  "lateral raise": { primary: ["Shoulders"] },
  "face pull": { primary: ["Shoulders", "Back"] },

  // Arms
  "bicep curl": { primary: ["Arms"] },
  "tricep extension": { primary: ["Arms"] },
  "skull crusher": { primary: ["Arms"] },
  "wrist curl": { primary: ["Arms"] },

  // Legs
  "squat": { primary: ["Legs"], secondary: ["Core"] },
  "pistol": { primary: ["Legs"], secondary: ["Core"] },
  "lunge": { primary: ["Legs"], secondary: ["Core"] },
  "split squat": { primary: ["Legs"] },
  "bulgarian": { primary: ["Legs"] },
  "calf raise": { primary: ["Legs"] },
  "glute bridge": { primary: ["Legs"] },
  "nordic curl": { primary: ["Legs"] },
  "leg curl": { primary: ["Legs"] },
  "leg extension": { primary: ["Legs"] },

  // Core
  "leg raise": { primary: ["Core"] },
  "knee raise": { primary: ["Core"] },
  "plank": { primary: ["Core"], secondary: ["Shoulders"] },
  "hollow body": { primary: ["Core"] },
  "l-sit": { primary: ["Core", "Arms"], secondary: ["Shoulders"] },
  "lsit": { primary: ["Core", "Arms"], secondary: ["Shoulders"] },
  "crunch": { primary: ["Core"] },
  "sit up": { primary: ["Core"] },
  "situp": { primary: ["Core"] },
  "v-up": { primary: ["Core"] },
  "dragon flag": { primary: ["Core"] },
  "russian twist": { primary: ["Core"] },
  "windshield wiper": { primary: ["Core"] },
}

function normalizeBodyPartToRadar(part: string): RadarMuscleGroup | null {
  const p = part.toLowerCase().trim()
  if (p.includes("chest") || p.includes("pec")) return "Chest"
  if (p.includes("lat") || p.includes("back") || p.includes("trap") || p.includes("rhomboid")) return "Back"
  if (p.includes("shoulder") || p.includes("delt")) return "Shoulders"
  if (p.includes("bicep") || p.includes("tricep") || p.includes("arm") || p.includes("forearm") || p.includes("grip")) return "Arms"
  if (p.includes("leg") || p.includes("quad") || p.includes("hamstring") || p.includes("glute") || p.includes("calv") || p.includes("adductor")) return "Legs"
  if (p.includes("core") || p.includes("abs") || p.includes("abdom") || p.includes("oblique")) return "Core"
  return null
}

function splitToRadarGroups(split?: string): { primary: RadarMuscleGroup[]; secondary: RadarMuscleGroup[] } {
  switch (split) {
    case "push":
      return { primary: ["Chest"], secondary: ["Shoulders", "Arms"] }
    case "pull":
      return { primary: ["Back"], secondary: ["Arms"] }
    case "legs":
    case "lower":
      return { primary: ["Legs"], secondary: ["Core"] }
    case "core":
      return { primary: ["Core"], secondary: [] }
    case "upper":
      return { primary: ["Chest", "Back"], secondary: ["Shoulders", "Arms"] }
    default:
      return { primary: [], secondary: [] }
  }
}

/**
 * Classifies a workout row into 6 muscle groups
 */
export function classifyWorkoutRow(
  workout: Workout,
  exercisesMap?: Map<string, Exercise>
): { primary: RadarMuscleGroup[]; secondary: RadarMuscleGroup[] } {
  const ex = exercisesMap?.get(String(workout.exerciseId)) ||
    (workout.exerciseName ? exercisesMap?.get(workout.exerciseName.toLowerCase().trim()) : undefined)

  // 1. Try bodyParts if defined on exercise
  if (ex?.bodyParts && ex.bodyParts.length > 0) {
    const fromParts: RadarMuscleGroup[] = []
    ex.bodyParts.forEach((bp) => {
      const g = normalizeBodyPartToRadar(bp)
      if (g && !fromParts.includes(g)) {
        fromParts.push(g)
      }
    })
    if (fromParts.length > 0) {
      return { primary: fromParts, secondary: [] }
    }
  }

  // 2. Try Dictionary by exercise name
  const nameToMatch = (workout.exerciseName || workout.name || ex?.name || "").toLowerCase().trim()
  for (const [key, mapping] of Object.entries(EXERCISE_TARGET_DICTIONARY)) {
    if (nameToMatch.includes(key)) {
      return {
        primary: mapping.primary,
        secondary: mapping.secondary || [],
      }
    }
  }

  // 3. Try exercise split
  const fromSplit = splitToRadarGroups(ex?.split)
  if (fromSplit.primary.length > 0) {
    return fromSplit
  }

  // 4. Keyword heuristics from name
  if (nameToMatch.includes("push") || nameToMatch.includes("dip")) {
    return { primary: ["Chest"], secondary: ["Shoulders", "Arms"] }
  }
  if (nameToMatch.includes("pull") || nameToMatch.includes("row") || nameToMatch.includes("lat")) {
    return { primary: ["Back"], secondary: ["Arms"] }
  }
  if (nameToMatch.includes("squat") || nameToMatch.includes("lunge") || nameToMatch.includes("calf") || nameToMatch.includes("leg")) {
    return { primary: ["Legs"], secondary: [] }
  }
  if (nameToMatch.includes("pike") || nameToMatch.includes("handstand") || nameToMatch.includes("shoulder")) {
    return { primary: ["Shoulders"], secondary: ["Arms"] }
  }
  if (nameToMatch.includes("curl") || nameToMatch.includes("tricep") || nameToMatch.includes("arm")) {
    return { primary: ["Arms"], secondary: [] }
  }
  if (nameToMatch.includes("plank") || nameToMatch.includes("raise") || nameToMatch.includes("crunch") || nameToMatch.includes("core") || nameToMatch.includes("abs")) {
    return { primary: ["Core"], secondary: [] }
  }

  // Fallback
  return { primary: ["Core"], secondary: [] }
}

/**
 * Calculates total sets per muscle group for a given set of workouts
 */
export function calculateSetsPerMuscleGroup(
  workouts: Workout[],
  exercises: Exercise[] = []
): Record<RadarMuscleGroup, number> {
  const result: Record<RadarMuscleGroup, number> = {
    Chest: 0,
    Back: 0,
    Shoulders: 0,
    Arms: 0,
    Legs: 0,
    Core: 0,
  }

  const exMap = new Map<string, Exercise>()
  exercises.forEach((e) => {
    exMap.set(String(e.id), e)
    if (e.name) exMap.set(e.name.toLowerCase().trim(), e)
  })

  workouts.forEach((w) => {
    const sets = Math.max(1, w.sets || 1)
    const { primary, secondary } = classifyWorkoutRow(w, exMap)

    primary.forEach((grp) => {
      result[grp] = (result[grp] || 0) + sets
    })

    secondary.forEach((grp) => {
      if (!primary.includes(grp)) {
        const assisting = Math.max(1, Math.round(sets * 0.5))
        result[grp] = (result[grp] || 0) + assisting
      }
    })
  })

  return result
}

/**
 * Builds the 6-axis Radar chart data comparing current vs previous periods
 */
export function buildRadarChartData(
  currentWorkouts: Workout[],
  previousWorkouts: Workout[],
  exercises: Exercise[] = []
): { data: RadarDataPoint[]; maxSets: number } {
  const currentSets = calculateSetsPerMuscleGroup(currentWorkouts, exercises)
  const previousSets = calculateSetsPerMuscleGroup(previousWorkouts, exercises)

  let maxSets = 0

  const data: RadarDataPoint[] = RADAR_MUSCLE_GROUPS.map((muscle) => {
    const c = currentSets[muscle] || 0
    const p = previousSets[muscle] || 0
    if (c > maxSets) maxSets = c
    if (p > maxSets) maxSets = p

    return {
      muscle,
      current: c,
      previous: p,
    }
  })

  const fullMark = Math.max(10, Math.ceil(maxSets * 1.15))
  data.forEach((d) => {
    d.fullMark = fullMark
  })

  return { data, maxSets }
}

/**
 * Calculates summary stats (Workouts, Duration, Sets, Reps) for workouts
 */
export function calculatePeriodStats(workouts: Workout[]): PeriodStats {
  const sessions = groupWorkoutsIntoSessions(workouts)
  const workoutsCount = sessions.length
  const durationMin = sessions.reduce((acc, s) => acc + s.durationMin, 0)
  const sets = sessions.reduce((acc, s) => acc + s.totalSets, 0)
  const reps = sessions.reduce((acc, s) => acc + s.totalReps, 0)

  let vol = 0
  workouts.forEach((w) => {
    const s = Math.max(1, w.sets || 1)
    const r = w.reps || 0
    const wt = w.weight || 0
    if (wt > 0) vol += wt * (r > 0 ? r : s)
    else if (w.volume && w.volume > 0) vol += w.volume
    else vol += s * r
  })

  return {
    workouts: workoutsCount,
    durationMin,
    sets,
    reps,
    volumeKg: Math.round(vol),
  }
}

/**
 * Returns date range boundaries for equal-length comparison periods
 */
export function getEqualPeriods(
  periodDays: number,
  refDate = new Date()
): {
  currentStart: string
  currentEnd: string
  previousStart: string
  previousEnd: string
} {
  const currentEnd = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate())
  const currentStart = new Date(currentEnd)
  currentStart.setDate(currentStart.getDate() - (periodDays - 1))

  const previousEnd = new Date(currentStart)
  previousEnd.setDate(previousEnd.getDate() - 1)
  const previousStart = new Date(previousEnd)
  previousStart.setDate(previousStart.getDate() - (periodDays - 1))

  return {
    currentStart: toLocalDateStr(currentStart),
    currentEnd: toLocalDateStr(currentEnd),
    previousStart: toLocalDateStr(previousStart),
    previousEnd: toLocalDateStr(previousEnd),
  }
}

/**
 * Returns date range for a specific month and its preceding month
 */
export function getMonthAndPrecedingPeriod(
  year: number,
  monthIndex: number // 0 = Jan, ..., 11 = Dec
): {
  currentMonthName: string
  currentYear: number
  currentStart: string
  currentEnd: string
  previousMonthName: string
  previousYear: number
  previousStart: string
  previousEnd: string
  daysInCurrentMonth: number
  firstDayOfWeek: number // 0 = Sunday, 1 = Monday, ...
} {
  const start = new Date(year, monthIndex, 1)
  const end = new Date(year, monthIndex + 1, 0) // last day of current month

  const prevStart = new Date(year, monthIndex - 1, 1)
  const prevEnd = new Date(year, monthIndex, 0) // last day of prev month

  const currentMonthName = start.toLocaleDateString("en-US", { month: "long" })
  const previousMonthName = prevStart.toLocaleDateString("en-US", { month: "long" })

  return {
    currentMonthName,
    currentYear: year,
    currentStart: toLocalDateStr(start),
    currentEnd: toLocalDateStr(end),
    previousMonthName,
    previousYear: prevStart.getFullYear(),
    previousStart: toLocalDateStr(prevStart),
    previousEnd: toLocalDateStr(prevEnd),
    daysInCurrentMonth: end.getDate(),
    firstDayOfWeek: start.getDay(),
  }
}
