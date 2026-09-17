"use client"

import { useMemo, useState } from "react"
import { Trash2, Clock, Calendar, Edit } from "lucide-react"
import WorkoutEditDialog from "@/components/workout/workout-edit-dialog"

export type WorkoutExercise = {
  id: string
  exerciseName: string
  sets: number
  reps: number
  timeSeconds?: number
  weight?: number
  durationSeconds?: number
  setType?: string
  setDetails?: Array<{
    reps: number
    timeSeconds?: number
    weight?: number
    setType?: string
  }>
  allIds?: string[]
}

export type TodayWorkoutData = {
  date: string
  time?: string
  exercises: WorkoutExercise[]
}

export function TodayWorkoutCard({
  workout,
  onDelete,
  onEdit,
}: {
  workout: TodayWorkoutData
  onDelete?: (ids: string[]) => void
  onEdit?: (workout: TodayWorkoutData) => void
}) {
  const [showEditDialog, setShowEditDialog] = useState(false)

  const dateObj = useMemo(
    () => new Date(workout.date + "T" + (workout.time ?? "00:00")),
    [workout.date, workout.time]
  )

  const dateLabel = useMemo(
    () => dateObj.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }),
    [dateObj]
  )

  const timeLabel = useMemo(
    () => dateObj.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    [dateObj]
  )

  const durationMin = useMemo(() => {
    // Use actual duration if available (from any exercise in the workout)
    const actualDuration = workout.exercises.find(ex => ex.durationSeconds)?.durationSeconds
    if (actualDuration) {
      return Math.max(1, Math.round(actualDuration / 60))
    }
    
    // Fallback to estimation if no actual duration stored
    const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0)
    const totalSec = Math.max(totalSets - 1, 0) * 60 + totalSets * 10
    return Math.max(1, Math.round(totalSec / 60))
  }, [workout.exercises])

  const handleDelete = () => {
    if (onDelete) {
      // Collect all workout IDs (including individual sets)
      const ids = workout.exercises.flatMap((ex) => ex.allIds || [ex.id])
      onDelete(ids)
    }
  }

  const handleEdit = (editedWorkout: TodayWorkoutData) => {
    setShowEditDialog(false)
    if (onEdit) {
      onEdit(editedWorkout)
    }
  }

  const formatTime = (sec: number) => {
    if (sec >= 60) {
      const mins = Math.floor(sec / 60)
      const rem = sec % 60
      return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`
    }
    return `${sec}s`
  }

  const renderSetBadge = (setType?: string, setIdx: number = 0) => {
    if (setType === "warmup") {
      return <span className="text-[10px] font-black text-amber-500 bg-amber-500/15 px-1 py-0.5 rounded">W</span>
    }
    if (setType === "dropset") {
      return <span className="text-[10px] font-black text-purple-400 bg-purple-500/15 px-1 py-0.5 rounded">D</span>
    }
    if (setType === "failure") {
      return <span className="text-[10px] font-black text-rose-500 bg-rose-500/15 px-1 py-0.5 rounded">F</span>
    }
    return setIdx + 1
  }

  return (
    <>
      <article className="group rounded-xl border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md">
        {/* Header */}
        <div className="bg-muted/30 px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{dateLabel}</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{workout.time ? timeLabel : "00:00"}</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{durationMin} min</span>
            </div>
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  onClick={() => setShowEditDialog(true)}
                  className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:text-primary hover:bg-primary/10 group-hover:opacity-100"
                  aria-label="Edit workout"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:text-destructive hover:bg-destructive/10 group-hover:opacity-100"
                  aria-label="Delete workout"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Exercise List */}
        <div className="p-4">
          <div className="space-y-5">
            {workout.exercises.map((exercise, idx) => (
              <div key={exercise.id}>
                <div className="mb-2.5">
                  <h3 className="font-semibold text-base">{exercise.exerciseName}</h3>
                </div>
                <div className="space-y-1.5">
                  {exercise.setDetails && exercise.setDetails.length > 0 ? (
                    // Display individual set values
                    exercise.setDetails.map((setDetail, setIdx) => {
                      const isTimer = Boolean(setDetail.timeSeconds && setDetail.timeSeconds > 0) || exercise.exerciseName.toLowerCase().includes("plank")
                      const timeVal = setDetail.timeSeconds || (isTimer && setDetail.reps ? setDetail.reps : undefined)

                      return (
                        <div 
                          key={setIdx}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="inline-flex items-center justify-center min-w-6 h-6 px-1 rounded-md bg-muted text-xs font-medium">
                            {renderSetBadge(setDetail.setType, setIdx)}
                          </span>
                          <span className="text-muted-foreground">×</span>
                          {timeVal ? (
                            <span className="font-medium">{formatTime(timeVal)}</span>
                          ) : (
                            <span className="font-medium">{setDetail.reps ?? 0} reps</span>
                          )}
                          {setDetail.weight ? (
                            <span className="text-muted-foreground ml-1">@ {setDetail.weight} kg</span>
                          ) : null}
                        </div>
                      )
                    })
                  ) : (
                    // Fallback to old format if setDetails not available
                    Array.from({ length: exercise.sets }).map((_, setIdx) => {
                      const isTimer = Boolean(exercise.timeSeconds && exercise.timeSeconds > 0) || exercise.exerciseName.toLowerCase().includes("plank")
                      const timeVal = exercise.timeSeconds || (isTimer && exercise.reps ? exercise.reps : undefined)

                      return (
                        <div 
                          key={setIdx}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="inline-flex items-center justify-center min-w-6 h-6 px-1 rounded-md bg-muted text-xs font-medium">
                            {renderSetBadge(exercise.setType, setIdx)}
                          </span>
                          <span className="text-muted-foreground">×</span>
                          {timeVal ? (
                            <span className="font-medium">{formatTime(timeVal)}</span>
                          ) : (
                            <span className="font-medium">{exercise.reps ?? 0} reps</span>
                          )}
                          {exercise.weight ? (
                            <span className="text-muted-foreground ml-1">@ {exercise.weight} kg</span>
                          ) : null}
                        </div>
                      )
                    })
                  )}
                </div>
                {idx < workout.exercises.length - 1 && (
                  <div className="mt-4 border-b" />
                )}
              </div>
            ))}
          </div>
        </div>
      </article>

      <WorkoutEditDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSave={handleEdit}
        workout={workout}
      />
    </>
  )
}