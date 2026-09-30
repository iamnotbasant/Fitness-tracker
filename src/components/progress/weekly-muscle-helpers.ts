import type { Workout, Exercise } from "@/lib/types"

export interface DayInfo {
  date: Date
  dateStr: string // YYYY-MM-DD
  dayAbbr: string // S, M, T, W, T, F, S
  dayName: string // Sun, Mon, Tue, Wed, Thu, Fri, Sat
  dayNumber: number
  isToday: boolean
}

export interface WeekInfo {
  weekNumber: number
  year: number
  weekLabel: string // "Week 40 2026"
  dateRangeLabel: string // "27 Sep – 3 Oct 2026"
  startDateStr: string
  endDateStr: string
  isCurrentWeek: boolean
  isFutureWeek: boolean
  days: DayInfo[]
}

export interface WeeklyMuscleGroupStat {
  key: string
  name: string
  view: "front" | "back" | "both"
  category: "push" | "pull" | "legs" | "core" | "arms"
  primarySets: number
  secondarySets: number
  totalSets: number
  totalReps: number
  role: "primary" | "secondary" | "none"
  intensity: number // 0 to 1 among primary muscles
  exercises: {
    name: string
    sets: number
    reps: number
    isPrimary: boolean
  }[]
}

const DAY_ABBRS = ["S", "M", "T", "W", "T", "F", "S"] as const
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

/**
 * Returns complete Sunday–Saturday week information for a given week offset.
 * Offset 0 is current week, -1 is previous week, etc.
 */
export function getWeekInfo(offset: number = 0, referenceDate: Date = new Date()): WeekInfo {
  const now = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
  const todayY = now.getFullYear()
  const todayM = String(now.getMonth() + 1).padStart(2, "0")
  const todayD = String(now.getDate()).padStart(2, "0")
  const todayStr = `${todayY}-${todayM}-${todayD}`

  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + offset * 7)
  sunday.setHours(0, 0, 0, 0)

  const days: DayInfo[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const dateStr = `${y}-${m}-${day}`
    days.push({
      date: d,
      dateStr,
      dayAbbr: DAY_ABBRS[i],
      dayName: DAY_NAMES[i],
      dayNumber: d.getDate(),
      isToday: dateStr === todayStr,
    })
  }

  // Wednesday of the week (index 3) determines the ISO week number & year
  const wed = days[3].date
  const target = new Date(Date.UTC(wed.getFullYear(), wed.getMonth(), wed.getDate()))
  const dayNr = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNr + 3)
  const firstThursday = target.getUTCFullYear()
  const firstThursdayDate = new Date(Date.UTC(firstThursday, 0, 4))
  const dayDiff = (target.getTime() - firstThursdayDate.getTime()) / 86400000
  const weekNumber = 1 + Math.ceil(dayDiff / 7)
  const year = firstThursday

  const sat = days[6].date
  const startMonth = sunday.toLocaleDateString("en-US", { month: "short" })
  const endMonth = sat.toLocaleDateString("en-US", { month: "short" })
  const dateRangeLabel =
    startMonth === endMonth
      ? `${sunday.getDate()} – ${sat.getDate()} ${endMonth} ${year}`
      : `${sunday.getDate()} ${startMonth} – ${sat.getDate()} ${endMonth} ${year}`

  return {
    weekNumber,
    year,
    weekLabel: `Week ${weekNumber} ${year}`,
    dateRangeLabel,
    startDateStr: days[0].dateStr,
    endDateStr: days[6].dateStr,
    isCurrentWeek: offset === 0,
    isFutureWeek: offset > 0,
    days,
  }
}

export function slugToMuscleKey(slug: string, view?: "front" | "back"): string | null {
  switch (slug) {
    case "chest":
    case "upperChest":
    case "lowerChest":
      return "chest"
    case "abs":
    case "upperAbs":
    case "lowerAbs":
      return "core"
    case "obliques":
    case "serratus":
    case "hipFlexors":
      return "obliques"
    case "biceps":
      return "biceps"
    case "triceps":
      return "triceps"
    case "deltoids":
    case "frontDeltoid":
    case "rearDeltoid":
      return "shoulders"
    case "trapezius":
    case "neck":
      return "traps"
    case "upperBack":
      return "lats"
    case "lowerBack":
      return "lower back"
    case "gluteal":
      return "glutes"
    case "quadriceps":
    case "innerQuad":
    case "outerQuad":
      return "quads"
    case "hamstring":
      return "hamstrings"
    case "calves":
    case "tibialis":
      return "calves"
    case "adductors":
      return view === "back" ? "hamstrings" : "quads"
    case "forearm":
      return "forearms"
    default:
      return null
  }
}

export function normalizeBodyPart(part: string): string {
  const clean = part.toLowerCase().trim()
  if (clean.includes("core") || clean.includes("abs") || clean.includes("abdom")) return "core"
  if (clean.includes("chest") || clean.includes("pec")) return "chest"
  if (clean.includes("shoulder") || clean.includes("delt")) return "shoulders"
  if (clean.includes("bicep")) return "biceps"
  if (clean.includes("tricep")) return "triceps"
  if (clean.includes("forearm") || clean.includes("grip") || clean.includes("wrist")) return "forearms"
  if (clean.includes("oblique") || clean.includes("serratus")) return "obliques"
  if (clean.includes("neck") || clean.includes("cervical") || clean.includes("trap") || clean.includes("upper back"))
    return "traps"
  if (clean.includes("lower back") || clean.includes("lumbar")) return "lower back"
  if (clean.includes("lat") || clean.includes("back")) return "lats"
  if (clean.includes("glute") || clean.includes("abductor")) return "glutes"
  if (
    clean.includes("quad") ||
    clean.includes("adductor") ||
    clean.includes("inner thigh") ||
    clean.includes("groin") ||
    clean.includes("leg")
  )
    return "quads"
  if (clean.includes("hamstring")) return "hamstrings"
  if (clean.includes("calv") || clean.includes("tibialis")) return "calves"
  return clean
}

export const EXERCISE_TARGET_DICTIONARY: Record<string, { primary: string[]; secondary?: string[] }> = {
  "push up": { primary: ["chest"], secondary: ["triceps", "shoulders", "core"] },
  "push-up": { primary: ["chest"], secondary: ["triceps", "shoulders", "core"] },
  "pushup": { primary: ["chest"], secondary: ["triceps", "shoulders", "core"] },
  "incline push": { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  "archer push": { primary: ["chest"], secondary: ["triceps", "shoulders", "core"] },
  "diamond push": { primary: ["triceps", "chest"], secondary: ["shoulders"] },
  "pseudo planche": { primary: ["shoulders"], secondary: ["chest", "core", "forearms"] },
  "bench press": { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  "chest fly": { primary: ["chest"], secondary: ["shoulders"] },
  "dip": { primary: ["chest", "triceps"], secondary: ["shoulders"] },
  "dips": { primary: ["chest", "triceps"], secondary: ["shoulders"] },
  "chair dip": { primary: ["triceps"], secondary: ["chest", "shoulders"] },
  "pull up": { primary: ["lats"], secondary: ["biceps", "forearms", "traps"] },
  "pull-up": { primary: ["lats"], secondary: ["biceps", "forearms", "traps"] },
  "pullup": { primary: ["lats"], secondary: ["biceps", "forearms", "traps"] },
  "chin up": { primary: ["biceps", "lats"], secondary: ["forearms", "traps"] },
  "chin-up": { primary: ["biceps", "lats"], secondary: ["forearms", "traps"] },
  "pike push": { primary: ["shoulders"], secondary: ["triceps", "traps", "core"] },
  "overhead press": { primary: ["shoulders"], secondary: ["triceps", "traps"] },
  "handstand": { primary: ["shoulders"], secondary: ["triceps", "core"] },
  "lateral raise": { primary: ["shoulders"], secondary: ["traps"] },
  "row": { primary: ["lats", "traps"], secondary: ["biceps", "lower back"] },
  "inverted row": { primary: ["lats", "traps"], secondary: ["biceps", "forearms"] },
  "bar hang": { primary: ["forearms"], secondary: ["lats", "shoulders"] },
  "dead hang": { primary: ["forearms"], secondary: ["lats", "shoulders"] },
  "squat": { primary: ["quads", "glutes"], secondary: ["hamstrings", "calves", "core"] },
  "pistol squat": { primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"] },
  "lunge": { primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"] },
  "bulgarian split": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  "glute bridge": { primary: ["glutes"], secondary: ["hamstrings", "lower back"] },
  "leg raise": { primary: ["core"], secondary: ["obliques"] },
  "plank": { primary: ["core"], secondary: ["shoulders", "obliques"] },
  "side plank": { primary: ["obliques"], secondary: ["core", "shoulders"] },
  "mountain climber": { primary: ["core"], secondary: ["shoulders", "quads"] },
  "bicep curl": { primary: ["biceps"], secondary: ["forearms"] },
  "tricep extension": { primary: ["triceps"] },
  "calf raise": { primary: ["calves"] },
  "jump squat": { primary: ["quads", "glutes"], secondary: ["calves"] },
}

export function derivePrimaryAndSecondaryMuscles(
  exerciseName: string,
  exercise?: Exercise
): { primary: string[]; secondary: string[] } {
  const nameLower = (exerciseName || exercise?.name || "").toLowerCase().trim()

  // 1. Check dictionary by name match
  for (const [key, mapping] of Object.entries(EXERCISE_TARGET_DICTIONARY)) {
    if (nameLower.includes(key)) {
      const primary = mapping.primary
      const secondary = (mapping.secondary || []).filter((s) => !primary.includes(s))
      return { primary, secondary }
    }
  }

  // 2. Check exercise.bodyParts (first element = primary, subsequent = secondary)
  if (exercise?.bodyParts && exercise.bodyParts.length > 0) {
    const normalized = exercise.bodyParts.map(normalizeBodyPart).filter(Boolean)
    if (normalized.length > 0) {
      const primary = [normalized[0]]
      const secondary = Array.from(new Set(normalized.slice(1).filter((m) => m !== primary[0])))
      return { primary, secondary }
    }
  }

  // 3. Fallback to exercise.split
  if (exercise?.split) {
    const split = exercise.split.toLowerCase()
    if (split === "push") return { primary: ["chest"], secondary: ["shoulders", "triceps"] }
    if (split === "pull") return { primary: ["lats"], secondary: ["biceps", "traps"] }
    if (split === "legs") return { primary: ["quads"], secondary: ["glutes", "hamstrings", "calves"] }
    if (split === "core") return { primary: ["core"], secondary: ["obliques"] }
    if (split === "arms") return { primary: ["biceps"], secondary: ["triceps", "forearms"] }
  }

  return { primary: ["chest"], secondary: [] }
}

export function computeWeeklyMuscleStats(
  workouts: Workout[],
  exercises: Exercise[]
): Record<string, WeeklyMuscleGroupStat> {
  const stats: Record<string, WeeklyMuscleGroupStat> = {
    chest: { key: "chest", name: "Chest", view: "front", category: "push", primarySets: 0, secondarySets: 0, totalSets: 0, totalReps: 0, role: "none", intensity: 0, exercises: [] },
    shoulders: { key: "shoulders", name: "Shoulders", view: "both", category: "push", primarySets: 0, secondarySets: 0, totalSets: 0, totalReps: 0, role: "none", intensity: 0, exercises: [] },
    biceps: { key: "biceps", name: "Biceps", view: "front", category: "arms", primarySets: 0, secondarySets: 0, totalSets: 0, totalReps: 0, role: "none", intensity: 0, exercises: [] },
    triceps: { key: "triceps", name: "Triceps", view: "back", category: "arms", primarySets: 0, secondarySets: 0, totalSets: 0, totalReps: 0, role: "none", intensity: 0, exercises: [] },
    forearms: { key: "forearms", name: "Forearms", view: "both", category: "arms", primarySets: 0, secondarySets: 0, totalSets: 0, totalReps: 0, role: "none", intensity: 0, exercises: [] },
    core: { key: "core", name: "Abdominals", view: "front", category: "core", primarySets: 0, secondarySets: 0, totalSets: 0, totalReps: 0, role: "none", intensity: 0, exercises: [] },
    obliques: { key: "obliques", name: "Obliques", view: "front", category: "core", primarySets: 0, secondarySets: 0, totalSets: 0, totalReps: 0, role: "none", intensity: 0, exercises: [] },
    lats: { key: "lats", name: "Lats", view: "back", category: "pull", primarySets: 0, secondarySets: 0, totalSets: 0, totalReps: 0, role: "none", intensity: 0, exercises: [] },
    traps: { key: "traps", name: "Traps", view: "back", category: "pull", primarySets: 0, secondarySets: 0, totalSets: 0, totalReps: 0, role: "none", intensity: 0, exercises: [] },
    "lower back": { key: "lower back", name: "Lower Back", view: "back", category: "pull", primarySets: 0, secondarySets: 0, totalSets: 0, totalReps: 0, role: "none", intensity: 0, exercises: [] },
    glutes: { key: "glutes", name: "Glutes", view: "back", category: "legs", primarySets: 0, secondarySets: 0, totalSets: 0, totalReps: 0, role: "none", intensity: 0, exercises: [] },
    quads: { key: "quads", name: "Quads", view: "front", category: "legs", primarySets: 0, secondarySets: 0, totalSets: 0, totalReps: 0, role: "none", intensity: 0, exercises: [] },
    hamstrings: { key: "hamstrings", name: "Hamstrings", view: "back", category: "legs", primarySets: 0, secondarySets: 0, totalSets: 0, totalReps: 0, role: "none", intensity: 0, exercises: [] },
    calves: { key: "calves", name: "Calves", view: "both", category: "legs", primarySets: 0, secondarySets: 0, totalSets: 0, totalReps: 0, role: "none", intensity: 0, exercises: [] },
  }

  const exIdMap = new Map<string, Exercise>()
  const exNameMap = new Map<string, Exercise>()
  exercises.forEach((ex) => {
    exIdMap.set(String(ex.id), ex)
    if (ex.name) exNameMap.set(ex.name.toLowerCase().trim(), ex)
  })

  workouts.forEach((w) => {
    const exName = w.exerciseName || w.name || "Exercise"
    const ex =
      exIdMap.get(String(w.exerciseId)) ||
      exNameMap.get(exName.toLowerCase().trim())

    const sets = Math.max(1, w.sets || 1)
    const reps = sets * (w.reps || 0)

    const { primary, secondary } = derivePrimaryAndSecondaryMuscles(exName, ex)

    primary.forEach((mKey) => {
      const item = stats[mKey]
      if (!item) return
      item.primarySets += sets
      item.totalSets += sets
      item.totalReps += reps

      const existing = item.exercises.find((e) => e.name.toLowerCase() === exName.toLowerCase() && e.isPrimary)
      if (existing) {
        existing.sets += sets
        existing.reps += reps
      } else {
        item.exercises.push({ name: exName, sets, reps, isPrimary: true })
      }
    })

    secondary.forEach((mKey) => {
      if (primary.includes(mKey)) return
      const item = stats[mKey]
      if (!item) return
      item.secondarySets += sets
      item.totalSets += sets
      item.totalReps += reps

      const existing = item.exercises.find((e) => e.name.toLowerCase() === exName.toLowerCase() && !e.isPrimary)
      if (existing) {
        existing.sets += sets
        existing.reps += reps
      } else {
        item.exercises.push({ name: exName, sets, reps, isPrimary: false })
      }
    })
  })

  // Assign roles:
  // - If primarySets > 0: "primary"
  // - Else if secondarySets > 0: "secondary"
  // - Else: "none"
  const primaryMuscles = Object.values(stats).filter((m) => m.primarySets > 0)
  const maxPrimarySets = Math.max(1, ...primaryMuscles.map((m) => m.primarySets))

  Object.values(stats).forEach((m) => {
    if (m.primarySets > 0) {
      m.role = "primary"
      m.intensity = Number((m.primarySets / maxPrimarySets).toFixed(3))
    } else if (m.secondarySets > 0) {
      m.role = "secondary"
      m.intensity = 0
    } else {
      m.role = "none"
      m.intensity = 0
    }
  })

  return stats
}

export function getMuscleColors(
  stat: WeeklyMuscleGroupStat | null,
  isHovered: boolean,
  isSelected: boolean
): { fill: string; stroke: string; strokeWidth: number } {
  if (isSelected) {
    return { fill: "#ffffff", stroke: "#ffffff", strokeWidth: 2.5 }
  }

  if (!stat || stat.role === "none") {
    return {
      fill: isHovered ? "#27272a" : "#18181b",
      stroke: isHovered ? "#52525b" : "#27272a",
      strokeWidth: isHovered ? 1.5 : 0.8,
    }
  }

  if (stat.role === "secondary") {
    // Dim grey: secondary muscles worked
    return {
      fill: isHovered ? "#52525b" : "#3f3f46",
      stroke: isHovered ? "#ffffff" : "#52525b",
      strokeWidth: isHovered ? 2 : 1.2,
    }
  }

  // Primary: bright white intensity scale (brighter = more sets)
  let fill = "#71717a"
  let stroke = "#a1a1aa"

  if (stat.intensity > 0.75) {
    fill = "#ffffff"
    stroke = "#ffffff"
  } else if (stat.intensity > 0.50) {
    fill = "#e4e4e7"
    stroke = "#ffffff"
  } else if (stat.intensity > 0.25) {
    fill = "#a1a1aa"
    stroke = "#d4d4d8"
  } else {
    fill = "#71717a"
    stroke = "#a1a1aa"
  }

  if (isHovered) {
    fill = "#ffffff"
    stroke = "#ffffff"
  }

  return {
    fill,
    stroke,
    strokeWidth: isHovered ? 2.2 : 1.4,
  }
}
