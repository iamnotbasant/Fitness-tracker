"use client"

import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react"
import { MoreVertical, Clock, Weight, X, ChevronDown, Play, Pause, Zap, Calculator, Flame } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import soundManager from "@/lib/sounds"
import type { SessionExercise } from "@/lib/types"
import PlateCalculatorDialog from "@/components/workout/plate-calculator-dialog"

type Props = {
  item: SessionExercise
  idx: number
  previousReps?: number | number[]
  onChange: (updater: (e: SessionExercise) => SessionExercise) => void
  onRemove: () => void
  onReplace?: () => void
  exerciseType?: "standard" | "timer" | "weighted" | "bodyweight" | "cardio" | "mobility"
  exerciseImageUrl?: string
  repGoal?: number
  onStartRest?: (exerciseName: string, durationSec: number) => void
}

function LiveExerciseCard({ 
  item, 
  idx, 
  previousReps, 
  onChange, 
  onRemove, 
  onReplace, 
  exerciseType = "standard", 
  exerciseImageUrl,
  repGoal,
  onStartRest,
}: Props) {
  const [restLeft, setRestLeft] = useState<number>(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notesExpanded, setNotesExpanded] = useState(false)
  
  // Celebration animation state
  const [celebrating, setCelebrating] = useState(false)
  
  // Stopwatch state for time-based exercises
  const [stopwatchRunning, setStopwatchRunning] = useState<number | null>(null)
  const [stopwatchStart, setStopwatchStart] = useState<number | null>(null)
  const [displayTime, setDisplayTime] = useState<Record<number, number>>({})
  const [pausedTime, setPausedTime] = useState<Record<number, number>>({})
  
  // Plate calculator dialog state
  const [plateCalcOpen, setPlateCalcOpen] = useState(false)
  const [plateCalcInitialWeight, setPlateCalcInitialWeight] = useState<number>(60)

  // Calculate estimated 1RM using Epley Formula: 1RM = Weight * (1 + Reps / 30)
  const top1RM = useMemo(() => {
    let max = 0
    item.sets.forEach((s) => {
      if (s.weight && s.weight > 0 && s.reps && s.reps > 0) {
        const est = s.reps === 1 ? s.weight : s.weight * (1 + s.reps / 30)
        if (est > max) max = est
      }
    })
    return max > 0 ? Math.round(max * 10) / 10 : null
  }, [item.sets])
  
  // Track if we're currently editing to prevent overwriting user input
  const isEditingRef = useRef(false)
  const editTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync from parent only when not actively editing
  useEffect(() => {
    if (!isEditingRef.current) {
      // Parent state is source of truth when not editing
    }
  }, [item.sets])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (editTimeoutRef.current) {
        clearTimeout(editTimeoutRef.current)
      }
    }
  }, [])

  // Update display time every second — accurate enough, avoids spamming onChange
  useEffect(() => {
    if (stopwatchRunning === null || stopwatchStart === null) return
    const id = setInterval(() => {
      const currentElapsed = Math.floor((Date.now() - stopwatchStart) / 1000)
      // Update display time for visual rendering only
      setDisplayTime(prev => ({ ...prev, [stopwatchRunning]: currentElapsed }))
    }, 1000)
    return () => clearInterval(id)
  }, [stopwatchRunning, stopwatchStart])

  // Rest timer countdown with sound effects
  useEffect(() => {
    if (!item.restEnabled || !item.restSec || restLeft <= 0) return
    const id = setInterval(() => setRestLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [item.restEnabled, item.restSec, restLeft])

  useEffect(() => {
    // Countdown sounds
    if (restLeft === 3) {
      soundManager.play('countdown_3', 0.4)
    } else if (restLeft === 2) {
      soundManager.play('countdown_2', 0.5)
    } else if (restLeft === 1) {
      soundManager.play('countdown_1', 0.6)
    } else if (restLeft === 0 && item.restEnabled && item.restSec && item.restSec > 0) {
      soundManager.play('countdown_go', 0.7)
    }
  }, [restLeft, item.restEnabled, item.restSec])

  const startRest = () => {
    if (!item.restEnabled || !item.restSec) return
    setRestLeft(item.restSec)
    soundManager.play('tick', 0.3)
    onStartRest?.(item.name, item.restSec)
  }

  const addSet = () => {
    soundManager.play('add', 0.5)
    onChange((e) => ({
      ...e,
      sets: [...e.sets, isTimerExercise ? { timeSeconds: 0, done: false } : { reps: undefined, done: false }]
    }))
  }

  const removeSet = (i: number) => {
    soundManager.play('remove', 0.4)
    
    if (stopwatchRunning === i) {
      setStopwatchRunning(null)
      setStopwatchStart(null)
    }
    
    setPausedTime(prev => {
      const updated = { ...prev }
      delete updated[i]
      return updated
    })
    
    onChange((e) => ({
      ...e,
      sets: e.sets.filter((_, idx) => idx !== i)
    }))
  }

  const toggleDone = (i: number) => {
    onChange((e) => {
      const next = [...e.sets]
      const wasDone = next[i].done
      next[i] = { ...next[i], done: !wasDone }
      
      if (!wasDone) {
        // Check if this is the last set
        const completedSets = next.filter(s => s.done).length
        const totalSets = next.length
        
        if (completedSets === totalSets) {
          // All sets completed - exercise complete!
          soundManager.play('exercise_complete', 0.8)
          setCelebrating(true)
          setTimeout(() => setCelebrating(false), 1000)
        } else if (completedSets === Math.floor(totalSets / 2) && totalSets > 2) {
          // Halfway milestone
          soundManager.play('halfway', 0.6)
        } else {
          // Regular set completion
          soundManager.play('rep_complete', 0.6)
        }
        startRest()
      } else {
        soundManager.play('click', 0.3)
      }
      
      return { ...e, sets: next }
    })
  }

  const toggleStopwatch = (i: number) => {
    if (stopwatchRunning === i) {
      // PAUSE
      soundManager.play('pause', 0.5)
      const currentElapsed = Math.floor((Date.now() - stopwatchStart!) / 1000)
      
      setStopwatchRunning(null)
      setStopwatchStart(null)
      
      setPausedTime(prev => ({ ...prev, [i]: currentElapsed }))
      
      onChange((e) => {
        const next = [...e.sets]
        next[i] = { ...next[i], timeSeconds: currentElapsed }
        return { ...e, sets: next }
      })
    } else {
      // START
      soundManager.play('set_start', 0.7)
      setStopwatchRunning(i)
      setStopwatchStart(Date.now())
      setDisplayTime(prev => ({ ...prev, [i]: 0 }))
      
      setPausedTime(prev => {
        const updated = { ...prev }
        delete updated[i]
        return updated
      })
      
      onChange((e) => {
        const next = [...e.sets]
        next[i] = { ...next[i], timeSeconds: 0 }
        return { ...e, sets: next }
      })
    }
  }

  const updateReps = (i: number, value: string) => {
    isEditingRef.current = true
    
    if (editTimeoutRef.current) {
      clearTimeout(editTimeoutRef.current)
    }
    
    onChange((e) => {
      const next = [...e.sets]
      if (value === "") {
        next[i] = { ...next[i], reps: undefined }
      } else {
        const numValue = Number(value)
        if (!isNaN(numValue) && numValue >= 0) {
          next[i] = { ...next[i], reps: numValue }
        } else {
          return e
        }
      }
      return { ...e, sets: next }
    })
    
    editTimeoutRef.current = setTimeout(() => {
      isEditingRef.current = false
    }, 500)
  }

  const updateTimeSeconds = (i: number, value: string) => {
    isEditingRef.current = true
    
    if (editTimeoutRef.current) {
      clearTimeout(editTimeoutRef.current)
    }
    
    if (stopwatchRunning === i) {
      setStopwatchRunning(null)
      setStopwatchStart(null)
    }
    
    onChange((e) => {
      const next = [...e.sets]
      if (value === "") {
        next[i] = { ...next[i], timeSeconds: undefined }
        setPausedTime(prev => {
          const updated = { ...prev }
          delete updated[i]
          return updated
        })
      } else {
        const numValue = Number(value)
        if (!isNaN(numValue) && numValue >= 0) {
          next[i] = { ...next[i], timeSeconds: numValue }
          setPausedTime(prev => ({ ...prev, [i]: numValue }))
        } else {
          return e
        }
      }
      return { ...e, sets: next }
    })
    
    editTimeoutRef.current = setTimeout(() => {
      isEditingRef.current = false
    }, 500)
  }

  const updateWeight = (i: number, value: string) => {
    isEditingRef.current = true
    
    if (editTimeoutRef.current) {
      clearTimeout(editTimeoutRef.current)
    }
    
    onChange((e) => {
      const next = [...e.sets]
      if (value === "") {
        next[i] = { ...next[i], weight: undefined }
      } else {
        const numValue = Number(value)
        if (!isNaN(numValue) && numValue >= 0) {
          next[i] = { ...next[i], weight: numValue }
        } else {
          return e
        }
      }
      return { ...e, sets: next }
    })
    
    editTimeoutRef.current = setTimeout(() => {
      isEditingRef.current = false
    }, 500)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`
  }

  const getPreviousValue = (setIndex: number) => {
    if (Array.isArray(previousReps)) {
      return previousReps[setIndex]
    }
    return previousReps
  }

  const typeStr = String(exerciseType || "").toLowerCase()
  const isTimerExercise = typeStr.includes("timer")
  const isWeightedExercise = typeStr.includes("weighted")

  // Calculate completion percentage for progress indicator
  const completionPercentage = (item.sets.filter(s => s.done).length / item.sets.length) * 100

  return (
    <motion.div 
      layout
      className="rounded-2xl border bg-card p-4 md:p-5 relative overflow-hidden"
      animate={celebrating ? {
        scale: [1, 1.02, 1],
        boxShadow: [
          "0 0 0 0 rgba(34, 197, 94, 0)",
          "0 0 20px 10px rgba(34, 197, 94, 0.3)",
          "0 0 0 0 rgba(34, 197, 94, 0)"
        ]
      } : {}}
      transition={{ duration: 0.6 }}
    >
      {/* Celebration confetti effect */}
      <AnimatePresence>
        {celebrating && (
          <>
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: "50%", 
                  y: "50%", 
                  scale: 0,
                  rotate: 0
                }}
                animate={{ 
                  x: `${50 + (Math.random() - 0.5) * 200}%`,
                  y: `${50 + (Math.random() - 0.5) * 200}%`,
                  scale: [0, 1, 0],
                  rotate: Math.random() * 360
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute w-2 h-2 rounded-full bg-primary pointer-events-none"
                style={{
                  left: "50%",
                  top: "50%",
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      {completionPercentage > 0 && (
        <motion.div 
          className="absolute top-0 left-0 h-1 bg-gradient-to-r from-green-500 to-green-400"
          initial={{ width: 0 }}
          animate={{ width: `${completionPercentage}%` }}
          transition={{ type: "spring", damping: 25 }}
        />
      )}

      <div className="flex items-start gap-3">
        {/* Exercise image with pulse animation when timer running */}
        <motion.div 
          whileHover={{ scale: 1.05, rotate: 5 }}
          animate={stopwatchRunning !== null ? {
            scale: [1, 1.05, 1],
          } : {}}
          transition={{ 
            scale: { repeat: Infinity, duration: 1.5 },
            type: "spring", 
            stiffness: 400 
          }}
          className="h-12 w-12 flex-shrink-0 rounded-full bg-muted flex items-center justify-center text-muted-foreground overflow-hidden"
        >
          {exerciseImageUrl ? (
            <img 
              src={exerciseImageUrl} 
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : isTimerExercise ? (
            <Clock className="h-6 w-6" />
          ) : isWeightedExercise ? (
            <Weight className="h-6 w-6" />
          ) : (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 8l-4 4 4 4M17 8l4 4-4 4M14 4l-4 16" />
            </svg>
          )}
        </motion.div>
        
        <div className="flex-1">
          <div className="text-lg md:text-xl font-semibold text-primary flex items-center gap-2">
            {item.name}
            {completionPercentage === 100 && (
              <motion.span
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 10 }}
              >
                ✓
              </motion.span>
            )}
          </div>
          {(exerciseType || repGoal) && (
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              {exerciseType === "timer" && "⏱️ Time-based"}
              {exerciseType === "weighted" && "🏋️ Weighted"}
              {exerciseType === "standard" && "Standard"}
              {exerciseType === "bodyweight" && "Bodyweight"}
              {exerciseType === "cardio" && "Cardio"}
              {exerciseType === "mobility" && "Mobility"}
              {exerciseType && repGoal && <span>•</span>}
              {repGoal && <span>Goal: {repGoal} reps</span>}
              {stopwatchRunning !== null && (
                <>
                  <span>•</span>
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="text-orange-500 flex items-center gap-1"
                  >
                    <Zap className="h-3 w-3" /> Active
                  </motion.span>
                </>
              )}
              {top1RM && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                    <Flame className="h-3 w-3" />
                    1RM: {top1RM}kg
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons: Plate Calculator & Options Menu */}
        <div className="flex items-center gap-1">
          {isWeightedExercise && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                soundManager.play('click', 0.2)
                const highestWeight = Math.max(...item.sets.map(s => s.weight || 0).filter(Boolean), 60)
                setPlateCalcInitialWeight(highestWeight || 60)
                setPlateCalcOpen(true)
              }}
              className="rounded-lg p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Barbell Plate Calculator"
              aria-label="Barbell Plate Calculator"
            >
              <Calculator className="h-4 w-4" />
            </motion.button>
          )}

          {/* Three-dot menu */}
          <div className="relative">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              soundManager.play('click', 0.3)
              setMenuOpen(!menuOpen)
            }}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
            aria-label="Exercise options"
          >
            <MoreVertical className="h-5 w-5" />
          </motion.button>
          <AnimatePresence>
            {menuOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-10" 
                  onClick={() => setMenuOpen(false)} 
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ type: "spring", damping: 25 }}
                  className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border bg-popover shadow-lg overflow-hidden"
                >
                  {onReplace && (
                    <motion.button
                      whileHover={{ backgroundColor: "var(--color-muted)", x: 4 }}
                      onClick={() => {
                        soundManager.play('click', 0.3)
                        onReplace()
                        setMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm rounded-t-xl transition-colors"
                    >
                      Replace
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ backgroundColor: "var(--color-muted)", x: 4 }}
                    onClick={() => {
                      onRemove()
                      setMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-destructive rounded-b-xl transition-colors"
                  >
                    Remove
                  </motion.button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>

      {/* Collapsible Notes Section */}
      <div className="mt-3">
        <motion.button
          whileHover={{ x: 4 }}
          onClick={() => {
            soundManager.play('click', 0.2)
            setNotesExpanded(!notesExpanded)
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <motion.div
            animate={{ rotate: notesExpanded ? 180 : 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
          <span>{notesExpanded ? "Hide Notes" : "Add Notes"}</span>
          {!notesExpanded && item.notes && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-xs text-primary"
            >
              • Has notes
            </motion.span>
          )}
        </motion.button>
        <AnimatePresence>
          {notesExpanded && (
            <motion.textarea
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              value={item.notes || ""}
              onChange={(e) => onChange((x) => ({ ...x, notes: e.target.value }))}
              placeholder="Add notes here..."
              className="mt-2 w-full resize-none rounded-xl border bg-background p-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
              rows={2}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              soundManager.play('click', 0.3)
              onChange((x) => ({ ...x, restEnabled: !x.restEnabled }))
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              item.restEnabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`inline-block h-4 w-4 transform rounded-full bg-background ${
                item.restEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </motion.button>
          <label className="text-sm text-muted-foreground">Rest Timer: {item.restEnabled ? `${item.restSec}s` : "OFF"}</label>
        </div>
      </div>

      <AnimatePresence>
        {item.restEnabled && restLeft > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              scale: restLeft <= 3 ? [1, 1.1, 1] : 1
            }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
              scale: { repeat: restLeft <= 3 ? Infinity : 0, duration: 0.5 }
            }}
            className={`mt-2 text-sm font-medium rounded-lg px-3 py-2 inline-block ${
              restLeft <= 3 
                ? "bg-orange-500/20 text-orange-600 dark:text-orange-400" 
                : "bg-primary/10 text-primary"
            }`}
          >
            Rest: {restLeft}s remaining {restLeft <= 3 && "⏰"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sets list — responsive flex rows instead of fixed-width table */}
      <div className="mt-4">
        {/* Column headers */}
        <div className={`grid text-xs font-medium uppercase text-muted-foreground pb-2 border-b gap-2 ${
          isWeightedExercise ? "grid-cols-[2rem_1fr_1fr_1fr_2.5rem_2rem]" :
          isTimerExercise    ? "grid-cols-[2rem_1fr_1fr_2.5rem_2rem]" :
                               "grid-cols-[2rem_1fr_1fr_2.5rem_2rem]"
        }`}>
          <span>SET</span>
          <span>PREV</span>
          <span>{isTimerExercise ? "TIME" : "REPS"}</span>
          {isWeightedExercise && <span>KG</span>}
          <span></span>
          <span></span>
        </div>

        <AnimatePresence mode="popLayout">
          {item.sets.map((s, i) => {
            const prevVal = getPreviousValue(i)
            const isThisSetRunning = stopwatchRunning === i

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className={`group grid items-center gap-2 py-2.5 border-b border-border/50 text-sm ${
                  isWeightedExercise ? "grid-cols-[2rem_1fr_1fr_1fr_2.5rem_2rem]" :
                  isTimerExercise    ? "grid-cols-[2rem_1fr_1fr_2.5rem_2rem]" :
                                       "grid-cols-[2rem_1fr_1fr_2.5rem_2rem]"
                }`}
              >
                {/* Set number with PR indicator */}
                <div className="flex flex-col items-center justify-center">
                  <span className="font-medium text-center leading-none">{i + 1}</span>
                  {s.done && s.weight && top1RM && (s.weight >= (top1RM * 0.95)) ? (
                    <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-500/15 px-1 py-0.5 rounded leading-tight mt-0.5">
                      PR
                    </span>
                  ) : null}
                </div>

                {/* Previous */}
                <span className="text-muted-foreground text-xs truncate">
                  {isTimerExercise
                    ? (prevVal ? formatTime(Number(prevVal)) : "-")
                    : (prevVal !== undefined ? `${prevVal}` : "-")}
                </span>

                {/* Reps or Timer input */}
                {isTimerExercise ? (
                  <div className="flex items-center gap-1.5">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      animate={isThisSetRunning ? {
                        boxShadow: [
                          "0 0 0 0 rgba(249,115,22,0.4)",
                          "0 0 0 6px rgba(249,115,22,0)",
                        ]
                      } : {}}
                      transition={{ repeat: isThisSetRunning ? Infinity : 0, duration: 1.5 }}
                      onClick={() => toggleStopwatch(i)}
                      className={`rounded-lg p-1.5 flex-shrink-0 ${
                        isThisSetRunning
                          ? "bg-orange-600 text-white"
                          : "bg-green-600 text-white"
                      }`}
                      aria-label={isThisSetRunning ? "Pause timer" : "Start timer"}
                    >
                      {isThisSetRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </motion.button>
                    {isThisSetRunning ? (
                      <div className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-primary/10 border border-primary font-semibold text-primary text-center text-xs">
                        {formatTime(displayTime[i] || 0)}
                      </div>
                    ) : (
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={pausedTime[i] ?? s.timeSeconds ?? ""}
                        onChange={(e) => updateTimeSeconds(i, e.target.value)}
                        className="flex-1 min-w-0 w-full rounded-lg border bg-background px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary text-sm"
                        placeholder="sec"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={s.reps ?? ""}
                    onChange={(e) => updateReps(i, e.target.value)}
                    className="w-full rounded-lg border bg-background px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder={prevVal !== undefined && Number(prevVal) > 0 ? String(prevVal) : "reps"}
                  />
                )}

                {/* Weight (weighted only) */}
                {isWeightedExercise && (
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.5"
                    value={s.weight ?? ""}
                    onChange={(e) => updateWeight(i, e.target.value)}
                    className="w-full rounded-lg border bg-background px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="kg"
                  />
                )}

                {/* Done button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleDone(i)}
                  className={`rounded-lg px-2 py-2 text-sm font-semibold transition-all ${
                    s.done
                      ? (repGoal && !isTimerExercise && s.reps && s.reps > repGoal
                          ? "bg-red-600 text-white"
                          : "bg-green-600 text-white")
                      : "bg-muted text-muted-foreground"
                  }`}
                  aria-label={s.done ? "Set completed" : "Mark set as done"}
                >
                  ✓
                </motion.button>

                {/* Remove set — always visible on mobile, hover on desktop */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => removeSet(i)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-40 group-hover:opacity-100"
                  aria-label="Remove set"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )
          })}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={addSet}
          className="mt-4 w-full rounded-xl bg-primary/10 py-3 text-sm font-medium text-primary hover:bg-primary/20 transition-all"
        >
          + Add Set
        </motion.button>
      </div>

      <PlateCalculatorDialog
        open={plateCalcOpen}
        onClose={() => setPlateCalcOpen(false)}
        initialWeight={plateCalcInitialWeight}
      />
    </motion.div>
  )
}

export default memo(LiveExerciseCard)