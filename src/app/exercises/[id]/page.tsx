"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { authClient, useSession } from "@/lib/auth-client"
import { useExercises, useWorkouts } from "@/hooks/use-local-data"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Bar, BarChart, Cell } from "recharts"
import { Trophy, TrendingUp, Award, ChevronLeft, ChevronRight, Save, X, Lock, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import type { Exercise, Workout } from "@/lib/types"

const BODY_PARTS = [
  "Chest",
  "Upper Back",
  "Lats",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Core / Abs",
  "Obliques",
  "Lower Back",
  "Glutes",
  "Quads",
  "Hamstrings",
  "Adductors",
  "Abductors",
  "Calves",
  "Neck",
]
const TAGS = ["calisthenics", "strength", "endurance", "flexibility", "recovery", "hiit", "mobility"]
const EXERCISE_TYPES: NonNullable<Exercise["type"]>[] = ["standard", "timer", "weighted", "bodyweight", "cardio", "mobility"]
const SPLITS: NonNullable<Exercise["split"]>[] = ["push", "pull", "legs", "upper", "lower", "full", "core", "other"]

const slugify = (s: string) => {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

const formatTime = (seconds: number) => {
  if (!seconds || seconds === 0) return "0s"
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return secs > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${mins}m`
  }
  return `${secs}s`
}

export default function ExerciseDetailPage() {
  const router = useRouter()
  const routeParams = useParams()
  const exerciseId = (routeParams?.id as string) || ""
  const { data: session, isPending } = useSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { exercises, update, remove } = useExercises()
  const { workouts } = useWorkouts()
  const searchParams = useSearchParams()
  const isEditMode = searchParams.get("mode") === "edit"
  
  const [tab, setTab] = useState<"analytics" | "info" | "history">("analytics")
  const [timePeriod, setTimePeriod] = useState<"weekly" | "monthly" | "yearly" | "all">("all")
  const [currentDate, setCurrentDate] = useState(new Date())

  const [editName, setEditName] = useState("")
  const [editSelectedTypes, setEditSelectedTypes] = useState<string[]>(["standard"])
  const [editSplit, setEditSplit] = useState("")
  const [editLevel, setEditLevel] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editBodyParts, setEditBodyParts] = useState<string[]>([])
  const [editTags, setEditTags] = useState<string[]>([])
  const [editImageUrl, setEditImageUrl] = useState<string | undefined>(undefined)
  const [editImageUrlInput, setEditImageUrlInput] = useState("")
  const [editRepGoal, setEditRepGoal] = useState<number | "">("")
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const isAdmin = true

  const exercise = useMemo(() => {
    const byId = exercises.find((e) => String(e.id) === exerciseId)
    if (byId) return byId
    return exercises.find((e) => slugify(e.name) === exerciseId)
  }, [exercises, exerciseId])

  useEffect(() => {
    if (exercise && isEditMode) {
      setEditName(exercise.name || "")
      const rawType = exercise.type || "standard"
      const typesList = rawType.includes(",") ? rawType.split(",").map((t) => t.trim()) : [rawType]
      setEditSelectedTypes(typesList)
      setEditSplit(exercise.split || "")
      setEditLevel(exercise.level != null ? exercise.level.toString() : "1")
      setEditDescription(exercise.description || "")
      setEditBodyParts(exercise.bodyParts || [])
      setEditTags(exercise.tags || [])
      setEditImageUrl(exercise.imageUrl || undefined)
      setEditImageUrlInput("")
      setEditRepGoal(exercise.repGoal || "")
    }
  }, [exercise, isEditMode])

  const onPickFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      console.log("[v0] not an image, ignoring:", file.type)
      return
    }

    const readAsDataURL = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("Failed to read file"))
        reader.readAsDataURL(f)
      })

    try {
      const data = await readAsDataURL(file)

      const img = new Image()
      img.onload = () => {
        try {
          const targetRatio = 16 / 9
          const srcW = img.naturalWidth
          const srcH = img.naturalHeight
          const srcRatio = srcW / srcH

          let cropW = srcW
          let cropH = Math.round(srcW / targetRatio)
          if (srcRatio < targetRatio) {
            cropH = srcH
            cropW = Math.round(srcH * targetRatio)
          }
          const sx = Math.max(0, Math.round((srcW - cropW) / 2))
          const sy = Math.max(0, Math.round((srcH - cropH) / 2))

          const maxW = 1600
          const scale = Math.min(1, maxW / cropW)
          const outW = Math.round(cropW * scale)
          const outH = Math.round(outW / targetRatio)

          const canvas = document.createElement("canvas")
          canvas.width = outW
          canvas.height = outH
          const ctx = canvas.getContext("2d")
          if (!ctx) throw new Error("Canvas context not available")

          ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outW, outH)

          const out = canvas.toDataURL("image/jpeg", 0.82)
          setEditImageUrl(out)
        } catch (err) {
          console.log("[v0] image processing error:", (err as Error).message)
          setEditImageUrl(data)
        }
      }
      img.src = data
    } catch (e) {
      console.log("[v0] image read error:", e)
    }
  }

  const handleSave = async () => {
    if (!exercise) return
    
    setIsSaving(true)
    try {
      const finalType = editSelectedTypes.length > 1 ? editSelectedTypes.join(",") : (editSelectedTypes[0] || "standard")
      const updatePayload: Exercise = {
        id: exercise.id,
        name: editName.trim(),
        type: finalType as any,
        split: editSplit as any,
        level: editLevel ? parseInt(editLevel) : undefined,
        description: editDescription.trim() || undefined,
        bodyParts: editBodyParts,
        tags: editTags,
        imageUrl: editImageUrl || editImageUrlInput.trim() || undefined,
        repGoal: editRepGoal ? Number(editRepGoal) : undefined,
      }
      
      await update(updatePayload)
      
      toast.success("Exercise updated successfully!")
      router.push(`/exercises/${exercise.id}`)
    } catch (error) {
      console.error("Failed to update exercise:", error)
      toast.error("Failed to update exercise")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    router.push(`/exercises/${exercise?.id}`)
  }

  const handleDelete = async () => {
    if (!exercise) return
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!exercise) return
    
    try {
      await remove(exercise.id)
      toast.success("Exercise deleted successfully")
      router.push("/exercises")
    } catch (error) {
      console.error("Failed to delete exercise:", error)
      toast.error("Failed to delete exercise")
    } finally {
      setDeleteDialogOpen(false)
    }
  }

  const isTimerExercise = exercise?.type === "timer"

  const dateRange = useMemo(() => {
    if (timePeriod === "all") {
      return { start: null, end: null, label: "All Time" }
    }

    const now = new Date(currentDate)
    now.setHours(23, 59, 59, 999)

    if (timePeriod === "weekly") {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)
      
      const label = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      
      return { start: startOfWeek, end: endOfWeek, label }
    }

    if (timePeriod === "monthly") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      endOfMonth.setHours(23, 59, 59, 999)
      
      const label = startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      
      return { start: startOfMonth, end: endOfMonth, label }
    }

    if (timePeriod === "yearly") {
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      startOfYear.setHours(0, 0, 0, 0)
      
      const endOfYear = new Date(now.getFullYear(), 11, 31)
      endOfYear.setHours(23, 59, 59, 999)
      
      const label = startOfYear.getFullYear().toString()
      
      return { start: startOfYear, end: endOfYear, label }
    }

    return { start: null, end: null, label: "All Time" }
  }, [timePeriod, currentDate])

  const handlePrevious = () => {
    if (timePeriod === "all") return
    
    const newDate = new Date(currentDate)
    
    if (timePeriod === "weekly") {
      newDate.setDate(newDate.getDate() - 7)
    } else if (timePeriod === "monthly") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (timePeriod === "yearly") {
      newDate.setFullYear(newDate.getFullYear() - 1)
    }
    
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    if (timePeriod === "all") return
    
    const newDate = new Date(currentDate)
    
    if (timePeriod === "weekly") {
      newDate.setDate(newDate.getDate() + 7)
    } else if (timePeriod === "monthly") {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (timePeriod === "yearly") {
      newDate.setFullYear(newDate.getFullYear() + 1)
    }
    
    setCurrentDate(newDate)
  }

  const filteredWorkoutsByPeriod = useMemo(() => {
    if (!exercise) return []
    
    // Use strict matching - only match by exerciseId
    const filtered = workouts.filter((w) => {
      // First check if exerciseId matches
      if (String(w.exerciseId) === String(exercise.id)) {
        return true
      }
      return false
    }).filter((w) => {
      if (timePeriod === "all") return true
      
      const workoutDate = new Date(w.date)
      workoutDate.setHours(0, 0, 0, 0)
      
      if (dateRange.start && dateRange.end) {
        return workoutDate >= dateRange.start && workoutDate <= dateRange.end
      }
      
      return true
    })
    
    return filtered
  }, [workouts, exercise, timePeriod, dateRange])

  const sessionPoints = useMemo(() => {
    if (!exercise) return []

    const grouped = new Map<string, typeof filteredWorkoutsByPeriod>()
    filteredWorkoutsByPeriod.forEach((w) => {
      if (!grouped.has(w.date)) {
        grouped.set(w.date, [])
      }
      grouped.get(w.date)!.push(w)
    })

    return Array.from(grouped.entries())
      .map(([date, workouts]) => {
        const totalReps = workouts.reduce((sum, w) => sum + w.reps, 0)
        const totalTime = workouts.reduce((sum, w) => sum + (w.timeSeconds || 0), 0)
        const totalVolume = workouts.reduce((sum, w) => sum + (w.volume || 0), 0)
        const maxWeight = Math.max(...workouts.filter(w => w.weight).map(w => w.weight || 0), 0)
        const bestReps = Math.max(...workouts.map(w => w.reps))
        const totalSets = workouts.length
        const sets = workouts.map((w, idx) => ({
          setNumber: w.setNumber || idx + 1,
          reps: w.reps,
          weight: w.weight,
          timeSeconds: w.timeSeconds
        }))
        return {
          date,
          totalReps,
          totalTime,
          totalVolume,
          maxWeight,
          bestReps,
          totalSets,
          sets
        }
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [filteredWorkoutsByPeriod, exercise])

  const oneRMProgression = useMemo(() => {
    if (isTimerExercise) return []
    return sessionPoints
      .filter(p => p.maxWeight > 0)
      .map(p => ({
        date: p.date,
        oneRM: Math.round(p.maxWeight * (1 + p.bestReps / 30))
      }))
  }, [sessionPoints, isTimerExercise])

  const volumeProgression = useMemo(() => {
    return sessionPoints.map(p => ({
      date: p.date,
      value: isTimerExercise ? p.totalTime : p.totalReps,
      sets: p.sets
    }))
  }, [sessionPoints, isTimerExercise])

  const personalRecords = useMemo(() => {
    if (sessionPoints.length === 0) return null
    
    if (isTimerExercise) {
      const bestTime = Math.max(...sessionPoints.map(p => p.totalTime))
      const totalVolume = sessionPoints.reduce((sum, p) => sum + p.totalTime, 0)
      
      return {
        bestTime,
        bestVolume: totalVolume,
        totalSessions: sessionPoints.length
      }
    } else {
      const bestReps = Math.max(...sessionPoints.map(p => p.totalReps))
      const bestVolume = Math.max(...sessionPoints.map(p => p.totalVolume))
      const bestWeight = Math.max(...sessionPoints.filter(p => p.maxWeight > 0).map(p => p.maxWeight))
      const best1RM = oneRMProgression.length > 0 ? Math.max(...oneRMProgression.map(p => p.oneRM)) : 0
      
      return {
        bestReps,
        bestVolume,
        bestWeight: bestWeight > 0 ? bestWeight : null,
        best1RM: best1RM > 0 ? best1RM : null,
        totalSessions: sessionPoints.length
      }
    }
  }, [sessionPoints, oneRMProgression, isTimerExercise])

  const stats = useMemo(() => {
    if (!sessionPoints.length) return { total: 0, best: 0, avg: 0, isTime: isTimerExercise }
    const total = sessionPoints.length
    
    if (isTimerExercise) {
      const best = Math.max(...sessionPoints.map(p => p.totalTime))
      const avg = Math.round(sessionPoints.reduce((sum, p) => sum + p.totalTime, 0) / total)
      return { total, best, avg, isTime: true }
    } else {
      const best = Math.max(...sessionPoints.map(p => p.totalReps))
      const avg = Math.round(sessionPoints.reduce((sum, p) => sum + p.totalReps, 0) / total)
      return { total, best, avg, isTime: false }
    }
  }, [sessionPoints, isTimerExercise])

  const groupedHistory = useMemo(() => {
    if (!exercise) return []
    
    const grouped = new Map<string, typeof filteredWorkoutsByPeriod>()
    filteredWorkoutsByPeriod.forEach((w) => {
      const key = `${w.date}-${w.time || ''}`
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(w)
    })
    
    return Array.from(grouped.entries())
      .map(([key, workouts]) => {
        // Sort workouts by setNumber to maintain correct set order
        const sortedWorkouts = [...workouts].sort((a, b) => {
          const aSetNum = a.setNumber || 0
          const bSetNum = b.setNumber || 0
          if (aSetNum !== bSetNum) {
            return aSetNum - bSetNum
          }
          return Number(a.id) - Number(b.id)
        })
        
        return {
          date: sortedWorkouts[0].date,
          time: sortedWorkouts[0].time,
          // Store individual set details
          sets: sortedWorkouts.map((w, idx) => ({
            setNumber: w.setNumber || idx + 1,
            reps: w.reps,
            timeSeconds: w.timeSeconds,
            weight: w.weight,
            volume: w.volume
          }))
        }
      })
      .sort((a, b) => {
        const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime()
        if (dateCompare !== 0) return dateCompare
        const timeA = a.time || '00:00'
        const timeB = b.time || '00:00'
        return timeB.localeCompare(timeA)
      })
  }, [filteredWorkoutsByPeriod, exercise])

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null

    const data = payload[0].payload
    const sets = data.sets || []

    return (
      <div className="rounded-lg bg-gray-900 p-3 shadow-lg border border-gray-700">
        <p className="text-xs text-gray-300 mb-2">
          {new Date(data.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <p className="text-sm font-semibold text-white mb-2">
          Total: {isTimerExercise ? formatTime(data.value) : `${data.value} reps`}
        </p>
        {sets.length > 0 && (
          <div className="border-t border-gray-700 pt-2 mt-2">
            <p className="text-xs text-gray-400 mb-1">Sets ({sets.length}):</p>
            {sets.map((set: any, idx: number) => (
              <p key={idx} className="text-xs text-gray-200">
                Set {set.setNumber}: {isTimerExercise ? formatTime(set.timeSeconds || 0) : `${set.reps} reps`}
                {set.weight > 0 && !isTimerExercise && ` × ${set.weight}kg`}
              </p>
            ))}
          </div>
        )}
      </div>
    )
  }

  const TimePeriodFilter = () => (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border bg-card px-2 py-1.5">
        <button
          onClick={handlePrevious}
          disabled={timePeriod === "all"}
          className="p-0.5 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous period"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        
        <div className="min-w-[140px] text-center text-xs font-medium px-1">
          {dateRange.label}
        </div>
        
        <button
          onClick={handleNext}
          disabled={timePeriod === "all"}
          className="p-0.5 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next period"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <select
        value={timePeriod}
        onChange={(e) => {
          setTimePeriod(e.target.value as any)
          setCurrentDate(new Date())
        }}
        className="rounded-lg border bg-card px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="all">All Time</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
      </select>
    </div>
  )

  if (!mounted || isPending) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </main>
    )
  }

  if (!exercise) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between py-4">
            <Link href="/exercises" className="text-sm text-muted-foreground hover:underline">
              ← Back to Exercises
            </Link>
          </div>
        </header>
        <div className="mt-6 rounded-lg border p-6">
          <h1 className="text-balance text-2xl font-semibold">Exercise not found</h1>
          <p className="mt-2 text-muted-foreground">The exercise you're looking for doesn't exist.</p>
        </div>
      </main>
    )
  }

  if (isEditMode) {
    return (
      <main className="mx-auto max-w-4xl px-3 pb-16 md:px-4">
        <header className="sticky top-0 z-20 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50 border-b">
          <div className="flex items-center justify-between py-3 md:py-4">
            <Link href="/exercises" className="text-sm text-muted-foreground hover:underline">
              ← Back to Exercises
            </Link>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-background px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !editName.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </header>

        <section className="mt-6 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Edit Exercise</h1>
            <p className="text-sm text-muted-foreground">Update the exercise details below</p>
          </div>

          <div className="rounded-lg border bg-card p-6 space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Exercise Name *
              </label>
              <input
                id="name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Push-ups"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Exercise Types (Multi-select)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {EXERCISE_TYPES.map((t) => {
                    const isSelected = editSelectedTypes.includes(t)
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => {
                          setEditSelectedTypes((prev) => {
                            if (prev.includes(t)) {
                              return prev.length > 1 ? prev.filter((x) => x !== t) : prev
                            } else {
                              return [...prev, t]
                            }
                          })
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border capitalize transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                            : "bg-secondary/60 text-muted-foreground border-border/70 hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="split" className="block text-sm font-medium mb-2">
                  Split
                </label>
                <select
                  id="split"
                  value={editSplit}
                  onChange={(e) => setEditSplit(e.target.value)}
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">No split</option>
                  {SPLITS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="level" className="block text-sm font-medium mb-2">
                  Level
                </label>
                <select
                  id="level"
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value)}
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((l) => (
                    <option key={l} value={l}>
                      Level {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="repGoal" className="block text-sm font-medium mb-2">
                  Rep Goal
                </label>
                <input
                  id="repGoal"
                  type="number"
                  value={editRepGoal}
                  onChange={(e) => setEditRepGoal(e.target.value ? Number(e.target.value) : "")}
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g., 10"
                  min="1"
                />
              </div>
            </div>

            <fieldset className="rounded-lg border p-4">
              <legend className="px-1 text-sm font-medium">Body Parts</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {BODY_PARTS.map((bp) => {
                  const active = editBodyParts.includes(bp)
                  return (
                    <button
                      type="button"
                      key={bp}
                      onClick={() => setEditBodyParts((arr) => (arr.includes(bp) ? arr.filter((x) => x !== bp) : [...arr, bp]))}
                      className={[
                        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        active ? "bg-foreground text-background" : "bg-card hover:bg-muted",
                      ].join(" ")}
                    >
                      {bp}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Describe the exercise..."
              />
            </div>

            <fieldset className="rounded-lg border p-4">
              <legend className="px-1 text-sm font-medium">Media (optional)</legend>
              
              <div className="mt-3 space-y-4">
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Upload image file</label>
                  <label className="grid h-32 place-items-center rounded-lg border bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        if (f) {
                          await onPickFile(f)
                          setEditImageUrlInput("")
                        }
                      }}
                    />
                    <span>Click to upload image</span>
                  </label>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Paste image URL</label>
                  <input
                    type="url"
                    value={editImageUrlInput}
                    onChange={(e) => {
                      setEditImageUrlInput(e.target.value)
                      if (e.target.value.trim()) {
                        setEditImageUrl(undefined)
                      }
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {(editImageUrl || editImageUrlInput) && (
                  <div className="relative">
                    <img
                      src={editImageUrl || editImageUrlInput}
                      alt="Preview"
                      className="w-full rounded-md object-cover aspect-[16/9]"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=360&width=640&query=invalid%20image"
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditImageUrl(undefined)
                        setEditImageUrlInput("")
                      }}
                      className="absolute top-2 right-2 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </fieldset>

            <fieldset className="rounded-lg border p-4">
              <legend className="px-1 text-sm font-medium">Tags (optional)</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {TAGS.map((t) => {
                  const active = editTags.includes(t)
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setEditTags((arr) => (arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]))}
                      className={[
                        "rounded-full border px-4 py-2 text-sm font-medium transition-colors capitalize",
                        active ? "bg-secondary" : "bg-card hover:bg-muted",
                      ].join(" ")}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          </div>
        </section>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Exercise</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{exercise?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-3 pb-16 md:px-4">
      <header className="sticky top-0 z-20 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50 md:border-b">
        <div className="flex items-center justify-between py-3 md:py-4">
          <Link href="/exercises" className="text-sm text-muted-foreground hover:underline">
            ← Back to Exercises
          </Link>
          {isAdmin ? (
            <Link
              href={`/exercises/${exercise.id}?mode=edit`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Edit Exercise
            </Link>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border bg-muted px-4 py-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>View Only</span>
            </div>
          )}
        </div>
        <div className="pb-2 md:pb-3">
          <h1 className="text-pretty text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">{exercise.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {exercise.split ? (
              <span className="rounded-full border px-2.5 py-1 text-xs font-medium capitalize">{exercise.split}</span>
            ) : null}
            {typeof exercise.level === "number" ? (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">L{exercise.level}</span>
            ) : null}
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto md:border-b">
          {[
            { key: "analytics", label: "Analytics" },
            { key: "info", label: "Information" },
            { key: "history", label: "History" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={[
                "relative -mb-px shrink-0 px-2.5 py-2 text-sm font-medium",
                tab === t.key
                  ? "text-foreground underline decoration-2 underline-offset-8 md:border-b-2 md:border-foreground md:no-underline"
                  : "text-muted-foreground md:border-b-2 md:border-transparent",
              ].join(" ")}
              aria-current={tab === t.key ? "page" : undefined}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {exercise.imageUrl ? (
        <div className="mt-6 overflow-hidden rounded-xl border">
          <div className="aspect-[16/9] w-full bg-muted">
            <img
              src={exercise.imageUrl || "/placeholder.svg?height=360&width=640&query=exercise%20image"}
              alt={`${exercise.name} illustration`}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.visibility = "hidden"
              }}
            />
          </div>
        </div>
      ) : null}

      <section className="mt-6">
        {tab === "analytics" && (
          <div className="space-y-8">
            <div className="flex items-center justify-end">
              <TimePeriodFilter />
            </div>

            {personalRecords && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Personal Records
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {isTimerExercise ? (
                    <>
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="h-4 w-4 text-amber-500" />
                          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">Best Time</div>
                        </div>
                        <div className="text-2xl font-bold text-foreground">{formatTime(personalRecords.bestTime || 0)}</div>
                      </div>
                      
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="h-4 w-4 text-emerald-500" />
                          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Total Volume</div>
                        </div>
                        <div className="text-2xl font-bold text-foreground">{formatTime(personalRecords.bestVolume || 0)}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="h-4 w-4 text-amber-500" />
                          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">Best Reps</div>
                        </div>
                        <div className="text-2xl font-bold text-foreground">{personalRecords.bestReps}</div>
                      </div>
                      
                      {personalRecords.bestWeight && (
                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 backdrop-blur-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="h-4 w-4 text-blue-500" />
                            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">Best Weight</div>
                          </div>
                          <div className="text-2xl font-bold text-foreground">{personalRecords.bestWeight} kg</div>
                        </div>
                      )}
                      
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="h-4 w-4 text-emerald-500" />
                          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Best Volume</div>
                        </div>
                        <div className="text-2xl font-bold text-foreground">{personalRecords.bestVolume}</div>
                      </div>
                      
                      {personalRecords.best1RM && (
                        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 backdrop-blur-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="h-4 w-4 text-purple-500" />
                            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">Best 1RM</div>
                          </div>
                          <div className="text-2xl font-bold text-foreground">{personalRecords.best1RM} kg</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {sessionPoints.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="text-xs text-muted-foreground">Total Sessions</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{stats.total}</div>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="text-xs text-muted-foreground">{stats.isTime ? "Best Time" : "Best Reps"}</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">
                    {stats.isTime ? formatTime(stats.best) : stats.best}
                  </div>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="text-xs text-muted-foreground">{stats.isTime ? "Avg Time" : "Avg Reps"}</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">
                    {stats.isTime ? formatTime(stats.avg) : stats.avg}
                  </div>
                </div>
              </div>
            )}

            {volumeProgression.length > 0 && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">
                      {isTimerExercise ? "Time Progression" : "Reps Progression"}
                    </h2>
                  </div>
                  <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <p className="text-xs text-muted-foreground mb-4">
                      Track your progress over time
                    </p>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={volumeProgression} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="progressionGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-border/40" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                            fontSize={11}
                            stroke="currentColor"
                            className="stroke-muted-foreground/60 text-muted-foreground"
                            tickLine={false}
                          />
                          <YAxis 
                            allowDecimals={false} 
                            fontSize={11}
                            stroke="currentColor"
                            className="stroke-muted-foreground/60 text-muted-foreground"
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={isTimerExercise ? (val) => formatTime(val) : undefined}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2.5}
                            fill="url(#progressionGradient)"
                            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3, stroke: 'hsl(var(--background))' }}
                            activeDot={{ r: 5, strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">
                      {isTimerExercise ? "Total Time Per Session" : "Total Reps Per Session"}
                    </h2>
                  </div>
                  <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <p className="text-xs text-muted-foreground mb-4">
                      Hover over bars to see set-by-set breakdown
                    </p>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={volumeProgression} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="volumeGradient" x1="0" y1="1" x2="0" y2="0">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="stroke-border/40" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            fontSize={11}
                            stroke="currentColor"
                            className="stroke-muted-foreground/60 text-muted-foreground"
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            fontSize={11}
                            stroke="currentColor"
                            className="stroke-muted-foreground/60 text-muted-foreground"
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={isTimerExercise ? (val) => formatTime(val) : undefined}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar
                            dataKey="value"
                            fill="url(#volumeGradient)"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!isTimerExercise && oneRMProgression.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    1RM Progression
                  </h2>
                </div>
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                  <p className="text-xs text-muted-foreground mb-4">Estimated using Epley formula: 1RM = Weight × (1 + Reps/30)</p>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={oneRMProgression} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="oneRMGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-border/40" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                          fontSize={11}
                          stroke="currentColor"
                          className="stroke-muted-foreground/60 text-muted-foreground"
                          tickLine={false}
                        />
                        <YAxis 
                          allowDecimals={false} 
                          fontSize={11}
                          stroke="currentColor"
                          className="stroke-muted-foreground/60 text-muted-foreground"
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{ 
                            fontSize: 12,
                            backgroundColor: '#111827',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: '#ffffff'
                          }}
                          formatter={(val) => [`${val} kg`, "Estimated 1RM"]}
                          labelFormatter={(d: any) => new Date(d || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        />
                        <Area
                          type="monotone"
                          dataKey="oneRM"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2.5}
                          fill="url(#oneRMGradient)"
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3, stroke: 'hsl(var(--background))' }}
                          activeDot={{ r: 5, strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {sessionPoints.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">No workout data for this time period.</p>
            )}
          </div>
        )}

        {tab === "info" && (
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-medium">Information</h2>
            <div className="mt-3 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Split</div>
                  <div className="mt-1 font-medium capitalize text-foreground">{exercise.split || "—"}</div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Level</div>
                  <div className="mt-1 font-medium text-foreground">
                    {typeof exercise.level === "number" ? `L${exercise.level}` : "—"}
                  </div>
                </div>
              </div>
              {exercise.description ? (
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Description</div>
                  <p className="mt-1 leading-relaxed text-foreground">{exercise.description}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <TimePeriodFilter />
            </div>
            
            <div className="rounded-lg border p-4">
              <h2 className="text-lg font-medium mb-4">Workout History</h2>
              
              {groupedHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No workout history for this time period.</p>
              ) : (
                <div className="space-y-4">
                  {groupedHistory.map((session, idx) => (
                    <div key={idx} className="rounded-lg border bg-card p-4">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                          {new Date(session.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        
                        <span>•</span>
                        
                        {session.time && (
                          <div className="flex items-center gap-1.5">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            {new Date(`${session.date}T${session.time}`).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-4">{exercise.name}</h3>
                      
                      <div className="space-y-2">
                        {session.sets.map((set, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm">
                            <div className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-muted text-xs font-medium">
                              {set.setNumber}
                            </div>
                            <div className="text-foreground">
                              {isTimerExercise ? (
                                <>
                                  <span className="font-medium">{formatTime(set.timeSeconds || 0)}</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-medium">{set.reps} reps</span>
                                  {set.weight && set.weight > 0 && (
                                    <span className="text-muted-foreground ml-2">@ {set.weight} kg</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4 md:p-5 text-center shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}