"use client"

import useSWR from "swr"
import type { Exercise, Workout, Profile, WorkoutSession, SessionExercise, Routine, RoutineExercise } from "@/lib/types"
import { useSession } from "@/lib/auth-client"

const fetcher = async (url: string) => {
  const token = localStorage.getItem("bearer_token")
  const res = await fetch(url, {
    credentials: "include",
    headers: token ? {
      Authorization: `Bearer ${token}`,
    } : {},
  })
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

// Helper to get local date string in YYYY-MM-DD format
const getLocalDateString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to get local time string in HH:MM format
const getLocalTimeString = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function useExercises() {
  const { data, mutate, isLoading } = useSWR<Exercise[]>(
    "/api/exercises?limit=10000",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
    }
  )

  const add = async (name: string) => {
    const token = localStorage.getItem("bearer_token")
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "include",
      body: JSON.stringify({ name }),
    })
    if (!res.ok) throw new Error("Failed to add exercise")
    const result = await res.json()
    await mutate()
    return result
  }

  const create = async (payload: Omit<Exercise, "id">) => {
    const token = localStorage.getItem("bearer_token")
    if (!token) {
      throw new Error("Not authenticated. Please log in again.")
    }
    
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify(payload),
    })
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error("Failed to create exercise:", res.status, errorData)
      throw new Error(errorData.error || errorData.message || `Failed to create exercise (${res.status})`)
    }
    
    const result = await res.json()
    await mutate()
    return result
  }

  const update = async (ex: Exercise) => {
    const token = localStorage.getItem("bearer_token")
    const res = await fetch(`/api/exercises/${ex.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "include",
      body: JSON.stringify(ex),
    })
    if (!res.ok) throw new Error("Failed to update exercise")
    await mutate()
  }

  const remove = async (id: string) => {
    const token = localStorage.getItem("bearer_token")
    const res = await fetch(`/api/exercises/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: token ? {
        Authorization: `Bearer ${token}`,
      } : {},
    })
    if (!res.ok) throw new Error("Failed to delete exercise")
    await mutate()
  }

  return { exercises: data ?? [], add, create, update, remove, refresh: () => mutate(), isLoading }
}

export function useWorkouts() {
  const { data, mutate, isLoading } = useSWR<{ workouts: Workout[] }>(
    "/api/workouts?limit=10000",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 30000,
    }
  )

  const upsert = async (payload: Omit<Workout, "volume"> & { volume?: number }) => {
    const token = localStorage.getItem("bearer_token")
    const volume = payload.volume ?? payload.sets * payload.reps
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "include",
      body: JSON.stringify({ ...payload, volume }),
    })
    if (!res.ok) throw new Error("Failed to upsert workout")
    await mutate()
  }

  const remove = async (id: string) => {
    const token = localStorage.getItem("bearer_token")
    const res = await fetch(`/api/workouts/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: token ? {
        Authorization: `Bearer ${token}`,
      } : {},
    })
    if (!res.ok) throw new Error("Failed to delete workout")
    await mutate()
  }

  const saveWorkouts = async (list: Workout[]) => {
    const token = localStorage.getItem("bearer_token")
    await Promise.all(
      list.map((w) =>
        fetch("/api/workouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: "include",
          body: JSON.stringify(w),
        })
      )
    )
    await mutate()
  }

  return { workouts: data?.workouts ?? [], upsert, remove, saveWorkouts, refresh: () => mutate(), isLoading }
}

export function useProfile() {
  const { data, mutate } = useSWR<{ profile: Profile }>(
    "/api/profile",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  const save = async (p: Profile) => {
    const token = localStorage.getItem("bearer_token")
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "include",
      body: JSON.stringify(p),
    })
    if (!res.ok) throw new Error("Failed to save profile")
    await mutate()
  }

  return { profile: data?.profile ?? { name: "", goals: [] }, save, refresh: () => mutate() }
}

// Debounce helper
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

export function useActiveSession() {
  const { data: session } = useSession()
  
  const customFetcher = async (url: string) => {
    const token = localStorage.getItem("bearer_token")
    const res = await fetch(`${url}?status=active&limit=1`, {
      credentials: "include",
      headers: token ? {
        Authorization: `Bearer ${token}`,
      } : {},
    })
    if (!res.ok) throw new Error("Failed to fetch")
    const sessions = await res.json()
    return { session: sessions.length > 0 ? sessions[0] : null }
  }

  const { data, mutate } = useSWR<{ session: WorkoutSession | null }>(
    "/api/workout-sessions",
    customFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
    }
  )

  const start = async (routineId?: string) => {
    const token = localStorage.getItem("bearer_token")
    const now = new Date()
    const localDatetime = `${getLocalDateString(now)}T${getLocalTimeString(now)}:00`
    
    const res = await fetch("/api/workout-sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "include",
      body: JSON.stringify({ 
        startedAt: localDatetime,
        items: [],
        routineId 
      }),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
      console.error("Failed to start session:", errorData)
      throw new Error(`Failed to start session: ${errorData.error || errorData.code || res.statusText}`)
    }
    const result = await res.json()
    await mutate()
    return result
  }

  const addExercise = async (exercise: Pick<SessionExercise, "id" | "name" | "split" | "level">) => {
    const token = localStorage.getItem("bearer_token")
    if (!data?.session) {
      console.error("No active session found")
      return
    }
    
    const exerciseRes = await fetch(`/api/exercises/${exercise.id}`, {
      credentials: "include",
      headers: token ? {
        Authorization: `Bearer ${token}`,
      } : {},
    })
    const exerciseData = await exerciseRes.json()
    const isTimerExercise = exerciseData?.type === "timer"
    
    const newItem: SessionExercise = {
      id: `item-${crypto.randomUUID()}`,
      exerciseId: exercise.id,
      name: exercise.name,
      split: exercise.split,
      level: exercise.level,
      notes: "",
      restEnabled: true,
      restSec: 60,
      sets: [isTimerExercise ? { timeSeconds: 0, done: false } : { reps: 0, done: false }],
    }
    
    const { userId, id, createdAt, ...sessionData } = data.session
    const updatedItems = [...data.session.items, newItem]
    
    const res = await fetch(`/api/workout-sessions?id=${data.session.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "include",
      body: JSON.stringify({ ...sessionData, items: updatedItems }),
    })
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
      console.error("Failed to add exercise:", errorData)
      throw new Error(`Failed to add exercise: ${errorData.error || errorData.code || res.statusText}`)
    }
    
    await mutate()
  }

  // Debounced API save — fires 800ms after last call, no re-fetch on success
  const debouncedSave = debounce(async (sessionId: string, sessionData: any, items: SessionExercise[]) => {
    const token = localStorage.getItem("bearer_token")
    try {
      const res = await fetch(`/api/workout-sessions?id=${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify({ ...sessionData, items }),
      })
      if (!res.ok) {
        console.error("Failed to save exercise update, will retry on next change")
      }
    } catch (e) {
      console.error("Network error saving exercise update:", e)
    }
  }, 800)

  const updateExercise = (itemId: string, updater: (e: SessionExercise) => SessionExercise) => {
    if (!data?.session) return
    
    const { userId, id, createdAt, ...sessionData } = data.session
    const updatedItems = data.session.items.map((item) => (item.id === itemId ? updater(item) : item))
    
    // Optimistic update — UI updates instantly, no waiting for API
    mutate({ session: { ...data.session, items: updatedItems } }, { revalidate: false })
    
    // Debounced save to API — only fires after 800ms of no changes
    debouncedSave(data.session.id, sessionData, updatedItems)
  }

  const removeExercise = async (itemId: string) => {
    const token = localStorage.getItem("bearer_token")
    if (!data?.session) return
    
    const { userId, id, createdAt, ...sessionData } = data.session
    const updatedItems = data.session.items.filter((item) => item.id !== itemId)
    
    const res = await fetch(`/api/workout-sessions?id=${data.session.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "include",
      body: JSON.stringify({ ...sessionData, items: updatedItems }),
    })
    if (!res.ok) throw new Error("Failed to remove exercise")
    await mutate()
  }

  const discard = async () => {
    const token = localStorage.getItem("bearer_token")
    if (!data?.session) return
    const res = await fetch(`/api/workout-sessions?id=${data.session.id}`, {
      method: "DELETE",
      credentials: "include",
      headers: token ? {
        Authorization: `Bearer ${token}`,
      } : {},
    })
    if (!res.ok) throw new Error("Failed to discard session")
    await mutate()
  }

  const finish = async (existingWorkouts: Workout[], actualDurationSeconds?: number, editedItems?: SessionExercise[], editedDate?: string, editedTime?: string) => {
    const token = localStorage.getItem("bearer_token")
    if (!data?.session) {
      console.log("No active session to finish")
      return existingWorkouts
    }

    console.log("Finishing session with items:", data.session.items.length)
    const finishedSession = { ...data.session, finishedAt: new Date().toISOString() }
    const newWorkouts: any[] = []

    const itemsToSave = editedItems || data.session.items

    let localDate: string
    let localTime: string
    
    if (editedDate && editedTime) {
      localDate = editedDate
      localTime = editedTime
    } else {
      const startedAtStr = data.session.startedAt
      
      if (startedAtStr.includes('T')) {
        const [datePart, timePart] = startedAtStr.split('T')
        localDate = datePart
        localTime = timePart.slice(0, 5)
      } else {
        const now = new Date()
        localDate = getLocalDateString(now)
        localTime = getLocalTimeString(now)
      }
    }

    itemsToSave.forEach((item) => {
      const completedSets = item.sets.filter((s) => s.done)
      
      if (completedSets.length === 0) {
        console.log(`Skipping ${item.name} - no completed sets`)
        return
      }

      completedSets.forEach((set, setIndex) => {
        const isTimeBased = set.timeSeconds !== undefined && set.timeSeconds > 0
        
        let volume: number
        if (isTimeBased) {
          volume = set.timeSeconds || 0
        } else {
          const reps = set.reps || 0
          const weight = set.weight || 0
          volume = weight > 0 ? reps * weight : reps
        }
        
        const workout: any = {
          date: localDate,
          time: localTime,
          exerciseId: item.exerciseId,
          exerciseName: item.name,
          sets: 1,
          reps: isTimeBased ? 1 : (set.reps || 0),
          volume: volume,
        }
        
        if (item.restEnabled && item.restSec) {
          workout.rest = item.restSec
        }
        if (item.notes) {
          workout.notes = item.notes
        }
        if (isTimeBased && set.timeSeconds) {
          workout.timeSeconds = set.timeSeconds
        }
        if (set.weight) {
          workout.weight = set.weight
        }
        if (actualDurationSeconds) {
          workout.durationSeconds = actualDurationSeconds
        }
        
        console.log(`Created workout for set ${setIndex + 1}:`, workout)
        newWorkouts.push(workout)
      })
    })

    console.log(`Saving ${newWorkouts.length} workouts...`)
    
    const saveResults = await Promise.all(
      newWorkouts.map(async (w) => {
        try {
          const res = await fetch("/api/workouts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            credentials: "include",
            body: JSON.stringify(w),
          })
          const responseData = await res.json()
          console.log("Save workout response:", res.status, responseData)
          if (!res.ok) {
            console.error("Failed to save workout:", responseData)
            throw new Error(`Failed to save workout: ${responseData.error || res.statusText}`)
          }
          return responseData
        } catch (error) {
          console.error("Error saving workout:", error)
          throw error
        }
      })
    )

    console.log("All workouts saved successfully!", saveResults)

    await fetch(`/api/workout-sessions?id=${data.session.id}`, {
      method: "DELETE",
      credentials: "include",
      headers: token ? {
        Authorization: `Bearer ${token}`,
      } : {},
    })

    console.log("Session deleted, refreshing workout list...")
    await mutate()
    
    return [...saveResults, ...existingWorkouts]
  }

  return {
    session: data?.session ?? null,
    start,
    addExercise,
    updateExercise,
    removeExercise,
    discard,
    finish,
  }
}

export function useRoutines() {
  const { data, mutate } = useSWR<{ routines: Routine[] }>(
    "/api/routines?limit=10000",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  const create = async (routine: Omit<Routine, "id" | "createdAt">) => {
    const token = localStorage.getItem("bearer_token")
    const res = await fetch("/api/routines", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "include",
      body: JSON.stringify(routine),
    })
    if (!res.ok) throw new Error("Failed to create routine")
    const result = await res.json()
    await mutate()
    return result.routine
  }

  const update = async (routine: Routine) => {
    const token = localStorage.getItem("bearer_token")
    const res = await fetch(`/api/routines/${routine.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "include",
      body: JSON.stringify(routine),
    })
    if (!res.ok) throw new Error("Failed to update routine")
    await mutate()
  }

  const remove = async (id: string) => {
    const token = localStorage.getItem("bearer_token")
    const res = await fetch(`/api/routines/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: token ? {
        Authorization: `Bearer ${token}`,
      } : {},
    })
    if (!res.ok) throw new Error("Failed to delete routine")
    await mutate()
  }

  return { routines: data?.routines ?? [], create, update, remove, refresh: () => mutate() }
}