"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import type { SessionExercise } from "@/lib/types"
import { useExercises } from "@/hooks/use-local-data"

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (exercises: SessionExercise[], duration: number, date: string, time: string) => void
  exercises: SessionExercise[]
  duration: number
  date: string
  time: string
}

export default function WorkoutConfirmationDialog({ open, onClose, onConfirm, exercises, duration, date, time }: Props) {
  const [editableExercises, setEditableExercises] = useState(exercises)
  const [editableDuration, setEditableDuration] = useState(duration)
  const [editableDate, setEditableDate] = useState("")
  const [editableTime, setEditableTime] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const { exercises: exercisesList } = useExercises()

  // Update state when dialog opens with new data
  useEffect(() => {
    if (open) {
      setEditableExercises(exercises)
      setEditableDuration(duration)
      setIsSaving(false)
      
      // Get current date and time if not properly set
      const now = new Date()
      
      // Handle date
      if (date && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        setEditableDate(date)
      } else if (date.includes('T')) {
        const [datePart] = date.split('T')
        setEditableDate(datePart)
      } else {
        // Fallback to current date
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        setEditableDate(`${year}-${month}-${day}`)
      }
      
      // Handle time - ensure it's in HH:MM format
      if (time && time.match(/^\d{2}:\d{2}/)) {
        setEditableTime(time)
      } else {
        // Fallback to current time
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        setEditableTime(`${hours}:${minutes}`)
      }
    }
  }, [open, exercises, duration, date, time])

  if (!open) return null

  // Helper to check if exercise is timer-based
  const isTimerExercise = (exerciseId: string) => {
    const exercise = exercisesList?.find(e => e.id === exerciseId)
    return exercise?.type === "timer"
  }

  const updateExerciseSet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'timeSeconds' | 'weight', value: number | undefined) => {
    const updated = [...editableExercises]
    updated[exerciseIndex].sets[setIndex] = {
      ...updated[exerciseIndex].sets[setIndex],
      [field]: value
    }
    setEditableExercises(updated)
  }

  const removeExercise = (exerciseIndex: number) => {
    setEditableExercises(editableExercises.filter((_, i) => i !== exerciseIndex))
  }

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...editableExercises]
    updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter((_, i) => i !== setIndex)
    setEditableExercises(updated)
  }

  const totalSets = editableExercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.done).length, 0)

  const handleSave = () => {
    if (isSaving) return
    setIsSaving(true)
    onConfirm(editableExercises, editableDuration, editableDate, editableTime)
  }

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  // Parse MM:SS back to seconds
  const parseDurationToSeconds = (timeStr: string) => {
    const parts = timeStr.split(':')
    if (parts.length === 2) {
      const mins = parseInt(parts[0]) || 0
      const secs = parseInt(parts[1]) || 0
      return mins * 60 + secs
    }
    return parseInt(timeStr) || 0
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-card shadow-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">Confirm Workout</h2>
            <p className="text-sm text-muted-foreground mt-1">Review and edit your workout before saving</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-2 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Workout Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl border bg-muted/30 p-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Date</div>
              <input
                type="date"
                value={editableDate}
                onChange={(e) => setEditableDate(e.target.value)}
                disabled={isSaving}
                className="w-full rounded-lg border bg-background px-2 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Time</div>
              <input
                type="time"
                value={editableTime}
                onChange={(e) => setEditableTime(e.target.value)}
                disabled={isSaving}
                className="w-full rounded-lg border bg-background px-2 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Duration (MM:SS)</div>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={formatDuration(editableDuration)}
                  onChange={(e) => {
                    const newDuration = parseDurationToSeconds(e.target.value)
                    setEditableDuration(newDuration)
                  }}
                  disabled={isSaving}
                  className="w-20 rounded-lg border bg-background px-2 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="0:00"
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Total Sets</div>
              <div className="font-medium">{totalSets}</div>
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-4">
            {editableExercises.map((exercise, exIdx) => {
              const completedSets = exercise.sets.filter(s => s.done)
              if (completedSets.length === 0) return null

              // Check if this exercise is timer-based by looking up its type
              const isTimeBased = isTimerExercise(exercise.exerciseId)

              return (
                <div key={exercise.id} className="rounded-xl border bg-background p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-primary">{exercise.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {completedSets.length} set{completedSets.length !== 1 ? 's' : ''} completed
                      </p>
                    </div>
                    <button
                      onClick={() => removeExercise(exIdx)}
                      disabled={isSaving}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-2">
                    {exercise.sets.map((set, setIdx) => {
                      if (!set.done) return null
                      
                      return (
                        <div key={setIdx} className="flex items-center gap-3 text-sm">
                          <span className="font-medium w-12">Set {setIdx + 1}</span>
                          
                          {isTimeBased ? (
                            <>
                              <input
                                type="number"
                                value={set.timeSeconds ?? ""}
                                onChange={(e) => updateExerciseSet(exIdx, setIdx, 'timeSeconds', Number(e.target.value) || undefined)}
                                disabled={isSaving}
                                className="w-20 rounded-lg border bg-card px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="sec"
                                min={0}
                              />
                              <span className="text-muted-foreground">seconds</span>
                            </>
                          ) : (
                            <>
                              <input
                                type="number"
                                value={set.reps ?? ""}
                                onChange={(e) => updateExerciseSet(exIdx, setIdx, 'reps', Number(e.target.value) || undefined)}
                                disabled={isSaving}
                                className="w-20 rounded-lg border bg-card px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="reps"
                                min={0}
                              />
                              <span className="text-muted-foreground">reps</span>
                            </>
                          )}

                          {set.weight !== undefined && !isTimeBased && (
                            <>
                              <input
                                type="number"
                                value={set.weight ?? ""}
                                onChange={(e) => updateExerciseSet(exIdx, setIdx, 'weight', Number(e.target.value) || undefined)}
                                disabled={isSaving}
                                className="w-20 rounded-lg border bg-card px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="kg"
                                min={0}
                                step="0.5"
                              />
                              <span className="text-muted-foreground">kg</span>
                            </>
                          )}

                          <button
                            onClick={() => removeSet(exIdx, setIdx)}
                            disabled={isSaving}
                            className="ml-auto text-xs text-destructive hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Remove
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {exercise.notes && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      <strong>Notes:</strong> {exercise.notes}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {editableExercises.filter(ex => ex.sets.filter(s => s.done).length > 0).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No completed exercises to save
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center gap-3 border-t bg-card px-6 py-4">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-xl border bg-background px-4 py-3 font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || editableExercises.filter(ex => ex.sets.filter(s => s.done).length > 0).length === 0}
            className="flex-1 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Saving..." : "Save Workout"}
          </button>
        </div>
      </div>
    </div>
  )
}