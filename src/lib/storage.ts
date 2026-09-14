"use client"

import type { Exercise, Workout, Profile, WorkoutSession, Routine } from "./types"
import { sampleExercises, sampleWorkouts, sampleProfile } from "./sample-data"

const KEY_EXERCISES = "ft_exercises"
const KEY_WORKOUTS = "ft_workouts"
const KEY_PROFILE = "ft_profile"
const KEY_ACTIVE_SESSION = "ft_active_session"
const KEY_ROUTINES = "ft_routines"

const safeParse = <T,>(txt: string | null, fallback: T): T => {
  try {
    return txt ? (JSON.parse(txt) as T) : fallback
  } catch {
    return fallback
  }
}

const ensureSeeded = () => {
  const ex = localStorage.getItem(KEY_EXERCISES)
  const wk = localStorage.getItem(KEY_WORKOUTS)
  const pf = localStorage.getItem(KEY_PROFILE)
  if (!ex) localStorage.setItem(KEY_EXERCISES, JSON.stringify(sampleExercises))
  if (!wk) localStorage.setItem(KEY_WORKOUTS, JSON.stringify(sampleWorkouts))
  if (!pf) localStorage.setItem(KEY_PROFILE, JSON.stringify(sampleProfile))
}

export const storage = {
  getExercises(): Exercise[] {
    ensureSeeded()
    return safeParse<Exercise[]>(typeof window !== "undefined" ? localStorage.getItem(KEY_EXERCISES) : null, [])
  },
  setExercises(list: Exercise[]) {
    localStorage.setItem(KEY_EXERCISES, JSON.stringify(list))
  },
  addExercise(name: string): Exercise {
    const list = storage.getExercises()
    const exists = list.find((e) => e.name.toLowerCase() === name.toLowerCase())
    if (exists) return exists
    const ex: Exercise = { id: `ex-${crypto.randomUUID()}`, name }
    list.push(ex)
    storage.setExercises(list)
    return ex
  },
  // NEW: create exercise with full payload
  createExercise(payload: Omit<Exercise, "id">): Exercise {
    const list = storage.getExercises()
    const ex: Exercise = { id: `ex-${crypto.randomUUID()}`, ...payload }
    list.push(ex)
    storage.setExercises(list)
    return ex
  },
  updateExercise(exercise: Exercise) {
    const list = storage.getExercises()
    const idx = list.findIndex((e) => e.id === exercise.id)
    if (idx >= 0) {
      list[idx] = exercise
      storage.setExercises(list)
    }
  },
  deleteExercise(id: string) {
    const list = storage.getExercises().filter((e) => e.id !== id)
    storage.setExercises(list)
  },

  getWorkouts(): Workout[] {
    ensureSeeded()
    return safeParse<Workout[]>(typeof window !== "undefined" ? localStorage.getItem(KEY_WORKOUTS) : null, [])
  },
  setWorkouts(list: Workout[]) {
    localStorage.setItem(KEY_WORKOUTS, JSON.stringify(list))
  },
  upsertWorkout(w: Workout) {
    const list = storage.getWorkouts()
    const idx = list.findIndex((x) => x.id === w.id)
    if (idx >= 0) list[idx] = w
    else list.unshift(w) // newest first
    storage.setWorkouts(list)
  },
  deleteWorkout(id: string) {
    const list = storage.getWorkouts().filter((w) => w.id !== id)
    storage.setWorkouts(list)
  },

  getProfile(): Profile {
    ensureSeeded()
    return safeParse<Profile>(typeof window !== "undefined" ? localStorage.getItem(KEY_PROFILE) : null, {
      name: "",
      goals: [],
    })
  },
  setProfile(p: Profile) {
    localStorage.setItem(KEY_PROFILE, JSON.stringify(p))
  },

  // NEW: Active session management
  getActiveSession(): WorkoutSession | null {
    if (typeof window === "undefined") return null
    return safeParse<WorkoutSession | null>(localStorage.getItem(KEY_ACTIVE_SESSION), null)
  },
  
  createSession(): WorkoutSession {
    const session: WorkoutSession = {
      id: `session-${crypto.randomUUID()}`,
      startedAt: new Date().toISOString(),
      items: [],
    }
    localStorage.setItem(KEY_ACTIVE_SESSION, JSON.stringify(session))
    return session
  },
  
  saveSession(session: WorkoutSession) {
    localStorage.setItem(KEY_ACTIVE_SESSION, JSON.stringify(session))
  },
  
  clearSession() {
    localStorage.removeItem(KEY_ACTIVE_SESSION)
  },

  // NEW: Routine management
  getRoutines(): Routine[] {
    if (typeof window === "undefined") return []
    return safeParse<Routine[]>(localStorage.getItem(KEY_ROUTINES), [])
  },
  
  setRoutines(list: Routine[]) {
    localStorage.setItem(KEY_ROUTINES, JSON.stringify(list))
  },
  
  createRoutine(routine: Omit<Routine, "id" | "createdAt">): Routine {
    const list = storage.getRoutines()
    const newRoutine: Routine = {
      id: `routine-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...routine,
    }
    list.unshift(newRoutine)
    storage.setRoutines(list)
    return newRoutine
  },
  
  updateRoutine(routine: Routine) {
    const list = storage.getRoutines()
    const idx = list.findIndex((r) => r.id === routine.id)
    if (idx >= 0) {
      list[idx] = routine
      storage.setRoutines(list)
    }
  },
  
  deleteRoutine(id: string) {
    const list = storage.getRoutines().filter((r) => r.id !== id)
    storage.setRoutines(list)
  },
  
  markRoutineUsed(id: string) {
    const list = storage.getRoutines()
    const routine = list.find((r) => r.id === id)
    if (routine) {
      routine.lastUsed = new Date().toISOString()
      storage.setRoutines(list)
    }
  },

  exportJSON(): string {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      exercises: storage.getExercises(),
      workouts: storage.getWorkouts(),
      profile: storage.getProfile(),
      routines: storage.getRoutines(),
    }
    return JSON.stringify(payload, null, 2)
  },

  exportCSV(): string {
    const workouts = storage.getWorkouts()
    const header = "date,time,exercise,sets,reps,rest,notes,volume"
    const rows = workouts.map((w) =>
      [
        w.date,
        w.time ?? "",
        w.exerciseName.replaceAll(",", " "),
        w.sets,
        w.reps,
        w.rest ?? "",
        (w.notes ?? "").replaceAll(",", " "),
        w.volume,
      ].join(","),
    )
    return [header, ...rows].join("\n")
  },

  importJSON(jsonText: string, mode: "merge" | "replace" = "merge"): { ok: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonText)
      const ex: Exercise[] = parsed.exercises ?? []
      const wk: Workout[] = parsed.workouts ?? []
      const pf: Profile | undefined = parsed.profile

      if (mode === "replace") {
        storage.setExercises(ex)
        storage.setWorkouts(wk)
        if (pf) storage.setProfile(pf)
      } else {
        // merge
        const existingEx = storage.getExercises()
        const mergedEx = [...existingEx, ...ex.filter((e) => !existingEx.some((x) => x.id === e.id))]
        storage.setExercises(mergedEx)

        const existingWk = storage.getWorkouts()
        const mergedWk = [...wk, ...existingWk.filter((x) => !wk.some((w) => w.id === x.id))]
        storage.setWorkouts(mergedWk)

        if (pf) {
          const cur = storage.getProfile()
          storage.setProfile({ ...cur, ...pf })
        }
      }
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Invalid JSON" }
    }
  },
}