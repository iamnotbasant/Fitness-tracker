"use client"

import useSWR, { mutate as globalMutate } from "swr"
import { useState, useEffect, useCallback, useMemo } from "react"
import type { Exercise, Workout, Profile, WorkoutSession, SessionExercise, Routine, RoutineExercise } from "@/lib/types"
import { useSession } from "@/lib/auth-client"
import { toast } from "sonner"

const fetcher = async (url: string) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null
  const cacheKey = `ft_cache_${url.split("?")[0]}`

  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: token ? {
        Authorization: `Bearer ${token}`,
      } : {},
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data))
      } catch {}
    }
    return data
  } catch (err) {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          console.warn(`[offline] Serving cached data for ${url}`)
          return JSON.parse(cached)
        }
      } catch {}
    }
    throw err
  }
}

// Automatically sync offline queued workouts when device reconnects to internet
export async function syncOfflineWorkouts(): Promise<number> {
  if (typeof window === "undefined" || !navigator.onLine) return 0
  const queueRaw = localStorage.getItem("ft_pending_offline_workouts")
  if (!queueRaw) return 0
  
  try {
    const queue: any[] = JSON.parse(queueRaw)
    if (!Array.isArray(queue) || queue.length === 0) return 0

    const token = localStorage.getItem("bearer_token")
    let successCount = 0
    const remaining: any[] = []

    for (const w of queue) {
      try {
        // Strip temporary offline id and user IDs before saving
        const { id, userId, user_id, ...workoutData } = w as any
        const res = await fetch("/api/workouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: "include",
          body: JSON.stringify(workoutData),
        })
        if (res.ok) {
          successCount++
        } else {
          remaining.push(w)
        }
      } catch {
        remaining.push(w)
      }
    }

    if (remaining.length === 0) {
      localStorage.removeItem("ft_pending_offline_workouts")
    } else {
      localStorage.setItem("ft_pending_offline_workouts", JSON.stringify(remaining))
    }

    if (successCount > 0) {
      globalMutate("/api/workouts?limit=10000")
    }

    return successCount
  } catch (e) {
    console.error("[offline-sync] Error during sync:", e)
    return 0
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", async () => {
    const count = await syncOfflineWorkouts()
    if (count > 0) {
      toast.success(`Online! Synced ${count} offline workout(s) to server.`)
    }
  })
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

const EMPTY_EXERCISES: Exercise[] = []
const DEFAULT_PROFILE: Profile = { name: "", goals: [] }

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

  return { exercises: data ?? EMPTY_EXERCISES, add, create, update, remove, refresh: () => mutate(), isLoading }
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

  const workouts = useMemo(() => {
    const serverWorkouts = data?.workouts ?? []
    if (typeof window === "undefined") return serverWorkouts
    try {
      const pendingRaw = localStorage.getItem("ft_pending_offline_workouts")
      if (!pendingRaw) return serverWorkouts
      const pending: Workout[] = JSON.parse(pendingRaw)
      if (!Array.isArray(pending) || pending.length === 0) return serverWorkouts
      const existingIds = new Set(serverWorkouts.map((w) => String(w.id)))
      const pendingUnique = pending.filter((w) => !existingIds.has(String(w.id)))
      return [...pendingUnique, ...serverWorkouts]
    } catch {
      return serverWorkouts
    }
  }, [data?.workouts])

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
    if (typeof window !== "undefined") {
      try {
        const pendingRaw = localStorage.getItem("ft_pending_offline_workouts")
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw)
          localStorage.setItem(
            "ft_pending_offline_workouts",
            JSON.stringify(pending.filter((w: any) => String(w.id) !== String(id)))
          )
        }
      } catch {}
    }
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
      list.map((w: any) => {
        const { id, userId, user_id, ...workoutData } = w
        return fetch("/api/workouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: "include",
          body: JSON.stringify(workoutData),
        })
      })
    )
    await mutate()
  }

  return { workouts, upsert, remove, saveWorkouts, refresh: () => mutate(), isLoading }
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

  return { profile: data?.profile ?? DEFAULT_PROFILE, save, refresh: () => mutate() }
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
    // Check local storage for offline session first if offline
    if (typeof window !== "undefined" && !navigator.onLine) {
      try {
        const local = localStorage.getItem("ft_active_offline_session")
        if (local) return { session: JSON.parse(local) }
      } catch {}
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null
    try {
      const res = await fetch(`${url}?status=active&limit=1`, {
        credentials: "include",
        headers: token ? {
          Authorization: `Bearer ${token}`,
        } : {},
      })
      if (res.ok) {
        const sessions = await res.json()
        const active = sessions.length > 0 ? sessions[0] : null
        if (active && typeof window !== "undefined") {
          localStorage.setItem("ft_active_offline_session", JSON.stringify(active))
        }
        return { session: active }
      }
    } catch (e) {
      // Network failure, fallback to offline cached session
      if (typeof window !== "undefined") {
        try {
          const local = localStorage.getItem("ft_active_offline_session")
          if (local) return { session: JSON.parse(local) }
        } catch {}
      }
    }
    return { session: null }
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
    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null
    const now = new Date()
    const localDatetime = `${getLocalDateString(now)}T${getLocalTimeString(now)}:00`
    
    // Create optimistic local session immediately
    const optimisticSession: WorkoutSession = {
      id: `session-local-${Date.now()}`,
      userId: "local",
      status: "active",
      startedAt: localDatetime,
      items: [],
      routineId,
      createdAt: localDatetime,
    }

    // Save locally immediately
    if (typeof window !== "undefined") {
      localStorage.setItem("ft_active_offline_session", JSON.stringify(optimisticSession))
    }
    mutate({ session: optimisticSession }, { revalidate: false })

    if (typeof window !== "undefined" && !navigator.onLine) {
      return optimisticSession
    }

    try {
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
      if (res.ok) {
        const result = await res.json()
        if (typeof window !== "undefined") {
          localStorage.setItem("ft_active_offline_session", JSON.stringify(result))
        }
        mutate({ session: result }, { revalidate: false })
        return result
      }
    } catch (e) {
      console.warn("Offline or network issue starting session on server, proceeding locally:", e)
    }
    return optimisticSession
  }

  const addExercise = async (exercise: Pick<SessionExercise, "id" | "name" | "split" | "level"> & { type?: string }) => {
    if (!data?.session) {
      console.error("No active session found")
      return
    }
    
    const isTimer = exercise.type === "timer" || String(exercise.type || "").toLowerCase().includes("timer") || String(exercise.name || "").toLowerCase().includes("plank")
    const newItem: SessionExercise = {
      id: `item-${crypto.randomUUID()}`,
      exerciseId: exercise.id,
      name: exercise.name,
      split: exercise.split,
      level: exercise.level,
      notes: "",
      restEnabled: true,
      restSec: 60,
      sets: [isTimer ? { timeSeconds: 30, done: false } : { reps: 0, done: false }],
    }
    
    const { userId, id, createdAt, ...sessionData } = data.session
    const updatedItems = [...data.session.items, newItem]
    
    // Optimistic update — instant UI response
    mutate({ session: { ...data.session, items: updatedItems } }, { revalidate: false })
    debouncedSave(data.session.id, sessionData, updatedItems)
  }

  // Debounced API save — fires 800ms after last call, no re-fetch on success
  const debouncedSave = debounce(async (sessionId: string, sessionData: any, items: SessionExercise[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ft_active_offline_session", JSON.stringify({ ...sessionData, id: sessionId, items }))
      } catch {}
    }
    if (typeof window !== "undefined" && !navigator.onLine) return

    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null
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
      console.warn("Network error saving exercise update, saved to local cache:", e)
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
    if (!data?.session) return
    
    const { userId, id, createdAt, ...sessionData } = data.session
    const updatedItems = data.session.items.filter((item) => item.id !== itemId)
    
    // Optimistic update — instant UI response
    mutate({ session: { ...data.session, items: updatedItems } }, { revalidate: false })
    debouncedSave(data.session.id, sessionData, updatedItems)
  }

  const reorderExercises = async (items: SessionExercise[]) => {
    if (!data?.session) return
    const { userId, id, createdAt, ...sessionData } = data.session
    mutate({ session: { ...data.session, items } }, { revalidate: false })
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ft_active_offline_session", JSON.stringify({ ...data.session, items }))
      } catch {}
    }
    debouncedSave(data.session.id, sessionData, items)
  }

  const discard = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ft_active_offline_session")
    }
    if (!data?.session) return
    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null
    const sessionId = data.session.id
    mutate({ session: null }, { revalidate: false })
    if (typeof window !== "undefined" && navigator.onLine) {
      try {
        await fetch(`/api/workout-sessions?id=${sessionId}`, {
          method: "DELETE",
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
      } catch {}
    }
  }

  const finish = async (existingWorkouts: Workout[], actualDurationSeconds?: number, editedItems?: SessionExercise[], editedDate?: string, editedTime?: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null
    if (!data?.session) {
      console.log("No active session to finish")
      return existingWorkouts
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem("ft_active_offline_session")
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
        const isTimeBased = (set.timeSeconds !== undefined && set.timeSeconds > 0) || String(item.name || "").toLowerCase().includes("plank")
        const durationSec = isTimeBased ? (set.timeSeconds || 30) : undefined
        
        let volume: number
        if (isTimeBased) {
          volume = durationSec || 0
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
          reps: isTimeBased ? 0 : (set.reps || 0),
          volume: volume,
          setType: set.setType || "normal",
        }
        
        if (item.restEnabled && item.restSec) {
          workout.rest = item.restSec
        }
        if (item.notes) {
          workout.notes = item.notes
        }
        if (isTimeBased && durationSec) {
          workout.timeSeconds = durationSec
        }
        if (set.weight) {
          workout.weight = set.weight
        }
        if (actualDurationSeconds) {
          workout.durationSeconds = actualDurationSeconds
        }
        newWorkouts.push(workout)
      })
    })

    const preparedWorkouts: Workout[] = newWorkouts.map((w, idx) => ({
      ...w,
      id: `local-${Date.now()}-${idx}`,
    }))

    // 1. Immediately store in offline queue so user never loses data
    if (typeof window !== "undefined") {
      try {
        const prev = JSON.parse(localStorage.getItem("ft_pending_offline_workouts") || "[]")
        localStorage.setItem("ft_pending_offline_workouts", JSON.stringify([...preparedWorkouts, ...prev]))
      } catch {}
    }

    // 2. Immediately clear active session state
    const sessionId = data.session.id
    mutate({ session: null }, { revalidate: false })

    // 3. Immediately revalidate/update workouts list so user sees them right away
    globalMutate("/api/workouts?limit=10000")

    // 4. Background non-blocking sync if online
    if (typeof window !== "undefined" && navigator.onLine) {
      syncOfflineWorkouts().then(() => {
        globalMutate("/api/workouts?limit=10000")
      }).catch(() => {})

      fetch(`/api/workout-sessions?id=${sessionId}`, {
        method: "DELETE",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => {})
    }

    return [...preparedWorkouts, ...existingWorkouts]
  }

  return {
    session: data?.session ?? null,
    start,
    addExercise,
    updateExercise,
    removeExercise,
    reorderExercises,
    discard,
    finish,
  }
}

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  const checkStatus = useCallback(() => {
    if (typeof window === "undefined") return
    setIsOnline(navigator.onLine)
    try {
      const q = JSON.parse(localStorage.getItem("ft_pending_offline_workouts") || "[]")
      setPendingCount(Array.isArray(q) ? q.length : 0)
    } catch {
      setPendingCount(0)
    }
  }, [])

  useEffect(() => {
    checkStatus()
    const handleOnline = async () => {
      setIsOnline(true)
      const count = await syncOfflineWorkouts()
      if (count > 0) {
        toast.success(`Online! Synced ${count} offline workout(s).`)
        globalMutate("/api/workouts?limit=10000")
      }
      checkStatus()
    }
    const handleOffline = () => {
      setIsOnline(false)
      checkStatus()
    }
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [checkStatus])

  return { isOnline, pendingCount, syncNow: syncOfflineWorkouts }
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