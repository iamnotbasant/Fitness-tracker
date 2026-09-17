"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authClient, useSession } from "@/lib/auth-client"
import { useExercises, useRoutines } from "@/hooks/use-local-data"
import { ArrowLeft, Plus, Search, Trash2, GripVertical } from "lucide-react"
import type { RoutineExercise } from "@/lib/types"

export default function NewRoutinePage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user && mounted) {
      router.push("/login?redirect=/workout/routines/new")
    }
  }, [session, isPending, router, mounted])

  const { exercises } = useExercises()
  const { create } = useRoutines()
  
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [routineExercises, setRoutineExercises] = useState<RoutineExercise[]>([])
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const addExercise = (exerciseId: string, exerciseName: string, split?: string, level?: number) => {
    const exRecord = exercises?.find(e => e.id === exerciseId)
    const isTimer = exRecord?.type === "timer" || exerciseName.toLowerCase().includes("plank")

    const newEx: RoutineExercise = {
      exerciseId,
      exerciseName,
      split: split as any,
      level,
      type: exRecord?.type,
      defaultSets: 3,
      defaultReps: isTimer ? undefined : 10,
      defaultTimeSeconds: isTimer ? 30 : undefined,
      restSec: 60,
      notes: "",
    }
    setRoutineExercises([...routineExercises, newEx])
    setShowExercisePicker(false)
    setSearchQuery("")
  }

  const removeExercise = (index: number) => {
    setRoutineExercises(routineExercises.filter((_, i) => i !== index))
  }

  const updateExercise = (index: number, updates: Partial<RoutineExercise>) => {
    setRoutineExercises(
      routineExercises.map((ex, i) => (i === index ? { ...ex, ...updates } : ex))
    )
  }

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Please enter a routine name")
      return
    }
    if (routineExercises.length === 0) {
      alert("Please add at least one exercise")
      return
    }

    await create({
      name: name.trim(),
      description: description.trim() || undefined,
      exercises: routineExercises,
    })

    router.push("/workout")
  }

  // Show loading while checking authentication
  if (!mounted || isPending) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  // Don't render content if not authenticated
  if (!session?.user) {
    return null
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-muted rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl md:text-2xl font-semibold flex-1">New Routine</h1>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            Save
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pt-6 space-y-4">
        {/* Routine Info */}
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Routine Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Push Day, Full Body A"
              className="w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this routine..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        {/* Exercise List */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Exercises ({routineExercises.length})</h2>

          {routineExercises.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">No exercises added yet</p>
              <button
                onClick={() => setShowExercisePicker(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Exercise
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {routineExercises.map((ex, index) => (
                <div key={index} className="rounded-xl border bg-background p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-1 cursor-grab hover:bg-muted rounded">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{ex.exerciseName}</h3>
                    </div>
                    <button
                      onClick={() => removeExercise(index)}
                      className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Sets</label>
                      <input
                        type="number"
                        value={ex.defaultSets ?? ""}
                        onChange={(e) => updateExercise(index, { defaultSets: e.target.value ? parseInt(e.target.value) : undefined })}
                        min={1}
                        placeholder="Optional"
                        className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        {ex.type === "timer" || ex.defaultTimeSeconds !== undefined ? "Time (sec)" : "Reps"}
                      </label>
                      <input
                        type="number"
                        value={ex.type === "timer" || ex.defaultTimeSeconds !== undefined ? (ex.defaultTimeSeconds ?? "") : (ex.defaultReps ?? "")}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value) : undefined
                          if (ex.type === "timer" || ex.defaultTimeSeconds !== undefined) {
                            updateExercise(index, { defaultTimeSeconds: val, defaultReps: undefined })
                          } else {
                            updateExercise(index, { defaultReps: val })
                          }
                        }}
                        min={1}
                        placeholder={ex.type === "timer" || ex.defaultTimeSeconds !== undefined ? "e.g. 30" : "Optional"}
                        className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Rest (s)</label>
                      <input
                        type="number"
                        value={ex.restSec || 60}
                        onChange={(e) => updateExercise(index, { restSec: parseInt(e.target.value) || 60 })}
                        min={0}
                        step={15}
                        className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Notes (Optional)</label>
                    <input
                      type="text"
                      value={ex.notes || ""}
                      onChange={(e) => updateExercise(index, { notes: e.target.value })}
                      placeholder="Add exercise notes..."
                      className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={() => setShowExercisePicker(true)}
                className="w-full py-3 border border-dashed rounded-xl hover:bg-muted flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Exercise
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Exercise Picker Modal */}
      {showExercisePicker && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-2xl shadow-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search exercises..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>
              <button
                onClick={() => {
                  setShowExercisePicker(false)
                  setSearchQuery("")
                }}
                className="px-3 py-2 text-sm font-medium hover:bg-muted rounded-lg"
              >
                Cancel
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {filteredExercises.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No exercises found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredExercises.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => addExercise(ex.id, ex.name, ex.split, ex.level)}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="font-medium">{ex.name}</div>
                      {ex.split && (
                        <div className="text-xs text-muted-foreground capitalize">{ex.split}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}