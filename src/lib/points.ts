/**
 * Unified Points Calculation Engine for Workouts
 * Shared across frontend (offline optimistic calculation) and backend (API routes)
 */

export interface PointsCalculationParams {
  exerciseType?: string | null
  sets?: number | null
  reps?: number | null
  timeSeconds?: number | null
  weight?: number | null
  level?: number | string | null
  bonusPoints?: number | null
}

export function parseExerciseLevel(level: number | string | null | undefined): number {
  if (level === undefined || level === null || level === "") return 1
  if (typeof level === "number") {
    // Reward level 0 (mobility/warmup) with 0.8x instead of 0
    return level <= 0 ? 0.8 : Math.min(level, 10)
  }
  const str = String(level).trim().toLowerCase()
  if (str === "beginner") return 1
  if (str === "intermediate") return 2
  if (str === "advanced") return 3
  const parsed = parseFloat(str)
  if (!isNaN(parsed)) {
    return parsed <= 0 ? 0.8 : Math.min(parsed, 10)
  }
  return 1
}

/**
 * Calculates fair, balanced workout points based on exercise type, volume, and intensity.
 *
 * Balance Philosophy:
 * - Bodyweight: 2 points per rep * level
 * - Timer: 1 point per 3 seconds * level (e.g., 60s plank = 20 pts)
 * - Weighted: (2 pts per rep + 0.05 per kg-rep) * level (e.g., 80kg x 10 reps = 60 pts)
 * - Multi-set: Multiplies by number of sets
 * - Anti-cheat / Typo cap: Max 250 points per single set
 */
export function calculateWorkoutPoints(params: PointsCalculationParams): {
  points: number
  bonusPoints: number
  totalPoints: number
} {
  const sets = Math.max(1, Number(params.sets) || 1)
  const reps = Math.max(0, Number(params.reps) || 0)
  const timeSeconds = Math.max(0, Number(params.timeSeconds) || 0)
  const weight = Math.max(0, Number(params.weight) || 0)
  const levelMultiplier = parseExerciseLevel(params.level)
  const bonus = Math.max(0, Number(params.bonusPoints) || 0)

  const typeStr = String(params.exerciseType || "").toLowerCase()
  const isTimer = timeSeconds > 0 || typeStr.includes("timer") || typeStr.includes("plank") || typeStr.includes("hang")
  const isWeighted = weight > 0 || typeStr.includes("weighted")

  let pointsPerSet = 0

  if (isTimer) {
    // 1 point per 3 seconds (60s = 20 points)
    // Capped at 600 seconds (10 min) per set to prevent runaway points on stopwatch left running
    const effectiveSeconds = Math.min(timeSeconds, 600)
    pointsPerSet = Math.round((effectiveSeconds / 3) * levelMultiplier)
  } else if (isWeighted) {
    // Base reps + progressive weight factor
    // 80kg x 10 reps = 20 + 40 = 60 points per set
    // 20kg x 10 reps = 20 + 10 = 30 points per set
    const baseRepPoints = reps * 2
    const weightFactor = weight * reps * 0.05
    pointsPerSet = Math.round((baseRepPoints + weightFactor) * levelMultiplier)
  } else {
    // Standard bodyweight: 2 points per rep
    // 10 chin-ups = 20 points per set
    // 15 push-ups = 30 points per set
    pointsPerSet = Math.round(reps * 2 * levelMultiplier)
  }

  // Ensure minimum 1 point per completed set if exercise was performed,
  // and cap at 250 points per single set to protect against typos
  pointsPerSet = Math.max(1, Math.min(pointsPerSet, 250))

  const totalBasePoints = Math.round(pointsPerSet * sets)
  const totalPoints = totalBasePoints + bonus

  return {
    points: totalBasePoints,
    bonusPoints: bonus,
    totalPoints,
  }
}
