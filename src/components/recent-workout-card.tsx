"use client"

import { useMemo } from "react"
import { Trash2 } from "lucide-react"

export type RecentWorkout = {
  id: string
  date: string // YYYY-MM-DD
  time?: string
  exerciseName: string
  sets: number
  reps: number
  rest?: number
  notes?: string
  volume: number
}

export function RecentWorkoutCard({
  workout,
  isPR = false, // kept for compatibility; no longer rendered
  onDelete,
}: {
  workout: RecentWorkout
  isPR?: boolean
  onDelete?: (id: string) => void
}) {
  const durationMin = useMemo(() => {
    const totalSec = Math.max(workout.sets - 1, 0) * (workout.rest ?? 60) + workout.sets * 10
    return Math.max(1, Math.round(totalSec / 60))
  }, [workout.sets, workout.rest])

  const dateObj = useMemo(() => new Date(workout.date + "T" + (workout.time ?? "00:00")), [workout.date, workout.time])
  const dateLabel = useMemo(
    () => dateObj.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }),
    [dateObj],
  )
  const timeLabel = useMemo(
    () => dateObj.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    [dateObj],
  )

  return (
    <article className="rounded-2xl border bg-card shadow-sm">
      {/* Header: Date title + small time + delete button */}
      <div className="px-5 py-4 flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold">{dateLabel}</div>
          {workout.time ? <div className="text-xs text-muted-foreground">{timeLabel}</div> : null}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(workout.id)}
            className="rounded-lg p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label="Delete workout"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Metrics (no icons) */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-3 border-b pb-4 text-xs text-muted-foreground md:text-sm">
          <Metric label="Duration" value={`${durationMin} min`} />
          <Metric label="Volume" value={`${workout.volume} reps`} />
        </div>
      </div>

      {/* Exercise list (text-only) */}
      <div className="px-5 pb-4">
        <div className="mb-2 text-sm font-medium text-muted-foreground">Workout</div>
        <ul className="grid gap-2">
          <li className="text-sm md:text-base">
            <span className="font-medium">{`${workout.sets} sets ${workout.exerciseName}`}</span>
            <span className="ml-2 text-muted-foreground">× {workout.reps}</span>
          </li>
          {workout.notes && <li className="text-sm text-muted-foreground">{workout.notes}</li>}
        </ul>
      </div>
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  )
}