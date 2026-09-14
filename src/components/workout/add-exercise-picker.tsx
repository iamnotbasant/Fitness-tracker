"use client"

import { useState } from "react"
import { useExercises } from "@/hooks/use-local-data"
import { Search, Plus, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface AddExercisePickerProps {
  onAdd: (exerciseId: string) => void
  compact?: boolean
}

export default function AddExercisePicker({ onAdd, compact }: AddExercisePickerProps) {
  const { exercises } = useExercises()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAdd = (exerciseId: string) => {
    onAdd(exerciseId)
    setIsOpen(false)
    setSearchQuery("")
  }

  if (compact) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="w-full rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:bg-muted/50 hover:text-foreground transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Exercise
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-card border rounded-2xl shadow-lg z-50 max-h-[80vh] flex flex-col"
              >
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">Add Exercise</h3>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg p-1.5 hover:bg-muted"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search exercises..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2">
                  {filteredExercises.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No exercises found
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredExercises.map((ex) => (
                        <button
                          key={ex.id}
                          onClick={() => handleAdd(ex.id)}
                          className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
                        >
                          <div className="font-medium text-sm">{ex.name}</div>
                          {(ex.split || ex.type) && (
                            <div className="flex gap-2 mt-1">
                              {ex.split && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary capitalize">
                                  {ex.split}
                                </span>
                              )}
                              {ex.type && ex.type !== "standard" && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                                  {ex.type}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    )
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-6 py-4 text-base font-medium text-primary hover:border-primary/50 hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-5 w-5" />
        Add Exercise
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-card border rounded-2xl shadow-lg z-50 max-h-[80vh] flex flex-col"
            >
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">Add Exercise</h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-1.5 hover:bg-muted"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search exercises..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {filteredExercises.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No exercises found
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredExercises.map((ex) => (
                      <button
                        key={ex.id}
                        onClick={() => handleAdd(ex.id)}
                        className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
                      >
                        <div className="font-medium text-sm">{ex.name}</div>
                        {(ex.split || ex.type) && (
                          <div className="flex gap-2 mt-1">
                            {ex.split && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary capitalize">
                                {ex.split}
                              </span>
                            )}
                            {ex.type && ex.type !== "standard" && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                                {ex.type}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}