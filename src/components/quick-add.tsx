"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { WorkoutForm } from "./workout-form"
import { useWorkouts } from "@/hooks/use-local-data"

export function QuickAdd() {
  const [open, setOpen] = useState(false)
  const { upsert } = useWorkouts()

  return (
    <>
      <button
        aria-label="Quick Add Workout"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 rounded-full bg-primary px-5 py-4 text-primary-foreground shadow-lg"
      >
        +
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-modal
            role="dialog"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="w-full max-w-md rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-semibold">Quick Add Workout</h2>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
                >
                  Close
                </button>
              </div>
              <WorkoutForm
                onSave={async (data) => {
                  await upsert({
                    id: data.id ?? crypto.randomUUID(),
                    ...data,
                    exerciseName: data.exerciseName,
                    exerciseId: data.exerciseId,
                    date: data.date,
                    sets: data.sets,
                    reps: data.reps,
                  })
                }}
                onClose={() => setOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export { QuickAdd as QuickAddComponent }
