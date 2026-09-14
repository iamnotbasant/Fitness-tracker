"use client"

import { useState, useEffect } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import type { TodayWorkoutData, WorkoutExercise } from "@/components/today-workout-card"
import AddExercisePicker from "@/components/workout/add-exercise-picker"
import { useExercises } from "@/hooks/use-local-data"

type Props = {
  open: boolean
  onClose: () => void
  onSave: (workout: TodayWorkoutData) => void
  workout: TodayWorkoutData
}

export default function WorkoutEditDialog({ open, onClose, onSave, workout }: Props) {
  const [editableDate, setEditableDate] = useState("")
  const [editableTime, setEditableTime] = useState("")
  const [editableExercises, setEditableExercises] = useState<WorkoutExercise[]>([])
  const { exercises } = useExercises()

  useEffect(() => {
    if (open) {
      setEditableDate(workout.date)
      setEditableTime(workout.time || "00:00")
      setEditableExercises(JSON.parse(JSON.stringify(workout.exercises)))
    }
  }, [open, workout])

  if (!open) return null

  // Helper to check if exercise is timer-based
  const isTimerExercise = (exerciseName: string) => {
    const exercise = exercises?.find(e => e.name === exerciseName)
    return exercise?.type === "timer"
  }

  const updateExerciseSet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'timeSeconds' | 'weight', value: number | undefined) => {
    const updated = [...editableExercises]
    if (updated[exerciseIndex].setDetails) {
      updated[exerciseIndex].setDetails![setIndex] = {
        ...updated[exerciseIndex].setDetails![setIndex],
        [field]: value
      }
    }
    setEditableExercises(updated)
  }

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...editableExercises]
    const exercise = updated[exerciseIndex]
    
    if (exercise.setDetails && exercise.setDetails.length <= 1) {
      return
    }
    
    if (exercise.setDetails) {
      exercise.setDetails.splice(setIndex, 1)
      exercise.sets = exercise.setDetails.length
      
      if (exercise.allIds && exercise.allIds[setIndex]) {
        exercise.allIds.splice(setIndex, 1)
      }
    }
    
    setEditableExercises(updated)
  }

  const handleAddExercise = (exerciseId: string) => {
    const exercise = exercises?.find((e) => e.id === exerciseId)
    if (!exercise) return

    const isTimeBased = exercise.type === "timer"
    
    const newExercise: WorkoutExercise = {
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      exerciseName: exercise.name,
      sets: 3,
      reps: isTimeBased ? 1 : 10,
      timeSeconds: isTimeBased ? 30 : undefined,
      weight: isTimeBased ? undefined : 0,
      setDetails: Array.from({ length: 3 }, () => ({
        reps: isTimeBased ? 1 : 10,
        timeSeconds: isTimeBased ? 30 : undefined,
        weight: isTimeBased ? undefined : 0,
      })),
      allIds: [],
    }

    setEditableExercises([...editableExercises, newExercise])
  }

  const handleRemoveExercise = (exerciseIndex: number) => {
    if (confirm("Are you sure you want to remove this exercise?")) {
      const updated = [...editableExercises]
      updated.splice(exerciseIndex, 1)
      setEditableExercises(updated)
    }
  }

  const handleSave = () => {
    onSave({
      date: editableDate,
      time: editableTime,
      exercises: editableExercises
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-card shadow-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">Edit Workout</h2>
            <p className="text-sm text-muted-foreground mt-1">Make changes to your workout</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/30 p-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Date</div>
              <input
                type="date"
                value={editableDate}
                onChange={(e) => setEditableDate(e.target.value)}
                className="w-full rounded-lg border bg-background px-2 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Time</div>
              <input
                type="time"
                value={editableTime}
                onChange={(e) => setEditableTime(e.target.value)}
                className="w-full rounded-lg border bg-background px-2 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-4">
            {editableExercises.map((exercise, exIdx) => {
              // Check if this exercise is timer-based
              const isTimeBased = isTimerExercise(exercise.exerciseName)

              return (
                <div key={exercise.id} className="rounded-xl border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-primary">{exercise.exerciseName}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {exercise.setDetails?.length || exercise.sets} set{(exercise.setDetails?.length || exercise.sets) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveExercise(exIdx)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Remove exercise"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {exercise.setDetails && exercise.setDetails.length > 0 ? (
                      exercise.setDetails.map((setDetail, setIdx) => (
                        <div key={setIdx} className="flex items-center gap-3 text-sm">
                          <span className="font-medium w-12">Set {setIdx + 1}</span>
                          
                          {isTimeBased ? (
                            <>
                              <input
                                type="number"
                                value={setDetail.timeSeconds ?? ""}
                                onChange={(e) => updateExerciseSet(exIdx, setIdx, 'timeSeconds', Number(e.target.value) || undefined)}
                                className="w-20 rounded-lg border bg-card px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary"
                                placeholder="sec"
                                min={0}
                              />
                              <span className="text-muted-foreground">seconds</span>
                            </>
                          ) : (
                            <>
                              <input
                                type="number"
                                value={setDetail.reps ?? ""}
                                onChange={(e) => updateExerciseSet(exIdx, setIdx, 'reps', Number(e.target.value) || undefined)}
                                className="w-20 rounded-lg border bg-card px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary"
                                placeholder="reps"
                                min={0}
                              />
                              <span className="text-muted-foreground">reps</span>
                            </>
                          )}

                          {setDetail.weight !== undefined && !isTimeBased && (
                            <>
                              <input
                                type="number"
                                value={setDetail.weight ?? ""}
                                onChange={(e) => updateExerciseSet(exIdx, setIdx, 'weight', Number(e.target.value) || undefined)}
                                className="w-20 rounded-lg border bg-card px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary"
                                placeholder="kg"
                                min={0}
                                step="0.5"
                              />
                              <span className="text-muted-foreground">kg</span>
                            </>
                          )}

                          <button
                            onClick={() => handleRemoveSet(exIdx, setIdx)}
                            disabled={exercise.setDetails!.length <= 1}
                            className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground disabled:hover:bg-transparent"
                            aria-label="Remove set"
                            title={exercise.setDetails!.length <= 1 ? "Cannot remove last set" : "Remove set"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No set details available for editing
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Add Exercise Button */}
            <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-4 flex items-center justify-center">
              <AddExercisePicker onAdd={handleAddExercise} />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center gap-3 border-t bg-card px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border bg-background px-4 py-3 font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}