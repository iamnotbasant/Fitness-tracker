"use client"

import { useMemo, useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { Workout } from "@/lib/types"
import { ChevronDown, ChevronUp, Settings, Search, Flame, TrendingUp } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { AnimatedTrophy } from "@/components/ui/animated-icons"
import { useExercises } from "@/hooks/use-local-data"

export const formatTime = (sec: number) => {
  if (!sec) return "0s"
  if (sec >= 60) {
    const mins = Math.floor(sec / 60)
    const rem = sec % 60
    return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`
  }
  return `${sec}s`
}

export function PersonalRecords({ workouts }: { workouts: Workout[] }) {
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedExercises, setSelectedExercises] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const { exercises } = useExercises()

  // Get all available exercises with their PRs and history
  const allExercises = useMemo(() => {
    const timerExerciseNames = new Set(
      (exercises || [])
        .filter((e) => e.type === "timer")
        .map((e) => e.name.toLowerCase())
    )

    const exerciseMap = new Map<
      string,
      {
        isTimer: boolean
        maxReps: number
        maxTimeSeconds: number
        maxWeight: number
        estimated1RM: number
        prDate: string
        history: { date: string; reps: number; timeSeconds?: number; weight: number; points: number }[]
      }
    >()
    
    workouts.forEach((w) => {
      const exName = w.exerciseName || w.name || "Unknown Exercise"
      const lowerName = exName.toLowerCase()
      const isTimer = timerExerciseNames.has(lowerName) || Boolean(w.timeSeconds && w.timeSeconds > 0)

      const existing = exerciseMap.get(exName) || {
        isTimer,
        maxReps: 0,
        maxTimeSeconds: 0,
        maxWeight: 0,
        estimated1RM: 0,
        prDate: w.date,
        history: [],
      }

      if (isTimer) {
        existing.isTimer = true
      }
      
      const reps = w.reps || 0
      const timeSeconds = w.timeSeconds || (isTimer && reps > 0 ? reps : 0)
      const weight = w.weight || 0
      const e1RM = (!isTimer && weight > 0) ? Math.round(weight * (1 + reps / 30)) : 0

      if (isTimer) {
        if (timeSeconds > existing.maxTimeSeconds) {
          existing.prDate = w.date
        }
        existing.maxTimeSeconds = Math.max(existing.maxTimeSeconds, timeSeconds)
      } else {
        if (reps > existing.maxReps || (reps === existing.maxReps && weight > existing.maxWeight)) {
          existing.prDate = w.date
        }
        existing.maxReps = Math.max(existing.maxReps, reps)
        existing.maxWeight = Math.max(existing.maxWeight, weight)
        existing.estimated1RM = Math.max(existing.estimated1RM, e1RM)
      }

      existing.history.push({
        date: w.date,
        reps,
        timeSeconds,
        weight,
        points: w.points ?? w.total_points ?? 0,
      })

      exerciseMap.set(exName, existing)
    })

    return Array.from(exerciseMap.entries())
      .map(([name, data]) => {
        const sortedHistory = [...data.history].sort((a, b) => a.date.localeCompare(b.date))
        const firstVal = data.isTimer
          ? (sortedHistory[0]?.timeSeconds || 1)
          : (sortedHistory[0]?.reps || 1)
        const currentVal = data.isTimer ? data.maxTimeSeconds : data.maxReps
        const improvement = Math.round(((currentVal - firstVal) / Math.max(1, firstVal)) * 100)

        return {
          name,
          ...data,
          history: sortedHistory,
          improvement: Math.max(0, improvement),
        }
      })
      .sort((a, b) => {
        const valA = a.isTimer ? a.maxTimeSeconds : a.maxReps
        const valB = b.isTimer ? b.maxTimeSeconds : b.maxReps
        return valB - valA
      })
  }, [workouts, exercises])

  // Load selected exercises from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("pr-selected-exercises")
    if (stored) {
      try {
        setSelectedExercises(JSON.parse(stored))
      } catch {}
    } else if (allExercises.length > 0) {
      // Default to top 6 exercises
      const defaultSelected = allExercises.slice(0, 6).map((e) => e.name)
      setSelectedExercises(defaultSelected)
      localStorage.setItem("pr-selected-exercises", JSON.stringify(defaultSelected))
    }
  }, [allExercises])

  // Filter to show only selected exercises and search
  const displayedPRs = useMemo(() => {
    return allExercises
      .filter((e) => selectedExercises.includes(e.name))
      .filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [allExercises, selectedExercises, searchQuery])

  const handleSaveSettings = () => {
    localStorage.setItem("pr-selected-exercises", JSON.stringify(selectedExercises))
    setShowSettings(false)
  }

  const handleToggleExercise = (exerciseName: string) => {
    setSelectedExercises((prev) => {
      if (prev.includes(exerciseName)) {
        return prev.filter((e) => e !== exerciseName)
      } else {
        return [...prev, exerciseName]
      }
    })
  }

  const toggleExpand = (exerciseName: string) => {
    setExpandedExercise((prev) => (prev === exerciseName ? null : exerciseName))
  }

  if (allExercises.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground bg-secondary/20 rounded-2xl border border-dashed border-border/70">
        No workout data logged yet for Personal Records.
      </div>
    )
  }

  return (
    <>
      {/* Controls: Search + Exercise Config */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/40 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search PR records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-secondary/40 border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
          />
        </div>

        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/50 border border-border/60 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all cursor-pointer"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Customize PRs</span>
        </button>
      </div>

      {/* PR List Cards */}
      <div className="space-y-2 pt-1">
        {displayedPRs.map((pr) => {
          const isExpanded = expandedExercise === pr.name

          return (
            <div
              key={pr.name}
              className={`rounded-2xl border transition-all ${
                isExpanded
                  ? "bg-secondary/40 border-primary/40 shadow-sm"
                  : "bg-secondary/20 border-border/50 hover:bg-secondary/30 hover:border-border"
              }`}
            >
              {/* PR Row */}
              <button
                onClick={() => toggleExpand(pr.name)}
                className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                {/* Left: Exercise Name & Date */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <AnimatedTrophy className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-foreground block truncate">
                      {pr.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Set on {new Date(pr.prDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Middle: PR Metric */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 justify-end">
                    {pr.isTimer ? (
                      <span className="text-lg font-black text-primary">
                        {formatTime(pr.maxTimeSeconds)}
                      </span>
                    ) : (
                      <span className="text-lg font-black text-primary">
                        {pr.maxReps} <span className="text-xs font-bold text-muted-foreground">reps</span>
                      </span>
                    )}
                  </div>
                  {!pr.isTimer && pr.estimated1RM > 0 ? (
                    <span className="text-[10px] font-bold text-muted-foreground block">
                      ~{pr.estimated1RM} kg 1RM
                    </span>
                  ) : pr.improvement > 0 ? (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 justify-end">
                      <TrendingUp className="h-2.5 w-2.5" />
                      +{pr.improvement}% growth
                    </span>
                  ) : null}
                </div>

                {/* Right: Expand Toggle */}
                <div className="pl-1 shrink-0 text-muted-foreground">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {/* Expandable Graph Area - Slides Down */}
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: isExpanded ? '300px' : '0px',
                  opacity: isExpanded ? 1 : 0,
                }}
              >
                <div className="pt-2 pb-6 px-2">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={pr.history} 
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <XAxis 
                          dataKey="date" 
                          stroke="currentColor"
                          className="stroke-muted-foreground/40 text-muted-foreground"
                          tick={{ fontSize: 11, fill: 'currentColor' }}
                          tickLine={false}
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return `${date.getMonth() + 1}/${date.getDate()}`
                          }}
                        />
                        <YAxis 
                          stroke="currentColor"
                          className="stroke-muted-foreground/40 text-muted-foreground"
                          tick={{ fontSize: 11, fill: 'currentColor' }}
                          tickLine={false}
                          domain={[0, 'dataMax + 2']}
                          tickFormatter={pr.isTimer ? (val) => formatTime(val) : undefined}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0a0a0c',
                            border: '1px solid #1c1c20',
                            borderRadius: '10px',
                            fontSize: '12px',
                            color: '#FFFFFF',
                          }}
                          formatter={(value: any) => [
                            pr.isTimer ? formatTime(Number(value)) : `${value} reps`,
                            pr.isTimer ? "Duration" : "Reps"
                          ]}
                          labelFormatter={(label: any) => {
                            const date = new Date(label || Date.now())
                            return date.toLocaleDateString()
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey={pr.isTimer ? "timeSeconds" : "reps"}
                          stroke="hsl(var(--primary))"
                          strokeWidth={2.5}
                          dot={{ fill: "hsl(var(--primary))", r: 4 }}
                          activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Exercises to Track</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose exercises to display on your dashboard. Your selections will be saved.
            </p>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {allExercises.map((exercise) => (
                <div key={exercise.name} className="flex items-center space-x-3">
                  <Checkbox
                    id={exercise.name}
                    checked={selectedExercises.includes(exercise.name)}
                    onCheckedChange={() => handleToggleExercise(exercise.name)}
                  />
                  <Label
                    htmlFor={exercise.name}
                    className="flex-1 cursor-pointer text-sm font-normal"
                  >
                    <div className="flex items-center justify-between">
                      <span>{exercise.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        PR: {exercise.isTimer ? formatTime(exercise.maxTimeSeconds) : `${exercise.maxReps} reps`}
                      </span>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSettings}>
                Save Selection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}