"use client"
import { AnimatePresence, motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { TodayWorkoutCard, type TodayWorkoutData } from "@/components/today-workout-card"
import { useWorkouts, useRoutines, useActiveSession, useExercises } from "@/hooks/use-local-data"
import { Plus, ChevronLeft, ChevronRight, Loader2, Play, ListCheck, ArrowRight, ChevronDown, ChevronUp, X, Dumbbell, Flame, Layers, Search, Filter, Calendar, Sparkles } from "lucide-react"
import { useMemo, useEffect, useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const todayISO = () => new Date().toISOString().slice(0, 10)

type TimePeriod = "weekly" | "monthly" | "yearly" | "all"

// Helper functions for date calculations
const getWeekRange = (date: Date) => {
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay()) // Start on Sunday
  start.setHours(0, 0, 0, 0) // Reset to start of day
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999) // End of day
  return { start, end }
}

const getMonthRange = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

const getYearRange = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date.getFullYear(), 11, 31)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

const formatDateRange = (start: Date, end: Date, period: TimePeriod) => {
  if (period === "all") return "All Time"
  
  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
  
  const year = start.getFullYear()
  
  if (period === "yearly") {
    return year.toString()
  }
  
  if (start.getMonth() === end.getMonth()) {
    return `${formatDate(start)} - ${end.getDate()}, ${year}`
  }
  
  return `${formatDate(start)} - ${formatDate(end)}, ${year}`
}

// Helper to convert Date to local YYYY-MM-DD format
const toLocalDateString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function DashboardPage() {
  const router = useRouter()
  const { workouts, remove, refresh, isLoading: workoutsLoading } = useWorkouts()
  const { routines } = useRoutines()
  const { session: activeSession, start } = useActiveSession()
  const { exercises } = useExercises()
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("weekly")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [startingRoutine, setStartingRoutine] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])
  
  // Client-side mounting check to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Exercise split map for fast lookup
  const exerciseSplitMap = useMemo(() => {
    const map = new Map<string, string>()
    exercises.forEach((e) => {
      if (e.name && e.split) {
        map.set(e.name.toLowerCase(), e.split.toLowerCase())
      }
    })
    return map
  }, [exercises])

  // Calculate date range based on period and currentDate
  const dateRange = useMemo(() => {
    if (timePeriod === "all") {
      return { start: new Date(0), end: new Date() }
    }
    
    switch (timePeriod) {
      case "weekly":
        return getWeekRange(currentDate)
      case "monthly":
        return getMonthRange(currentDate)
      case "yearly":
        return getYearRange(currentDate)
      default:
        return { start: new Date(), end: new Date() }
    }
  }, [timePeriod, currentDate])
  
  // Filter workouts based on date range
  const filteredWorkouts = useMemo(() => {
    let list = workouts
    if (timePeriod !== "all") {
      const startISO = toLocalDateString(dateRange.start)
      const endISO = toLocalDateString(dateRange.end)
      list = list.filter((w) => w.date >= startISO && w.date <= endISO)
    }
    return list
  }, [workouts, dateRange, timePeriod])

  // Group filtered workouts by date AND exercise name
  const groupedWorkouts = useMemo(() => {
    const dateGroups: Record<string, Record<string, typeof filteredWorkouts>> = {}
    
    // First group by date, then by exercise name
    filteredWorkouts.forEach((w) => {
      if (!dateGroups[w.date]) {
        dateGroups[w.date] = {}
      }
      if (!dateGroups[w.date][w.exerciseName]) {
        dateGroups[w.date][w.exerciseName] = []
      }
      dateGroups[w.date][w.exerciseName].push(w)
    })
    
    // Convert to display format
    return Object.entries(dateGroups)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([date, exerciseGroups]) => {
        // Get all workouts for this date to find the time
        const allWorkoutsForDate = Object.values(exerciseGroups).flat()
        
        return {
          date,
          time: allWorkoutsForDate[0].time,
          exercises: Object.entries(exerciseGroups).map(([exerciseName, workouts]) => {
            // Sort workouts by setNumber to maintain correct set order
            const sortedWorkouts = [...workouts].sort((a, b) => {
              const aSetNum = (a as any).setNumber || 0
              const bSetNum = (b as any).setNumber || 0
              if (aSetNum !== bSetNum) {
                return aSetNum - bSetNum
              }
              return Number(a.id) - Number(b.id)
            })
            
            // Combine all sets for this exercise
            const totalSets = sortedWorkouts.length
            const durationSeconds = sortedWorkouts[0].durationSeconds
            const minId = Math.min(...sortedWorkouts.map(w => {
              const n = Number(String(w.id).replace(/\D/g, ''))
              return isNaN(n) ? 0 : n
            }))
            
            return {
              id: sortedWorkouts[0].id,
              minId,
              exerciseName,
              sets: totalSets,
              setDetails: sortedWorkouts.map(w => ({
                reps: w.timeSeconds ? 0 : w.reps,
                timeSeconds: w.timeSeconds,
                weight: w.weight,
                setType: w.setType
              })),
              reps: sortedWorkouts[0].timeSeconds ? 0 : sortedWorkouts[0].reps,
              timeSeconds: sortedWorkouts[0].timeSeconds,
              weight: sortedWorkouts[0].weight,
              durationSeconds,
              allIds: sortedWorkouts.map(w => w.id)
            }
          })
          .sort((a, b) => a.minId - b.minId)
        }
      })
  }, [filteredWorkouts])

  const totals = useMemo(() => {
    // Count distinct workout dates instead of counting each exercise row as a full workout
    const distinctDates = new Set(filteredWorkouts.map((w) => w.date))
    return filteredWorkouts.reduce(
      (acc, w) => {
        acc.sets += w.sets || 1
        if (!w.timeSeconds) {
          acc.reps += (w.sets || 1) * (w.reps || 0)
        } else {
          acc.totalTimeSec += (w.sets || 1) * (w.timeSeconds || 0)
        }
        const points = w.points ?? w.total_points ?? 0
        acc.points += points
        return acc
      },
      { workouts: distinctDates.size, sets: 0, reps: 0, totalTimeSec: 0, points: 0 },
    )
  }, [filteredWorkouts])
  
  // Accurate streak calculation with yesterday fallback
  const streak = useMemo(() => {
    const workoutDates = new Set(workouts.map((w) => w.date))
    if (workoutDates.size === 0) return 0
    
    let streakCount = 0
    const today = new Date()
    const todayStr = toLocalDateString(today)
    
    let checkDate = new Date(today)
    // If no workout yet today, start checking from yesterday so morning streak doesn't drop to 0!
    if (!workoutDates.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1)
    }
    
    while (true) {
      const dateStr = toLocalDateString(checkDate)
      if (workoutDates.has(dateStr)) {
        streakCount++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
    
    return streakCount
  }, [workouts])

  const handleStartWorkout = () => {
    router.push("/workout")
  }

  const handleStartRoutine = async (routineId: string) => {
    try {
      setStartingRoutine(routineId)
      await start(routineId)
      router.push("/workout")
    } catch (error) {
      console.error("Failed to start routine:", error)
      toast.error("Failed to start routine")
    } finally {
      setStartingRoutine(null)
    }
  }

  const handleDelete = async (ids: string[]) => {
    setPendingDeleteIds(ids)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    try {
      await Promise.all(pendingDeleteIds.map((id) => remove(id)))
      await refresh()
      toast.success("Workout deleted successfully")
    } catch (error) {
      console.error("Error deleting workout:", error)
      toast.error("Failed to delete workout")
    } finally {
      setDeleteDialogOpen(false)
      setPendingDeleteIds([])
    }
  }

  const handleEdit = async (editedWorkout: TodayWorkoutData) => {
    try {
      // Get bearer token from localStorage
      const token = localStorage.getItem("bearer_token")
      if (!token) {
        toast.error("Authentication required. Please login again.")
        router.push("/login")
        return
      }

      const authHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }

      // Find the original workout from groupedWorkouts to get all IDs
      const originalWorkout = groupedWorkouts.find((w) => w.date === editedWorkout.date)
      if (!originalWorkout) {
        toast.error("Original workout not found")
        return
      }
      
      // Get all original IDs from the workout
      const originalIds = originalWorkout.exercises.flatMap((ex) => ex.allIds || [ex.id])
      
      // Separate new exercises from existing ones
      const newExercises: typeof editedWorkout.exercises = []
      const existingExercises: typeof editedWorkout.exercises = []
      const editedIds: string[] = []
      
      editedWorkout.exercises.forEach((exercise: any) => {
        if (String(exercise.id).startsWith('new-')) {
          newExercises.push(exercise)
        } else {
          existingExercises.push(exercise)
          // Collect all IDs from edited exercises
          editedIds.push(...(exercise.allIds || [exercise.id]))
        }
      })
      
      // Find deleted workout IDs (IDs that were in original but not in edited)
      const deletedIds = originalIds.filter(id => !editedIds.includes(id))
      
      // Delete removed workout records
      if (deletedIds.length > 0) {
        await Promise.all(
          deletedIds.map(async (id) => {
            const res = await fetch(`/api/workouts/${id}`, {
              method: "DELETE",
              headers: authHeaders,
            })
            
            if (!res.ok) {
              console.error(`Failed to delete workout ${id}`)
            }
          })
        )
      }
      
      // Update existing exercises
      await Promise.all(
        existingExercises.flatMap((exercise: any) =>
          (exercise.allIds || [exercise.id]).map(async (id: string, idx: number) => {
            const setDetail = exercise.setDetails?.[idx]
            if (!setDetail) return

            // Only include defined fields
            const updatePayload: any = {
              date: editedWorkout.date,
              time: editedWorkout.time,
            }
            
            if (setDetail.reps !== undefined && setDetail.reps !== null) {
              updatePayload.reps = setDetail.reps
            }
            if (setDetail.timeSeconds !== undefined && setDetail.timeSeconds !== null) {
              updatePayload.timeSeconds = setDetail.timeSeconds
            }
            if (setDetail.weight !== undefined && setDetail.weight !== null) {
              updatePayload.weight = setDetail.weight
            }

            const res = await fetch(`/api/workouts/${id}`, {
              method: "PUT",
              headers: authHeaders,
              body: JSON.stringify(updatePayload),
            })

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}))
              console.error("Failed to update workout:", errorData)
              throw new Error(errorData.error || "Failed to update workout")
            }
          })
        )
      )
      
      // Create new exercises
      await Promise.all(
        newExercises.flatMap((exercise: any) => {
          // Find the exercise details to get the exercise ID
          const exerciseDetails = exercises?.find((e) => e.name === exercise.exerciseName)
          if (!exerciseDetails) return []
          
          return (exercise.setDetails || []).map(async (setDetail: any, setIndex: number) => {
            const createPayload: any = {
              date: editedWorkout.date,
              time: editedWorkout.time,
              exerciseId: exerciseDetails.id,
              exerciseName: exercise.exerciseName,
              sets: 1,
              setNumber: setIndex + 1,
            }
            
            if (setDetail.reps !== undefined && setDetail.reps !== null) {
              createPayload.reps = setDetail.reps
            } else {
              createPayload.reps = 0
            }
            
            if (setDetail.timeSeconds !== undefined && setDetail.timeSeconds !== null) {
              createPayload.timeSeconds = setDetail.timeSeconds
            }
            if (setDetail.weight !== undefined && setDetail.weight !== null) {
              createPayload.weight = setDetail.weight
            }

            const res = await fetch("/api/workouts", {
              method: "POST",
              headers: authHeaders,
              body: JSON.stringify(createPayload),
            })

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}))
              console.error("Failed to create new exercise:", errorData)
              throw new Error(errorData.error || "Failed to create new exercise")
            }
          })
        })
      )

      await refresh()
      toast.success("Workout updated successfully")
    } catch (error) {
      console.error("Error updating workout:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update workout")
    }
  }

  const navigatePeriod = (direction: "prev" | "next") => {
    if (timePeriod === "all") return
    
    const newDate = new Date(currentDate)
    
    switch (timePeriod) {
      case "weekly":
        newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7))
        break
      case "monthly":
        newDate.setMonth(currentDate.getMonth() + (direction === "next" ? 1 : -1))
        break
      case "yearly":
        newDate.setFullYear(currentDate.getFullYear() + (direction === "next" ? 1 : -1))
        break
    }
    
    setCurrentDate(newDate)
  }

  const handlePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period)
    setCurrentDate(new Date()) // Reset to current date when changing period
  }

  if (!mounted) {
    return (
      <main className="pb-32 md:pb-12">
        <section className="w-full px-4 lg:px-8 pt-4">
          <div className="mx-auto max-w-7xl flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="pb-32 md:pb-12">
      {/* Overview Stat Cards */}
      <section className="w-full px-4 lg:px-8 pt-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCard 
              label="Streak" 
              value={streak} 
            />
            <SummaryCard 
              label="Workouts" 
              value={totals.workouts} 
            />
            <SummaryCard 
              label="Total Points" 
              value={totals.points} 
            />
            <SummaryCard 
              label="Sets" 
              value={totals.sets} 
            />
          </div>
        </div>
      </section>

      <section className="w-full px-4 lg:px-8 pt-4">
        <div className="mx-auto max-w-7xl">
          <button
            onClick={() => router.push("/workout")}
            aria-label="Start workout"
            className="w-full rounded-xl bg-primary px-5 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md"
          >
            <Plus className="h-5 w-5" />
            <span>Start Workout</span>
          </button>
        </div>
      </section>

      <section className="w-full px-4 lg:px-8 pt-4">
        <div className="mx-auto max-w-7xl grid gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">Workouts</h2>
            
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {/* Date Range Navigation */}
              <div className="flex items-center gap-1 border rounded-lg px-1.5 py-1 bg-card flex-1 sm:flex-none justify-between sm:justify-start">
                <button
                    onClick={() => navigatePeriod("prev")}
                    disabled={timePeriod === "all"}
                    aria-label="Previous period"
                    className="p-1 hover:bg-secondary rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                
                <div className="px-1 text-xs sm:text-sm font-medium min-w-[100px] sm:min-w-[140px] text-center text-foreground truncate">
                  {formatDateRange(dateRange.start, dateRange.end, timePeriod)}
                </div>
                
                <button
                    onClick={() => navigatePeriod("next")}
                    disabled={timePeriod === "all"}
                    aria-label="Next period"
                    className="p-1 hover:bg-secondary rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
              </div>

              {/* View Dropdown */}
              <label htmlFor="time-period-select" className="sr-only">Time period</label>
              <select
                id="time-period-select"
                value={timePeriod}
                onChange={(e) => handlePeriodChange(e.target.value as TimePeriod)}
                className="px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg border bg-background hover:bg-secondary transition-colors cursor-pointer text-foreground shrink-0"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>



          {workoutsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading workouts...</span>
              </div>
            </div>
          ) : groupedWorkouts.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center bg-card/40">
              <p className="text-sm font-medium text-foreground">No workouts found</p>
              <p className="text-xs text-muted-foreground mt-1">
                No workouts logged for this period. Start a session!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {groupedWorkouts.map((workout) => (
                  <motion.div
                    key={workout.date}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TodayWorkoutCard workout={workout} onDelete={handleDelete} onEdit={handleEdit} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workout</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workout? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function SummaryCard({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 flex flex-col items-center justify-center text-center transition-all hover:border-border">
      <span className="text-xs md:text-sm font-medium text-muted-foreground mb-1.5">
        {label}
      </span>
      <span className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
        {value.toLocaleString()}
      </span>
    </div>
  )
}