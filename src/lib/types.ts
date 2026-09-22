export type ID = string

export type Exercise = {
  id: ID
  name: string
  description?: string
  imageUrl?: string
  type?: "standard" | "timer" | "weighted" | "bodyweight" | "cardio" | "mobility"
  bodyParts?: string[]
  tags?: string[]
  level?: number
  split?: "push" | "pull" | "legs" | "upper" | "lower" | "full" | "core" | "other"
  repGoal?: number
}

export type SetType = "normal" | "warmup" | "dropset" | "failure"

export type Workout = {
  id: ID
  name?: string
  workoutName?: string
  routineId?: ID | number
  date: string
  time?: string
  exerciseId: ID
  exerciseName: string
  sets: number
  reps: number
  rest?: number
  notes?: string
  points?: number
  bonusPoints?: number
  exerciseLevel?: number
  total_points?: number
  timeSeconds?: number
  weight?: number
  volume?: number
  setNumber?: number
  durationSeconds?: number // Total workout session duration
  setType?: SetType
}

export type Goal = {
  exerciseId: ID
  targetReps?: number
  targetPoints?: number
  targetVolume?: number
}

export type Profile = {
  name: string
  heightCm?: number
  weightKg?: number
  goalType?: "strength" | "endurance" | "skill"
  goals: Goal[]
}

export type SessionSet = {
  reps?: number
  weight?: number
  timeSeconds?: number
  done?: boolean
  setType?: SetType
  userEntered?: boolean
}

export type SessionExercise = {
  id: ID
  exerciseId: ID
  name: string
  split?: Exercise["split"]
  level?: Exercise["level"]
  notes?: string
  restEnabled?: boolean
  restSec?: number
  sets: SessionSet[]
}

export type WorkoutSession = {
  id: ID
  userId?: string
  createdAt?: string | number | Date
  startedAt: string // ISO
  finishedAt?: string // ISO
  items: SessionExercise[]
  routineId?: string
  status?: string
}

export type RoutineExercise = {
  exerciseId: ID
  exerciseName: string
  split?: Exercise["split"]
  level?: Exercise["level"]
  type?: Exercise["type"]
  defaultSets: number
  defaultReps?: number
  defaultTimeSeconds?: number
  defaultWeight?: number
  restSec?: number
  notes?: string
}

export type Routine = {
  id: ID
  name: string
  description?: string
  exercises: RoutineExercise[]
  createdAt: string
  lastUsed?: string
}