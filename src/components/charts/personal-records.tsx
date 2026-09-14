"use client"

import { useMemo, useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { Workout } from "@/lib/types"
import { ChevronDown, ChevronUp, Settings } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export function PersonalRecords({ workouts }: { workouts: Workout[] }) {
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedExercises, setSelectedExercises] = useState<string[]>([])

  // Get all available exercises with their PRs
  const allExercises = useMemo(() => {
    const exerciseMap = new Map<string, { maxReps: number; history: { date: string; reps: number }[] }>()
    
    workouts.forEach((w) => {
      const existing = exerciseMap.get(w.exerciseName) || { maxReps: 0, history: [] }
      const currentMax = Math.max(existing.maxReps, w.reps)
      
      exerciseMap.set(w.exerciseName, {
        maxReps: currentMax,
        history: [...existing.history, { date: w.date, reps: w.reps }].sort((a, b) => a.date.localeCompare(b.date))
      })
    })

    return Array.from(exerciseMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.maxReps - a.maxReps)
  }, [workouts])

  // Load selected exercises from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("pr-selected-exercises")
    if (stored) {
      setSelectedExercises(JSON.parse(stored))
    } else if (allExercises.length > 0) {
      // Default to top 4 exercises
      const defaultSelected = allExercises.slice(0, 4).map(e => e.name)
      setSelectedExercises(defaultSelected)
      localStorage.setItem("pr-selected-exercises", JSON.stringify(defaultSelected))
    }
  }, [allExercises])

  // Filter to show only selected exercises
  const displayedPRs = useMemo(() => {
    return allExercises.filter(e => selectedExercises.includes(e.name))
  }, [allExercises, selectedExercises])

  const handleSaveSettings = () => {
    localStorage.setItem("pr-selected-exercises", JSON.stringify(selectedExercises))
    setShowSettings(false)
  }

  const handleToggleExercise = (exerciseName: string) => {
    setSelectedExercises(prev => {
      if (prev.includes(exerciseName)) {
        return prev.filter(e => e !== exerciseName)
      } else {
        return [...prev, exerciseName]
      }
    })
  }

  const toggleExpand = (exerciseName: string) => {
    setExpandedExercise(prev => prev === exerciseName ? null : exerciseName)
  }

  if (allExercises.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No workout data yet
      </div>
    )
  }

  return (
    <>
      {/* Settings Button - Top Right */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span>Select Exercises</span>
        </button>
      </div>

      {/* PR List - Vertical */}
      <div className="space-y-1">
        {displayedPRs.map((pr) => {
          const isExpanded = expandedExercise === pr.name
          
          return (
            <div key={pr.name} className="border-b border-border/40 last:border-none">
              {/* PR Row */}
              <button
                onClick={() => toggleExpand(pr.name)}
                className="w-full py-4 px-3 flex items-center justify-between rounded-lg transition-colors hover:bg-muted/40 cursor-pointer"
              >
                {/* Left: Exercise Name */}
                <div className="flex-1 text-left font-medium text-base text-foreground">
                  {pr.name}
                </div>

                {/* Middle: PR Value (Visual Centerpiece) */}
                <div className="flex-1 text-center font-bold text-lg text-primary">
                  {pr.maxReps} reps
                </div>

                {/* Right: View Progression Link */}
                <div className="flex-1 text-right flex items-center justify-end gap-1 text-sm text-muted-foreground">
                  {isExpanded ? (
                    <>
                      <span>Hide</span>
                      <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <span>View</span>
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </>
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
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0a0a0c',
                            border: '1px solid #1c1c20',
                            borderRadius: '10px',
                            fontSize: '12px',
                            color: '#FFFFFF',
                          }}
                          formatter={(value: any) => [value, "Reps"]}
                          labelFormatter={(label: any) => {
                            const date = new Date(label || Date.now())
                            return date.toLocaleDateString()
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="reps"
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
                        PR: {exercise.maxReps} reps
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