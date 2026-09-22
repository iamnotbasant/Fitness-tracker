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
export const getLocalDateString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to get local time string in HH:MM format
export const getLocalTimeString = (date: Date) => {
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
// Helper to sanitize active workout session sets: uncompleted sets must start completely blank
export function sanitizeActiveSession(sess: WorkoutSession | null): WorkoutSession | null {
  if (!sess || !sess.items) return sess
  return {
    ...sess,
    items: sess.items.map((item) => ({
      ...item,
      sets: (item.sets || []).map((s: any) => {
        // Completed sets remain intact
        if (s.done) return s
        // If user explicitly entered this set value during the session, retain it
        if (s.userEntered) return s
        // Uncompleted set fields must start completely blank (undefined)
        return {
          ...s,
          reps: undefined,
          timeSeconds: undefined,
        }
      })
    }))
  }
}

export function useActiveSession() {
  const { data: session } = useSession()
  
  const customFetcher = async (url: string) => {
    // Check local storage for offline session first if offline
    if (typeof window !== "undefined" && !navigator.onLine) {
      try {
        const local = localStorage.getItem("ft_active_offline_session")
        if (local) return { session: sanitizeActiveSession(JSON.parse(local)) }
      } catch {}
      return { session: null }
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
        const cleaned = sanitizeActiveSession(active)
        if (cleaned && typeof window !== "undefined") {
          localStorage.setItem("ft_active_offline_session", JSON.stringify(cleaned))
        }
        return { session: cleaned }
      }
    } catch (e) {
      // Network failure, fallback to offline cached session
      if (typeof window !== "undefined") {
        try {
          const local = localStorage.getItem("ft_active_offline_session")
          if (local) return { session: sanitizeActiveSession(JSON.parse(local)) }
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
    const isoDatetime = now.toISOString()
    
    // Instantly construct items if routineId is provided from local cache
    let initialItems: SessionExercise[] = []
    if (routineId && typeof window !== "undefined") {
      try {
        const cachedRaw = localStorage.getItem("ft_cache_/api/routines")
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw)
          const allRoutines: Routine[] = cached.routines || cached || []
          const found = allRoutines.find((r) => String(r.id) === String(routineId))
          if (found && Array.isArray(found.exercises)) {
            initialItems = found.exercises.map((ex: any) => {
              const isTimer = ex.type === "timer" || ex.defaultTimeSeconds !== undefined || String(ex.exerciseName || "").toLowerCase().includes("plank") || String(ex.exerciseName || "").toLowerCase().includes("hang") || String(ex.exerciseName || "").toLowerCase().includes("hold")
              const numSets = ex.defaultSets || 3
              return {
                id: `item-${crypto.randomUUID()}`,
                exerciseId: String(ex.exerciseId),
                name: ex.exerciseName,
                split: ex.split,
                level: ex.level,
                notes: ex.notes || "",
                restEnabled: true,
                restSec: ex.restSec || 60,
                sets: Array(numSets).fill(null).map(() => ({
                  reps: isTimer ? undefined : undefined,
                  timeSeconds: isTimer ? (ex.defaultTimeSeconds || 30) : undefined,
                  weight: ex.defaultWeight,
                  done: false,
                })),
              }
            })
          }
        }
      } catch (err) {
        console.warn("Could not pre-populate routine items locally:", err)
      }
    }

    // Create optimistic local session immediately with populated items!
    const optimisticSession: WorkoutSession = {
      id: `session-local-${Date.now()}`,
      userId: "local",
      status: "active",
      startedAt: isoDatetime,
      items: initialItems,
      routineId: routineId ? String(routineId) : undefined,
      createdAt: isoDatetime,
    }

    // Save locally immediately for 0ms transition
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
          startedAt: isoDatetime,
          items: initialItems,
          routineId: routineId ? String(routineId) : undefined 
        }),
      })
      if (res.ok) {
        const result = await res.json()
        const cleaned = sanitizeActiveSession(result)
        if (typeof window !== "undefined") {
          localStorage.setItem("ft_active_offline_session", JSON.stringify(cleaned))
        }
        mutate({ session: cleaned }, { revalidate: false })
        return cleaned
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
    
    const newItem: SessionExercise = {
      id: `item-${crypto.randomUUID()}`,
      exerciseId: exercise.id,
      name: exercise.name,
      split: exercise.split,
      level: exercise.level,
      notes: "",
      restEnabled: true,
      restSec: 60,
      sets: [{ reps: undefined, timeSeconds: undefined, done: false }],
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
      const d = data.session.startedAt ? new Date(data.session.startedAt) : new Date()
      if (!isNaN(d.getTime())) {
        localDate = getLocalDateString(d)
        localTime = getLocalTimeString(d)
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
  const [isSyncing, setIsSyncing] = useState(false)

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

  const syncNow = useCallback(async () => {
    if (typeof window === "undefined") return
    if (!navigator.onLine) {
      toast.error("Device is offline. Reconnect to the internet to sync.")
      return
    }
    setIsSyncing(true)
    const toastId = toast.loading("Syncing offline workouts...")
    try {
      const count = await syncOfflineWorkouts()
      checkStatus()
      if (count > 0) {
        toast.success(`Synced ${count} offline workout(s) successfully!`, { id: toastId })
        globalMutate("/api/workouts?limit=10000")
      } else {
        toast.success("All workouts are up to date!", { id: toastId })
      }
    } catch (e) {
      toast.error("Failed to sync offline workouts. Will retry automatically.", { id: toastId })
    } finally {
      setIsSyncing(false)
    }
  }, [checkStatus])

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
    window.addEventListener("focus", checkStatus)
    const interval = setInterval(checkStatus, 5000)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("focus", checkStatus)
      clearInterval(interval)
    }
  }, [checkStatus])

  return { isOnline, pendingCount, isSyncing, syncNow }
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

  const currentRoutines = data?.routines ?? []

  const updateLocalRoutineCache = (newList: Routine[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ft_cache_/api/routines", JSON.stringify({ routines: newList }))
      } catch {}
    }
  }

  const create = async (routine: Omit<Routine, "id" | "createdAt">) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null
    const tempId = `routine-local-${Date.now()}`
    const tempRoutine: Routine = {
      ...routine,
      id: tempId,
      createdAt: new Date().toISOString(),
    }

    const optimisticList = [tempRoutine, ...currentRoutines]
    mutate({ routines: optimisticList }, { revalidate: false })
    updateLocalRoutineCache(optimisticList)

    if (typeof window !== "undefined" && !navigator.onLine) {
      return tempRoutine
    }

    try {
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
    } catch (err) {
      console.warn("Offline or network issue saving routine, kept locally:", err)
      return tempRoutine
    }
  }

  const update = async (routine: Routine) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null
    const updatedList = currentRoutines.map((r) => String(r.id) === String(routine.id) ? { ...r, ...routine } : r)
    mutate({ routines: updatedList }, { revalidate: false })
    updateLocalRoutineCache(updatedList)

    if (typeof window !== "undefined" && !navigator.onLine) {
      return
    }

    try {
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
    } catch (err) {
      console.warn("Offline or network issue updating routine, saved locally:", err)
    }
  }

  const remove = async (id: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null
    const filtered = currentRoutines.filter((r) => String(r.id) !== String(id))
    mutate({ routines: filtered }, { revalidate: false })
    updateLocalRoutineCache(filtered)

    if (typeof window !== "undefined" && !navigator.onLine) {
      return
    }

    try {
      const res = await fetch(`/api/routines/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: token ? {
          Authorization: `Bearer ${token}`,
        } : {},
      })
      if (!res.ok) throw new Error("Failed to delete routine")
      await mutate()
    } catch (err) {
      console.warn("Offline or network issue deleting routine, updated locally:", err)
    }
  }

  return { routines: currentRoutines, create, update, remove, refresh: () => mutate() }
}