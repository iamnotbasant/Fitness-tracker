"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Workout } from "@/lib/types"
import { useExercises } from "@/hooks/use-local-data"
import { cn } from "@/lib/utils"

type Props = {
  initial?: Partial<Workout>
  onSave: (w: Omit<Workout, "id" | "volume"> & { id?: string }) => Promise<void> | void
  onClose?: () => void
}

export function WorkoutForm({ initial, onSave, onClose }: Props) {
  const { exercises, add } = useExercises()
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState(initial?.time ?? "")
  const [exerciseId, setExerciseId] = useState(initial?.exerciseId ?? exercises[0]?.id ?? "")
  const [exerciseName, setExerciseName] = useState(initial?.exerciseName ?? exercises[0]?.name ?? "")
  const [custom, setCustom] = useState("")
  const [sets, setSets] = useState(initial?.sets ?? 3)
  const [reps, setReps] = useState(initial?.reps ?? 10)
  const [rest, setRest] = useState(initial?.rest ?? 60)
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [saved, setSaved] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    let exId = exerciseId
    let exName = exerciseName
    if (custom.trim()) {
      const newEx = await add(custom.trim())
      exId = newEx.id
      exName = newEx.name
    }
    await onSave({
      id: initial?.id,
      date,
      time: time || undefined,
      exerciseId: exId,
      exerciseName: exName,
      sets: Number(sets),
      reps: Number(reps),
      rest: Number(rest) || undefined,
      notes: notes || undefined,
    })
    // haptic-like animation
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose?.()
    }, 800)
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-1">
        <label className="text-sm text-muted-foreground">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border bg-card px-3 py-2"
          required
        />
      </div>
      <div className="grid gap-1">
        <label className="text-sm text-muted-foreground">Time</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-lg border bg-card px-3 py-2"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-muted-foreground">Exercise</label>
        <select
          value={exerciseId}
          onChange={(e) => {
            const val = e.target.value
            setExerciseId(val)
            const ex = exercises.find((x) => x.id === val)
            setExerciseName(ex?.name ?? "")
            setCustom("")
          }}
          className="rounded-lg border bg-card px-3 py-2"
        >
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
        <div className="mt-2 grid gap-1">
          <label className="text-sm text-muted-foreground">Add Custom Exercise</label>
          <input
            placeholder="e.g., Handstand Hold"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="rounded-lg border bg-card px-3 py-2"
          />
          <p className="text-xs text-muted-foreground">Custom exercises are saved for future use.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-muted-foreground">Sets</label>
          <input
            type="number"
            min={1}
            value={sets}
            onChange={(e) => setSets(Number(e.target.value))}
            className="w-full rounded-lg border bg-card px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Reps</label>
          <input
            type="number"
            min={1}
            value={reps}
            onChange={(e) => setReps(Number(e.target.value))}
            className="w-full rounded-lg border bg-card px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Rest (s)</label>
          <input
            type="number"
            min={0}
            value={rest}
            onChange={(e) => setRest(Number(e.target.value))}
            className="w-full rounded-lg border bg-card px-3 py-2"
          />
        </div>
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-muted-foreground">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[80px] rounded-lg border bg-card px-3 py-2"
        />
      </div>

      <button
        type="submit"
        className={cn(
          "mt-1 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-transform",
          saved && "scale-[0.98]",
        )}
      >
        Save Workout
      </button>

      <AnimatePresence>
        {saved && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 inline-flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
          >
            <span>Saved</span>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}
