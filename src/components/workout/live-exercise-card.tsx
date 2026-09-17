"use client"

import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react"
import { 
  MoreVertical, 
  Clock, 
  Weight, 
  ChevronDown, 
  Play, 
  Pause, 
  Calculator, 
  Flame, 
  Trash2, 
  Copy, 
  Check, 
  Timer as TimerIcon,
  RotateCcw
} from "lucide-react"
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
  
  // Time-based exercise states: Stopwatch (Count Up) & Goal Timer (Countdown)
  const typeStr = String(exerciseType || "").toLowerCase()
  const isTimerExercise = typeStr.includes("timer")
  const isWeightedExercise = typeStr.includes("weighted")

  const [timerMode, setTimerMode] = useState<"stopwatch" | "countdown">("stopwatch")
  const [stopwatchRunning, setStopwatchRunning] = useState<number | null>(null)
  const [stopwatchStart, setStopwatchStart] = useState<number | null>(null)
  const [displayTime, setDisplayTime] = useState<Record<number, number>>({})
  const [pausedTime, setPausedTime] = useState<Record<number, number>>({})
  const [initialElapsedMap, setInitialElapsedMap] = useState<Record<number, number>>({})
  const [targetSecondsMap, setTargetSecondsMap] = useState<Record<number, number>>({})

  // Desktop right-click & Mobile long-press Context Menu for Set Rows
  const [contextMenuSetIndex, setContextMenuSetIndex] = useState<number | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)
  
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (editTimeoutRef.current) clearTimeout(editTimeoutRef.current)
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }, [])

  // Time-based interval for both Stopwatch and Goal Countdown
  useEffect(() => {
    if (stopwatchRunning === null || stopwatchStart === null) return
    const runningIdx = stopwatchRunning

    const id = setInterval(() => {
      const elapsedSinceStart = Math.floor((Date.now() - stopwatchStart) / 1000)
      const baseElapsed = initialElapsedMap[runningIdx] || 0
      const totalElapsed = baseElapsed + elapsedSinceStart

      if (timerMode === "countdown") {
        const target = targetSecondsMap[runningIdx] || repGoal || 45
        const remaining = Math.max(0, target - totalElapsed)
        setDisplayTime(prev => ({ ...prev, [runningIdx]: remaining }))

        if (remaining <= 0) {
          // Completed countdown goal!
          soundManager.play('countdown_go', 0.8)
          setStopwatchRunning(null)
          setStopwatchStart(null)
          setPausedTime(prev => ({ ...prev, [runningIdx]: target }))
          setInitialElapsedMap(prev => ({ ...prev, [runningIdx]: target }))
          
          onChange((e) => {
            const next = [...e.sets]
            next[runningIdx] = {
              ...next[runningIdx],
              timeSeconds: target,
              done: true
            }
            return { ...e, sets: next }
          })
          startRest()
        }
      } else {
        // Stopwatch count up mode
        setDisplayTime(prev => ({ ...prev, [runningIdx]: totalElapsed }))
      }
    }, 1000)

    return () => clearInterval(id)
  }, [stopwatchRunning, stopwatchStart, timerMode, initialElapsedMap, targetSecondsMap, repGoal])

  // Rest timer countdown with sound effects
  useEffect(() => {
    if (!item.restEnabled || !item.restSec || restLeft <= 0) return
    const id = setInterval(() => setRestLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [item.restEnabled, item.restSec, restLeft])

  useEffect(() => {
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
    if (!item.restEnabled) return
    const duration = item.restSec || 60
    setRestLeft(duration)
    soundManager.play('tick', 0.3)
    onStartRest?.(item.name, duration)
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
    setInitialElapsedMap(prev => {
      const updated = { ...prev }
      delete updated[i]
      return updated
    })
    setTargetSecondsMap(prev => {
      const updated = { ...prev }
      delete updated[i]
      return updated
    })
    
    onChange((e) => ({
      ...e,
      sets: e.sets.filter((_, idx) => idx !== i)
    }))
    setContextMenuSetIndex(null)
  }

  const duplicateSet = (i: number) => {
    soundManager.play('add', 0.5)
    onChange((e) => {
      const sets = [...e.sets]
      const source = sets[i]
      const duplicated = { ...source, done: false }
      sets.splice(i + 1, 0, duplicated)
      return { ...e, sets }
    })
    setContextMenuSetIndex(null)
  }

  const setSpecificSetType = (setIndex: number, type: "normal" | "warmup" | "dropset" | "failure") => {
    soundManager.play('click', 0.2)
    onChange((x) => {
      const sets = [...x.sets]
      sets[setIndex] = { ...sets[setIndex], setType: type }
      return { ...x, sets }
    })
    setContextMenuSetIndex(null)
  }

  const cycleSetType = (setIndex: number) => {
    soundManager.play('click', 0.2)
    const types: Array<"normal" | "warmup" | "dropset" | "failure"> = ["normal", "warmup", "dropset", "failure"]
    onChange((x) => {
      const sets = [...x.sets]
      const current = sets[setIndex]?.setType || "normal"
      const nextIdx = (types.indexOf(current) + 1) % types.length
      sets[setIndex] = { ...sets[setIndex], setType: types[nextIdx] }
      return { ...x, sets }
    })
  }

  const toggleDone = (i: number) => {
    onChange((e) => {
      const next = [...e.sets]
      const wasDone = next[i].done
      
      if (isTimerExercise) {
        next[i] = { 
          ...next[i], 
          reps: undefined,
          timeSeconds: next[i].timeSeconds || pausedTime[i] || targetSecondsMap[i] || 30,
          done: !wasDone 
        }
      } else {
        next[i] = { ...next[i], done: !wasDone }
      }
      
      if (!wasDone) {
        const completedSets = next.filter(s => s.done).length
        const totalSets = next.length
        
        if (completedSets === totalSets) {
          soundManager.play('exercise_complete', 0.8)
          setCelebrating(true)
          setTimeout(() => setCelebrating(false), 1000)
        } else if (completedSets === Math.floor(totalSets / 2) && totalSets > 2) {
          soundManager.play('halfway', 0.6)
        } else {
          soundManager.play('rep_complete', 0.6)
        }
        startRest()
      } else {
        soundManager.play('click', 0.3)
      }
      
      return { ...e, sets: next }
    })
  }

  // Dual Stopwatch & Goal Timer toggle and resume
  const toggleStopwatch = (i: number) => {
    if (stopwatchRunning === i) {
      // PAUSE / STOP
      soundManager.play('pause', 0.5)
      const elapsedSinceStart = Math.floor((Date.now() - stopwatchStart!) / 1000)
      const baseElapsed = initialElapsedMap[i] || 0
      const totalElapsed = baseElapsed + elapsedSinceStart

      setStopwatchRunning(null)
      setStopwatchStart(null)

      let actualTimeCompleted = totalElapsed
      if (timerMode === "countdown") {
        const target = targetSecondsMap[i] || repGoal || 45
        actualTimeCompleted = Math.min(target, totalElapsed)
      }

      setPausedTime(prev => ({ ...prev, [i]: actualTimeCompleted }))
      setInitialElapsedMap(prev => ({ ...prev, [i]: actualTimeCompleted }))
      setDisplayTime(prev => ({ ...prev, [i]: actualTimeCompleted }))

      onChange((e) => {
        const next = [...e.sets]
        next[i] = { ...next[i], timeSeconds: actualTimeCompleted }
        return { ...e, sets: next }
      })
    } else {
      // START / RESUME
      soundManager.play('set_start', 0.7)
      
      const prevRecorded = pausedTime[i] ?? item.sets[i]?.timeSeconds ?? 0
      
      if (timerMode === "countdown") {
        const currentTarget = targetSecondsMap[i] || (prevRecorded > 0 ? prevRecorded : (repGoal || 45))
        setTargetSecondsMap(prev => ({ ...prev, [i]: currentTarget }))
        
        // If restarting after reaching target, reset to 0 elapsed; otherwise resume from paused elapsed
        const baseElapsed = prevRecorded >= currentTarget ? 0 : prevRecorded
        setInitialElapsedMap(prev => ({ ...prev, [i]: baseElapsed }))
        setDisplayTime(prev => ({ ...prev, [i]: Math.max(0, currentTarget - baseElapsed) }))
      } else {
        // Stopwatch count up: RESUME from previous recorded elapsed time
        setInitialElapsedMap(prev => ({ ...prev, [i]: prevRecorded }))
        setDisplayTime(prev => ({ ...prev, [i]: prevRecorded }))
      }

      setStopwatchStart(Date.now())
      setStopwatchRunning(i)
    }
  }

  const updateReps = (i: number, value: string) => {
    isEditingRef.current = true
    if (editTimeoutRef.current) clearTimeout(editTimeoutRef.current)
    
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
    if (editTimeoutRef.current) clearTimeout(editTimeoutRef.current)
    
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
        setInitialElapsedMap(prev => {
          const updated = { ...prev }
          delete updated[i]
          return updated
        })
      } else {
        const numValue = Number(value)
        if (!isNaN(numValue) && numValue >= 0) {
          next[i] = { ...next[i], timeSeconds: numValue }
          setPausedTime(prev => ({ ...prev, [i]: numValue }))
          setInitialElapsedMap(prev => ({ ...prev, [i]: numValue }))
          if (timerMode === "countdown") {
            setTargetSecondsMap(prev => ({ ...prev, [i]: numValue }))
          }
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
    if (editTimeoutRef.current) clearTimeout(editTimeoutRef.current)
    
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

  // Desktop right-click context menu
  const handleContextMenu = (e: React.MouseEvent, setIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    const x = Math.min(e.clientX, window.innerWidth - 200)
    const y = Math.min(e.clientY, window.innerHeight - 220)
    setContextMenuPos({ x, y })
    setContextMenuSetIndex(setIndex)
  }

  // Mobile touch handlers for long-press
  const handleTouchStart = (setIndex: number, e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
    
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate(40) } catch {}
      }
      const x = Math.min(touch.clientX, window.innerWidth - 200)
      const y = Math.min(touch.clientY, window.innerHeight - 220)
      setContextMenuPos({ x, y })
      setContextMenuSetIndex(setIndex)
    }, 450)
  }

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x)
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y)
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }

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
          className="absolute top-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-primary"
          initial={{ width: 0 }}
          animate={{ width: `${completionPercentage}%` }}
          transition={{ type: "spring", damping: 25 }}
        />
      )}

      <div className="flex items-start gap-3">
        {/* Exercise image */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="h-12 w-12 flex-shrink-0 rounded-full bg-muted flex items-center justify-center text-muted-foreground overflow-hidden"
        >
          {exerciseImageUrl ? (
            <img 
              src={exerciseImageUrl} 
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : isTimerExercise ? (
            <TimerIcon className="h-6 w-6 text-primary" />
          ) : isWeightedExercise ? (
            <Weight className="h-6 w-6" />
          ) : (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 8l-4 4 4 4M17 8l4 4-4 4M14 4l-4 16" />
            </svg>
          )}
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <div className="text-lg md:text-xl font-semibold text-foreground flex items-center gap-2">
            <span className="truncate">{item.name}</span>
            {completionPercentage === 100 && (
              <motion.span
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 10 }}
                className="text-emerald-500 flex-shrink-0"
              >
                <Check className="h-4 w-4 stroke-[3]" />
              </motion.span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {isTimerExercise && (
              <span className="inline-flex items-center text-primary font-medium">
                <TimerIcon className="h-3.5 w-3.5 mr-1" />
                Time-based
              </span>
            )}
            {isWeightedExercise && (
              <span className="inline-flex items-center text-primary font-medium">
                <Weight className="h-3.5 w-3.5 mr-1" />
                Weighted
              </span>
            )}
            {!isTimerExercise && !isWeightedExercise && (
              <span>{exerciseType === "bodyweight" ? "Bodyweight" : exerciseType === "cardio" ? "Cardio" : exerciseType === "mobility" ? "Mobility" : "Standard"}</span>
            )}

            {repGoal !== undefined && repGoal > 0 && (
              <>
                <span>•</span>
                <span className="font-medium text-foreground/90">
                  Goal: {isTimerExercise ? `${repGoal}s` : `${repGoal} reps`}
                </span>
              </>
            )}

            {stopwatchRunning !== null && (
              <>
                <span>•</span>
                <span className="text-emerald-500 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  Active ({timerMode === "countdown" ? "Countdown" : "Stopwatch"})
                </span>
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
        </div>

        {/* Action Buttons: Plate Calculator & Options Menu */}
        <div className="flex items-center gap-1 flex-shrink-0">
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
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                soundManager.play('click', 0.3)
                setMenuOpen(!menuOpen)
              }}
              className="rounded-lg p-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
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
                      <button
                        onClick={() => {
                          soundManager.play('click', 0.3)
                          onReplace()
                          setMenuOpen(false)
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors"
                      >
                        Replace
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onRemove()
                        setMenuOpen(false)
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Collapsible Notes Section */}
      <div className="mt-3">
        <button
          onClick={() => {
            soundManager.play('click', 0.2)
            setNotesExpanded(!notesExpanded)
          }}
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <motion.div
            animate={{ rotate: notesExpanded ? 180 : 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </motion.div>
          <span>{notesExpanded ? "Hide Notes" : "Add Notes"}</span>
          {!notesExpanded && item.notes && (
            <span className="text-[10px] text-primary font-semibold">
              • Has notes
            </span>
          )}
        </button>
        <AnimatePresence>
          {notesExpanded && (
            <motion.textarea
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              value={item.notes || ""}
              onChange={(e) => onChange((x) => ({ ...x, notes: e.target.value }))}
              placeholder="Add exercise notes..."
              className="mt-2 w-full resize-none rounded-xl border bg-background p-3 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
              rows={2}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Controls: Rest Timer & Timer Mode Toggle */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-border/50">
        {/* Rest Timer Toggle (Clean label, no redundant 30s/60s text) */}
        <div className="flex items-center gap-2.5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              soundManager.play('click', 0.3)
              onChange((x) => ({ 
                ...x, 
                restEnabled: !x.restEnabled,
                restSec: x.restSec || 60
              }))
            }}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer ${
              item.restEnabled ? "bg-primary" : "bg-muted"
            }`}
            aria-label="Toggle Rest Timer"
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-xs ${
                item.restEnabled ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </motion.button>
          <span className="text-xs font-medium text-muted-foreground">Rest Timer</span>

          {item.restEnabled && (
            <div className="relative inline-flex items-center ml-1">
              <select
                value={item.restSec || 60}
                onChange={(e) => {
                  soundManager.play('click', 0.2)
                  const sec = Number(e.target.value)
                  onChange((x) => ({ ...x, restSec: sec }))
                }}
                className="appearance-none bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs px-2.5 py-1 pr-6 rounded-lg border border-border/60 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
                aria-label="Select Rest Duration"
              >
                <option value={30}>30s</option>
                <option value={45}>45s</option>
                <option value={60}>60s</option>
                <option value={90}>90s</option>
                <option value={120}>120s</option>
                <option value={180}>180s</option>
                <option value={240}>240s</option>
                <option value={300}>300s</option>
              </select>
              <ChevronDown className="h-3 w-3 text-muted-foreground absolute right-2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Dual Mode Switch for Timer Exercises (Stopwatch vs Goal Timer) */}
        {isTimerExercise && (
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/60 border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => {
                soundManager.play('click', 0.2)
                setTimerMode("stopwatch")
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                timerMode === "stopwatch"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Stopwatch
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.play('click', 0.2)
                setTimerMode("countdown")
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                timerMode === "countdown"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Goal Timer
            </button>
          </div>
        )}
      </div>

      {/* Rest Remaining indicator */}
      <AnimatePresence>
        {item.restEnabled && restLeft > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              scale: restLeft <= 3 ? [1, 1.05, 1] : 1
            }}
            exit={{ opacity: 0, y: -6 }}
            transition={{
              scale: { repeat: restLeft <= 3 ? Infinity : 0, duration: 0.5 }
            }}
            className="mt-2.5 text-xs font-semibold rounded-xl px-3 py-1.5 inline-flex items-center gap-1.5 bg-primary/15 text-primary border border-primary/25"
          >
            <Clock className="h-3.5 w-3.5 animate-spin" />
            <span>Rest: {restLeft}s remaining</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sets list — uncluttered, clean columns with Desktop Right-Click & Mobile Long-Press removal */}
      <div className="mt-4">
        {/* Column headers (Permanent cross removed) */}
        <div className={`grid text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/60 gap-2 ${
          isWeightedExercise ? "grid-cols-[2.2rem_1fr_1fr_1fr_2.5rem]" : "grid-cols-[2.2rem_1fr_1fr_2.5rem]"
        }`}>
          <span className="text-center" title="Set number (Click to cycle Warmup / Dropset / Failure)">SET</span>
          <span>PREV</span>
          <span>{isTimerExercise ? (timerMode === "countdown" ? "TARGET / SEC" : "TIME") : "REPS"}</span>
          {isWeightedExercise && <span>KG</span>}
          <span className="text-center">DONE</span>
        </div>

        <AnimatePresence mode="popLayout">
          {item.sets.map((s, i) => {
            const prevVal = getPreviousValue(i)
            const isThisSetRunning = stopwatchRunning === i
            const displaySec = displayTime[i] !== undefined 
              ? displayTime[i] 
              : (timerMode === "countdown" && targetSecondsMap[i] 
                  ? targetSecondsMap[i] 
                  : (pausedTime[i] ?? s.timeSeconds ?? 0))

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                onContextMenu={(e) => handleContextMenu(e, i)}
                onTouchStart={(e) => handleTouchStart(i, e)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                className={`group grid items-center gap-2 py-2 border-b border-border/40 text-sm transition-colors rounded-xl px-1 ${
                  isThisSetRunning 
                    ? "bg-primary/5 border-l-2 border-l-primary" 
                    : "hover:bg-muted/30"
                } ${
                  isWeightedExercise ? "grid-cols-[2.2rem_1fr_1fr_1fr_2.5rem]" : "grid-cols-[2.2rem_1fr_1fr_2.5rem]"
                }`}
              >
                {/* Set number with Set Type toggle & PR indicator */}
                <div className="flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={() => cycleSetType(i)}
                    className="hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    title={`Set ${i + 1} (${s.setType || "normal"}). Click to cycle type`}
                  >
                    {s.setType === "warmup" ? (
                      <span className="text-[10px] font-black text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded leading-none">W</span>
                    ) : s.setType === "dropset" ? (
                      <span className="text-[10px] font-black text-purple-400 bg-purple-500/15 px-1.5 py-0.5 rounded leading-none">D</span>
                    ) : s.setType === "failure" ? (
                      <span className="text-[10px] font-black text-rose-500 bg-rose-500/15 px-1.5 py-0.5 rounded leading-none">F</span>
                    ) : (
                      <span className="font-semibold text-center leading-none text-xs text-muted-foreground group-hover:text-foreground">
                        {i + 1}
                      </span>
                    )}
                  </button>
                  {s.done && s.weight && top1RM && (s.weight >= (top1RM * 0.95)) ? (
                    <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-500/15 px-1 py-0.2 rounded leading-tight mt-0.5">
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
                    {/* Sleek Modern Play/Pause button (No yellow color) */}
                    <button
                      type="button"
                      onClick={() => toggleStopwatch(i)}
                      className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                        isThisSetRunning
                          ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30"
                          : "bg-secondary text-secondary-foreground hover:bg-primary/20 hover:text-primary"
                      }`}
                      aria-label={isThisSetRunning ? "Pause timer" : "Start timer"}
                      title={isThisSetRunning ? "Pause" : "Start"}
                    >
                      {isThisSetRunning ? (
                        <Pause className="h-3.5 w-3.5 fill-current" />
                      ) : (
                        <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                      )}
                    </button>

                    {isThisSetRunning ? (
                      <div className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-background border border-primary/40 font-mono font-bold text-primary text-center text-xs shadow-xs">
                        {formatTime(displaySec)}
                      </div>
                    ) : (
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={pausedTime[i] ?? s.timeSeconds ?? targetSecondsMap[i] ?? ""}
                        onChange={(e) => updateTimeSeconds(i, e.target.value)}
                        className="flex-1 min-w-0 w-full rounded-xl border border-border/80 bg-background px-2.5 py-1.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs font-medium"
                        placeholder={timerMode === "countdown" ? `${repGoal || 45}s target` : "sec"}
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
                    className="w-full rounded-xl border border-border/80 bg-background px-2.5 py-1.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs font-medium"
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
                    className="w-full rounded-xl border border-border/80 bg-background px-2.5 py-1.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs font-medium"
                    placeholder="kg"
                  />
                )}

                {/* Done button */}
                <button
                  type="button"
                  onClick={() => toggleDone(i)}
                  className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer mx-auto ${
                    s.done
                      ? (repGoal && !isTimerExercise && s.reps && s.reps > repGoal
                          ? "bg-red-600 text-white shadow-xs"
                          : "bg-emerald-600 text-white shadow-xs")
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                  aria-label={s.done ? "Set completed" : "Mark set as done"}
                >
                  <Check className="h-4 w-4 stroke-[2.5]" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>

        <button
          type="button"
          onClick={addSet}
          className="mt-3.5 w-full rounded-xl bg-primary/10 py-2.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-all cursor-pointer"
        >
          + Add Set
        </button>
      </div>

      {/* Set Row Context Menu (Desktop Right-Click & Mobile Long-Press) */}
      <AnimatePresence>
        {contextMenuSetIndex !== null && contextMenuPos && (
          <>
            <div 
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[1px]" 
              onClick={() => setContextMenuSetIndex(null)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenuSetIndex(null) }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.15 }}
              style={{
                top: `${contextMenuPos.y}px`,
                left: `${contextMenuPos.x}px`,
              }}
              className="fixed z-50 w-48 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-md p-1.5 shadow-2xl text-xs overflow-hidden select-none"
            >
              <div className="px-3 py-1.5 font-bold text-[11px] text-muted-foreground border-b border-border/50 mb-1">
                Set #{contextMenuSetIndex + 1} Actions
              </div>

              <button
                type="button"
                onClick={() => removeSet(contextMenuSetIndex)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/15 font-semibold transition-colors cursor-pointer text-left"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Set</span>
              </button>

              <button
                type="button"
                onClick={() => duplicateSet(contextMenuSetIndex)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-muted font-medium transition-colors cursor-pointer text-left"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Duplicate Set</span>
              </button>

              <div className="my-1 border-t border-border/50" />
              <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground">
                Change Set Type
              </div>

              <div className="grid grid-cols-2 gap-1 px-1">
                <button
                  type="button"
                  onClick={() => setSpecificSetType(contextMenuSetIndex, "normal")}
                  className="px-2 py-1.5 rounded-lg text-center font-semibold bg-muted/60 hover:bg-muted text-foreground transition-colors"
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setSpecificSetType(contextMenuSetIndex, "warmup")}
                  className="px-2 py-1.5 rounded-lg text-center font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                >
                  Warmup (W)
                </button>
                <button
                  type="button"
                  onClick={() => setSpecificSetType(contextMenuSetIndex, "dropset")}
                  className="px-2 py-1.5 rounded-lg text-center font-bold text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                >
                  Dropset (D)
                </button>
                <button
                  type="button"
                  onClick={() => setSpecificSetType(contextMenuSetIndex, "failure")}
                  className="px-2 py-1.5 rounded-lg text-center font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                >
                  Failure (F)
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <PlateCalculatorDialog
        open={plateCalcOpen}
        onClose={() => setPlateCalcOpen(false)}
        initialWeight={plateCalcInitialWeight}
      />
    </motion.div>
  )
}

export default memo(LiveExerciseCard)