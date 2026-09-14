"use client"

import { useRouter } from "next/navigation"
import { useActiveSession, useExercises, useWorkouts, useRoutines } from "@/hooks/use-local-data"
import { Dumbbell, Plus, Search, ChevronLeft, Clock, Play, Loader2, Pin } from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { useEffect, useState, useMemo, useCallback, memo } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import soundManager from "@/lib/sounds"
import LiveExerciseCard from "@/components/workout/live-exercise-card"
import WorkoutConfirmationDialog from "@/components/workout/workout-confirmation-dialog"
import AddExercisePicker from "@/components/workout/add-exercise-picker"
import type { SessionExercise } from "@/lib/types"

export default function WorkoutHub() {
  const router = useRouter()
  const { session: activeSession, start, addExercise, updateExercise, removeExercise, discard, finish } = useActiveSession()
  const { exercises } = useExercises()
  const { workouts, refresh } = useWorkouts()
  const { routines } = useRoutines()
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)
  
  // Timer control
  const [timerStarted, setTimerStarted] = useState(false)
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null)
  const [tick, setTick] = useState(0)

  // Active Rest Timer state (floating bottom bar)
  const [activeRest, setActiveRest] = useState<{
    exerciseName: string
    totalSeconds: number
    endsAt: number
  } | null>(null)
  const [restRemaining, setRestRemaining] = useState<number>(0)

  // Confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  
  // Routine starting state
  const [startingRoutine, setStartingRoutine] = useState<string | null>(null)

  // Routine filters & Pinning state
  const [pinnedRoutineIds, setPinnedRoutineIds] = useState<string[]>([])
  const [splitFilter, setSplitFilter] = useState<"all" | "push" | "pull" | "legs" | "core">("all")
  const [levelFilter, setLevelFilter] = useState<"all" | "1" | "2" | "3" | "4">("all")

  // Load pinned routines from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ft_pinned_routines")
      if (saved) {
        setPinnedRoutineIds(JSON.parse(saved))
      }
    } catch {}
  }, [])

  const togglePinRoutine = (routineId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPinnedRoutineIds((prev) => {
      const isPinned = prev.includes(routineId)
      const next = isPinned ? prev.filter((id) => id !== routineId) : [routineId, ...prev]
      try {
        localStorage.setItem("ft_pinned_routines", JSON.stringify(next))
      } catch {}
      toast.success(isPinned ? "Routine unpinned" : "Routine pinned to top!")
      return next
    })
  }

  // Client-side mounting check
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-sync timer start time if an active session exists
  useEffect(() => {
    if (activeSession && !timerStarted) {
      setTimerStarted(true)
      if (activeSession.startedAt) {
        const startTs = new Date(activeSession.startedAt).getTime()
        if (!isNaN(startTs) && startTs <= Date.now()) {
          setTimerStartTime(startTs)
        } else {
          setTimerStartTime(Date.now())
        }
      } else {
        setTimerStartTime(Date.now())
      }
    }
  }, [activeSession, timerStarted])

  // Timer effect - runs when timerStarted is true
  useEffect(() => {
    if (!timerStarted || !timerStartTime) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [timerStarted, timerStartTime])

  // Rest Timer countdown effect with sound & vibration
  useEffect(() => {
    if (!activeRest) {
      setRestRemaining(0)
      return
    }

    const updateRemaining = () => {
      const rem = Math.max(0, Math.ceil((activeRest.endsAt - Date.now()) / 1000))
      setRestRemaining(rem)
      
      if (rem === 3) soundManager.play('countdown_3', 0.4)
      else if (rem === 2) soundManager.play('countdown_2', 0.5)
      else if (rem === 1) soundManager.play('countdown_1', 0.6)
      else if (rem <= 0) {
        soundManager.play('countdown_go', 0.8)
        if (typeof window !== "undefined" && "vibrate" in navigator) {
          try { navigator.vibrate([150, 50, 150]) } catch {}
        }
        toast.success(`Rest finished for ${activeRest.exerciseName}! Next set ready!`, {
          duration: 3500,
        })
        setActiveRest(null)
      }
    }

    updateRemaining()
    const id = setInterval(updateRemaining, 500)
    return () => clearInterval(id)
  }, [activeRest])

  const handleStartRest = useCallback((exerciseName: string, durationSec: number) => {
    setActiveRest({
      exerciseName,
      totalSeconds: durationSec,
      endsAt: Date.now() + durationSec * 1000,
    })
  }, [])

  const handleAddRestTime = (seconds: number) => {
    if (!activeRest) return
    soundManager.play('tick', 0.3)
    setActiveRest(prev => prev ? {
      ...prev,
      totalSeconds: prev.totalSeconds + seconds,
      endsAt: prev.endsAt + seconds * 1000,
    } : null)
  }

  const handleSkipRest = () => {
    soundManager.play('click', 0.3)
    setActiveRest(null)
  }

  const elapsed = timerStartTime ? Math.max(0, Math.floor((Date.now() - timerStartTime) / 1000)) : 0
  
  const formatDuration = (seconds: number) => {
    const hh = Math.floor(seconds / 3600)
    const mm = Math.floor((seconds % 3600) / 60)
    const ss = seconds % 60
    if (hh > 0) {
      return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    }
    return `${mm}:${String(ss).padStart(2, "0")}`
  }

  // Calculate totals with volume that considers both time-based and strength exercises
  const totals = useMemo(() => {
    let sets = 0
    let reps = 0
    let volume = 0
    
    activeSession?.items.forEach((it) => {
      const completedSets = it.sets.filter(s => s.done)
      sets += completedSets.length
      
      completedSets.forEach((set) => {
        const isTimeBased = set.timeSeconds !== undefined && set.timeSeconds > 0
        
        if (isTimeBased) {
          // For time-based exercises, volume = time in seconds
          volume += set.timeSeconds || 0
        } else {
          // For strength exercises
          reps += Number(set.reps) || 0
          const setReps = Number(set.reps) || 0
          const weight = Number(set.weight) || 0
          // Volume = reps × weight (or just reps if no weight)
          volume += weight > 0 ? setReps * weight : setReps
        }
      })
    })
    
    return { sets, reps, volume }
  }, [activeSession])

  const routineUsageMap = useMemo(() => {
    const map = new Map<string, number>()
    workouts.forEach((w) => {
      if (w.routineId) {
        map.set(String(w.routineId), (map.get(String(w.routineId)) || 0) + 1)
      }
      if (w.workoutName) {
        const matching = routines.find(
          (r) => r.name?.toLowerCase() === w.workoutName?.toLowerCase()
        )
        if (matching) {
          map.set(String(matching.id), (map.get(String(matching.id)) || 0) + 1)
        }
      }
    })
    return map
  }, [workouts, routines])

  const filteredRoutines = useMemo(() => {
    const list = routines.filter((r) => {
      const name = (r.name || "").toLowerCase()
      const desc = (r.description || "").toLowerCase()
      const exList = (r.exercises || []) as Array<{ exerciseName?: string; split?: string; level?: number }>

      // Check Split
      if (splitFilter !== "all") {
        const matchesSplit =
          name.includes(splitFilter) ||
          desc.includes(splitFilter) ||
          exList.some(
            (e) =>
              e.split?.toLowerCase() === splitFilter ||
              (splitFilter === "legs" && e.split?.toLowerCase() === "leg")
          )
        if (!matchesSplit) return false
      }

      // Check Level
      if (levelFilter !== "all") {
        const targetLvl = Number(levelFilter)
        const matchesLevel =
          name.includes(`level ${targetLvl}`) ||
          desc.includes(`level ${targetLvl}`) ||
          exList.some((e) => e.level === targetLvl)
        if (!matchesLevel) return false
      }

      return true
    })

    // Sort: (1) Pinned routines at the very top, (2) Most used routines, (3) Alphabetical
    return [...list].sort((a, b) => {
      const aPinned = pinnedRoutineIds.includes(String(a.id)) ? 1 : 0
      const bPinned = pinnedRoutineIds.includes(String(b.id)) ? 1 : 0
      if (bPinned !== aPinned) return bPinned - aPinned

      const aUsage = routineUsageMap.get(String(a.id)) || 0
      const bUsage = routineUsageMap.get(String(b.id)) || 0
      if (bUsage !== aUsage) return bUsage - aUsage

      return (a.name || "").localeCompare(b.name || "")
    })
  }, [routines, splitFilter, levelFilter, pinnedRoutineIds, routineUsageMap])

  const handleStartWorkout = async () => {
    let token = localStorage.getItem("bearer_token")
    if (!token) {
      token = "local_admin_token"
      localStorage.setItem("bearer_token", token)
    }

    try {
      soundManager.play('start', 0.6)
      await start()
      toast.success("Workout session created! Add exercises to begin.")
    } catch (error: any) {
      console.error("Error starting workout:", error)
      toast.error(error.message || "Failed to start workout")
    }
  }

  const handleStartTimer = () => {
    setTimerStarted(true)
    setTimerStartTime(Date.now())
    soundManager.play('start', 0.7)
    toast.success("Timer started! Let's workout!")
  }

  const onAddExercise = async (exerciseId: string) => {
    try {
      const ex = exercises?.find((e) => e.id === exerciseId)
      if (!ex) {
        toast.error("Exercise not found")
        return
      }
      soundManager.play('add', 0.5)
      await addExercise({ id: ex.id, name: ex.name, split: ex.split, level: ex.level })
      toast.success(`${ex.name} added!`)
    } catch (error) {
      console.error("Error adding exercise:", error)
      toast.error(error instanceof Error ? error.message : "Failed to add exercise")
    }
  }

  const previousRepsFor = (exerciseName: string) => {
    // Get last workout for this exercise and return array of reps for each set
    const exerciseWorkouts = [...(workouts || [])]
      .filter((w) => w.exerciseName === exerciseName)
      .sort((a, b) => {
        // Sort by date desc, then by setNumber
        const dateCompare = b.date.localeCompare(a.date)
        if (dateCompare !== 0) return dateCompare
        return (b.setNumber || 0) - (a.setNumber || 0)
      })
    
    if (exerciseWorkouts.length === 0) return undefined
    
    // Get the most recent workout date
    const lastDate = exerciseWorkouts[0].date
    
    // Get all sets from that workout
    const lastWorkoutSets = exerciseWorkouts
      .filter(w => w.date === lastDate)
      .sort((a, b) => (a.setNumber || 0) - (b.setNumber || 0))
    
    // Return array of reps/time for each set
    return lastWorkoutSets.map(w => w.timeSeconds || w.reps || 0)
  }

  const getExerciseType = (exerciseId: string) => {
    const ex = exercises?.find((e) => e.id === exerciseId)
    return ex?.type || "standard"
  }

  const getExerciseImageUrl = (exerciseId: string) => {
    const ex = exercises?.find((e) => e.id === exerciseId)
    return ex?.imageUrl
  }

  const getExerciseRepGoal = (exerciseId: string) => {
    const ex = exercises?.find((e) => e.id === exerciseId)
    return ex?.repGoal
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (dropIndex: number) => async (e: React.DragEvent) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === dropIndex || !activeSession) {
      setDraggedIndex(null)
      return
    }

    const items = [...activeSession.items]
    const [draggedItem] = items.splice(draggedIndex, 1)
    items.splice(dropIndex, 0, draggedItem)

    // Update session with reordered items
    const token = localStorage.getItem("bearer_token")
    const { userId, id, createdAt, ...sessionData } = activeSession
    
    try {
      const res = await fetch(`/api/workout-sessions?id=${activeSession.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ ...sessionData, items }),
      })
      
      if (!res.ok) throw new Error("Failed to reorder exercises")
      
      // Refresh the session
      window.location.reload()
    } catch (error) {
      console.error("Error reordering exercises:", error)
      toast.error("Failed to reorder exercises")
    }
    
    setDraggedIndex(null)
  }

  const handleFinish = async () => {
    if (!activeSession || activeSession.items.length === 0) {
      toast.error("No exercises to save")
      return
    }
    
    // Check if any sets are completed
    const hasCompletedSets = activeSession.items.some(item => 
      item.sets.some(set => set.done)
    )
    
    if (!hasCompletedSets) {
      toast.error("Please complete at least one set before saving")
      return
    }
    
    soundManager.play('click', 0.4)
    
    // Stop timer immediately when showing confirmation dialog
    setTimerStarted(false)
    
    // Show confirmation dialog
    setShowConfirmation(true)
  }

  const handleConfirmFinish = async (editedExercises: SessionExercise[], editedDuration: number, editedDate: string, editedTime: string) => {
    // Prevent double-submission
    if (isSaving) {
      console.log("Already saving, ignoring duplicate call")
      return
    }
    
    try {
      setIsSaving(true)
      setShowConfirmation(false)
      console.log("Starting finish process with edited data...")
      
      // Pass edited date and time directly to finish function
      await finish(workouts || [], editedDuration, editedExercises, editedDate, editedTime)
      console.log("Finish completed, refreshing workouts...")
      
      await refresh()
      console.log("Workouts refreshed")
      
      soundManager.play('complete', 0.7)
      toast.success("Workout completed and saved!")
      setTimerStartTime(null)
      router.push("/")
    } catch (error) {
      console.error("Error finishing workout:", error)
      toast.error("Failed to finish workout: " + (error instanceof Error ? error.message : "Unknown error"))
      setIsSaving(false) // Reset on error so user can retry
    }
  }

  const handleDiscard = async () => {
    if (confirm("Are you sure you want to discard this workout?")) {
      soundManager.play('remove', 0.5)
      await discard()
      setTimerStarted(false)
      setTimerStartTime(null)
      toast.success("Workout discarded")
    }
  }

  const handleStartRoutine = async (routineId: string) => {
    try {
      setStartingRoutine(routineId)
      await start(routineId)
      // Session will be active, component will re-render to show workout interface
      toast.success("Routine loaded!")
    } catch (error) {
      console.error("Failed to start routine:", error)
      toast.error("Failed to start routine")
    } finally {
      setStartingRoutine(null)
    }
  }

  // mounted is always true after client hydration; render nothing meaningful server-side
  // to prevent React error #418 (hydration mismatch from localStorage reads)
  if (!mounted) {
    return <main className="min-h-screen bg-background" />
  }

  // Show workout interface if session exists
  if (activeSession) {
    return (
      <main className="min-h-screen bg-background pb-24">
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        >
          <div className="mx-auto max-w-3xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    soundManager.play('click', 0.3)
                    router.push("/")
                  }}
                  className="rounded-lg p-2 hover:bg-muted"
                  aria-label="Back to dashboard"
                >
                  <ChevronLeft className="h-5 w-5" />
                </motion.button>
                <div className="text-lg md:text-xl font-semibold">Log Workout</div>
              </div>
              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {!timerStarted && activeSession.items.length > 0 && (
                    <motion.button
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStartTimer}
                      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Start
                    </motion.button>
                  )}
                </AnimatePresence>
                {activeSession.items.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDiscard}
                    className="rounded-xl border border-destructive/50 bg-card px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    Discard
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFinish}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Done
                </motion.button>
              </div>
            </div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-3 grid grid-cols-3 gap-3 text-center text-sm"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-lg p-2 hover:bg-muted/50 transition-colors"
              >
                <div className="text-xs text-muted-foreground mb-0.5">Duration</div>
                <div className="font-medium text-primary">{formatDuration(elapsed)}</div>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-lg p-2 hover:bg-muted/50 transition-colors"
              >
                <div className="text-xs text-muted-foreground mb-0.5">Volume</div>
                <div className="font-medium">{totals.volume} reps</div>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-lg p-2 hover:bg-muted/50 transition-colors"
              >
                <div className="text-xs text-muted-foreground mb-0.5">Sets</div>
                <div className="font-medium">{totals.sets}</div>
              </motion.div>
            </motion.div>
          </div>
        </motion.header>

        {activeSession.items.length === 0 ? (
          <section className="mx-auto max-w-3xl px-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="mt-8 flex flex-col items-center justify-center gap-6 rounded-2xl border bg-card p-8 md:p-12 text-center"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="rounded-full bg-primary/10 p-6"
              >
                <svg className="h-12 w-12 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 8l-4 4 4 4M17 8l4 4-4 4M14 4l-4 16" />
                </svg>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-xl md:text-2xl font-semibold mb-2">Add exercises</h2>
                <p className="text-muted-foreground">Add exercises to your workout, then click Start to begin the timer</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <AddExercisePicker onAdd={onAddExercise} />
              </motion.div>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDiscard}
                className="rounded-xl border border-destructive/50 bg-card px-6 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                Discard Workout
              </motion.button>
            </motion.div>
          </section>
        ) : (
          <section className="mx-auto max-w-3xl px-4 pt-6 space-y-4">
              <AnimatePresence mode="popLayout">
                {activeSession.items.map((it, i) => (
                  <motion.div
                    key={it.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -100, scale: 0.95 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    layout
                  >
                    <ExerciseCardItem
                      it={it}
                      idx={i}
                      previousReps={previousRepsFor(it.name)}
                      exerciseType={getExerciseType(it.exerciseId)}
                      exerciseImageUrl={getExerciseImageUrl(it.exerciseId)}
                      repGoal={getExerciseRepGoal(it.exerciseId)}
                      updateExercise={updateExercise}
                      removeExercise={removeExercise}
                      onStartRest={handleStartRest}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="pt-2"
            >
              <AddExercisePicker onAdd={onAddExercise} compact />
            </motion.div>
          </section>
        )}

        {/* Global Floating Rest Timer Bar */}
        <AnimatePresence>
          {activeRest && restRemaining > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
              className="fixed bottom-20 md:bottom-6 left-4 right-4 max-w-md mx-auto z-50 pointer-events-auto"
            >
              <div className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl p-3.5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold">
                      <Clock className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Resting</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[110px] sm:max-w-[160px]">
                          {activeRest.exerciseName}
                        </span>
                      </div>
                      <div className="text-xl font-bold tracking-tight text-foreground font-mono">
                        {Math.floor(restRemaining / 60)}:{String(restRemaining % 60).padStart(2, "0")}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAddRestTime(30)}
                      className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-all active:scale-95 cursor-pointer"
                      title="Add 30 seconds"
                    >
                      +30s
                    </button>
                    <button
                      onClick={() => handleAddRestTime(-15)}
                      className="rounded-lg bg-secondary px-2 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-all active:scale-95 cursor-pointer"
                      title="Subtract 15 seconds"
                    >
                      -15s
                    </button>
                    <button
                      onClick={handleSkipRest}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      Skip
                    </button>
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full bg-primary"
                    initial={false}
                    animate={{ width: `${Math.min(100, Math.max(0, (restRemaining / (activeRest.totalSeconds || 60)) * 100))}%` }}
                    transition={{ ease: "linear", duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <WorkoutConfirmationDialog
          open={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleConfirmFinish}
          exercises={activeSession.items}
          duration={elapsed}
          date={activeSession.startedAt}
          time={activeSession.startedAt?.includes('T') ? activeSession.startedAt.split('T')[1].slice(0, 5) : new Date().toTimeString().slice(0, 5)}
        />
      </main>
    )
  }

  // Show workout hub if no active session
  return (
    <main className="min-h-screen bg-background pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-4xl px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundManager.play('click', 0.3)
                router.push("/")
              }}
              className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back to dashboard"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Start Workout</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Choose an empty workout or launch a saved routine</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-6 space-y-6">
        {/* Option 1: Blank Workout Card */}
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-card/60 p-5 md:p-6 shadow-sm hover:border-primary/40 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Dumbbell className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold">Blank Workout</h2>
                <p className="text-xs md:text-sm text-muted-foreground">Start empty and add exercises on the fly</p>
              </div>
            </div>
            <button
              onClick={handleStartWorkout}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary font-semibold text-sm text-primary-foreground hover:bg-primary/90 shadow-sm transition-all shrink-0"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Start Blank</span>
            </button>
          </div>
        </div>

        {/* Option 2: Routines & Splits */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base md:text-lg font-bold tracking-tight">Routines</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {filteredRoutines.length}
              </span>
              <button
                onClick={() => router.push("/workout/routines/new")}
                className="h-7 w-7 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-all shadow-xs"
                title="Create New Routine"
                aria-label="Create New Routine"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            
            {/* Dual Filter Pills (Split and Level) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-wrap">
              {/* Split Filter */}
              <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border/50">
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "push", label: "Push" },
                    { key: "pull", label: "Pull" },
                    { key: "legs", label: "Legs" },
                    { key: "core", label: "Core" },
                  ] as const
                ).map((tab) => {
                  const active = splitFilter === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setSplitFilter(tab.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {/* Level Filter */}
              <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border/50">
                {(
                  [
                    { key: "all", label: "All Lvl" },
                    { key: "1", label: "Lvl 1" },
                    { key: "2", label: "Lvl 2" },
                    { key: "3", label: "Lvl 3" },
                  ] as const
                ).map((lvl) => {
                  const active = levelFilter === lvl.key
                  return (
                    <button
                      key={lvl.key}
                      onClick={() => setLevelFilter(lvl.key)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Routine Cards Grid */}
          {filteredRoutines.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card/40">
              <p className="text-sm text-muted-foreground mb-3">No routines found matching these filters</p>
              <button
                onClick={() => {
                  setSplitFilter("all")
                  setLevelFilter("all")
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredRoutines.map((routine) => {
                const isStarting = startingRoutine === routine.id
                const nameLower = (routine.name || "").toLowerCase()
                const isL1 = nameLower.includes("level 1") || routine.exercises?.some((e: any) => e.level === 1)
                const isL2 = nameLower.includes("level 2") || routine.exercises?.some((e: any) => e.level === 2)
                const splitTag = nameLower.includes("push") ? "Push" : nameLower.includes("pull") ? "Pull" : (nameLower.includes("leg") || nameLower.includes("legs")) ? "Legs" : null
                const isPinned = pinnedRoutineIds.includes(String(routine.id))
                const usageCount = routineUsageMap.get(String(routine.id)) || 0

                return (
                  <div
                    key={routine.id}
                    className={`group rounded-2xl border p-4 transition-all flex flex-col justify-between gap-3 shadow-xs hover:shadow-sm ${
                      isPinned
                        ? "border-primary/50 bg-card"
                        : "border-border/60 bg-card hover:border-primary/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            onClick={(e) => togglePinRoutine(String(routine.id), e)}
                            title={isPinned ? "Unpin routine" : "Pin routine to top"}
                            className={`p-1 rounded-lg transition-colors shrink-0 ${
                              isPinned
                                ? "text-amber-400 bg-amber-400/15"
                                : "text-muted-foreground/40 hover:text-foreground hover:bg-muted"
                            }`}
                          >
                            <Pin className={`h-3.5 w-3.5 ${isPinned ? "fill-amber-400" : ""}`} />
                          </button>
                          <h3 className="font-semibold text-base tracking-tight truncate group-hover:text-primary transition-colors">
                            {routine.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {usageCount > 0 && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                              {usageCount}x used
                            </span>
                          )}
                          {splitTag && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                              {splitTag}
                            </span>
                          )}
                          {(isL1 || isL2) && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                              {isL1 ? "Lvl 1" : "Lvl 2"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Exercise preview tags */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {routine.exercises.slice(0, 3).map((ex, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-muted/80 text-foreground/80 font-medium truncate max-w-[150px]"
                          >
                            {ex.exerciseName}
                          </span>
                        ))}
                        {routine.exercises.length > 3 && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground">
                            +{routine.exercises.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {routine.exercises.length} exercises
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/workout/routines/${routine.id}/edit`)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleStartRoutine(routine.id)}
                          disabled={isStarting}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all disabled:opacity-60"
                        >
                          {isStarting ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Starting...</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 fill-current" />
                              <span>Start</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

// Wrapper with stable onChange/onRemove callbacks so LiveExerciseCard (memo'd) doesn't re-render on parent re-render
const ExerciseCardItem = memo(function ExerciseCardItem({
  it,
  idx,
  previousReps,
  exerciseType,
  exerciseImageUrl,
  repGoal,
  updateExercise,
  removeExercise,
  onStartRest,
}: {
  it: SessionExercise
  idx: number
  previousReps: number | number[] | undefined
  exerciseType: string
  exerciseImageUrl: string | undefined
  repGoal: number | undefined
  updateExercise: (id: string, updater: (e: SessionExercise) => SessionExercise) => void
  removeExercise: (id: string) => void
  onStartRest?: (exerciseName: string, durationSec: number) => void
}) {
  const onChange = useCallback(
    (up: (e: SessionExercise) => SessionExercise) => updateExercise(it.id, up),
    [it.id, updateExercise]
  )
  const onRemove = useCallback(() => {
    soundManager.play('remove', 0.4)
    removeExercise(it.id)
  }, [it.id, removeExercise])

  return (
    <LiveExerciseCard
      item={it}
      idx={idx}
      previousReps={previousReps}
      exerciseType={exerciseType as any}
      exerciseImageUrl={exerciseImageUrl}
      repGoal={repGoal}
      onChange={onChange}
      onRemove={onRemove}
      onStartRest={onStartRest}
    />
  )
})