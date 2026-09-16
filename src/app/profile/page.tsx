"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useProfile, useExercises } from "@/hooks/use-local-data"
import { User, Save } from "lucide-react"
import { toast } from "sonner"
import { DataBackup } from "@/components/profile/data-backup"

export default function ProfilePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { profile, save } = useProfile()
  const { exercises, update: updateExercise } = useExercises()

  const [name, setName] = useState(profile.name || "")
  const [heightCm, setHeightCm] = useState<number | "">(profile.heightCm ?? "")
  const [weightKg, setWeightKg] = useState<number | "">(profile.weightKg ?? "")
  const [goalType, setGoalType] = useState(profile.goalType ?? "strength")
  const [goals, setGoals] = useState(profile.goals || [])

  // Safely populate form fields once profile loads
  useEffect(() => {
    if (profile) {
      if (profile.name) setName(profile.name)
      if (profile.heightCm) setHeightCm(profile.heightCm)
      if (profile.weightKg) setWeightKg(profile.weightKg)
      if (profile.goalType) setGoalType(profile.goalType)
      if (profile.goals && profile.goals.length > 0) setGoals(profile.goals)
    }
  }, [profile.name, profile.heightCm, profile.weightKg, profile.goalType, profile.goals?.length])

  // Exercise rep goals management
  const [exerciseGoals, setExerciseGoals] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!exercises || exercises.length === 0) return
    const goalsMap: Record<string, number> = {}
    exercises.forEach(ex => {
      if (ex.repGoal) {
        goalsMap[ex.id] = ex.repGoal
      }
    })
    setExerciseGoals(prev => {
      // Only update if keys/values differ
      const prevKeys = Object.keys(prev)
      const newKeys = Object.keys(goalsMap)
      if (prevKeys.length === 0 && newKeys.length === 0) return prev
      if (prevKeys.length === newKeys.length && newKeys.every(k => prev[k] === goalsMap[k])) {
        return prev
      }
      return { ...prev, ...goalsMap }
    })
  }, [exercises])

  const handleSaveExerciseGoals = async () => {
    try {
      // Update each exercise with its new rep goal
      for (const ex of exercises) {
        const newGoal = exerciseGoals[ex.id]
        if (newGoal !== ex.repGoal) {
          await updateExercise({
            ...ex,
            repGoal: newGoal || undefined
          })
        }
      }
      toast.success("Exercise goals updated!")
    } catch (error) {
      console.error("Failed to update exercise goals:", error)
      toast.error("Failed to update exercise goals")
    }
  }

  // Show loading while mounting
  if (!mounted) {
    return (
      <main className="pb-32 md:pb-12">
        <section className="mx-auto max-w-3xl px-4 pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="pb-32 md:pb-12">

      <header className="mx-auto max-w-3xl px-4 pt-6">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">Set your info and targets.</p>
      </header>

      <section className="mx-auto max-w-3xl px-4 pt-4 space-y-6">
        <form
          className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm"
          onSubmit={async (e) => {
            e.preventDefault()
            await save({
              name: name.trim(),
              heightCm: Number(heightCm) || undefined,
              weightKg: Number(weightKg) || undefined,
              goalType: goalType as any,
              goals,
            })
            toast.success("Profile saved!")
          }}
        >
          <div className="grid gap-1">
            <label className="text-sm text-muted-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border bg-card px-3 py-2"
              placeholder="Your name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Height (cm)</label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full rounded-lg border bg-card px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Weight (kg)</label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full rounded-lg border bg-card px-3 py-2"
              />
            </div>
          </div>

          <div className="grid gap-1">
            <label className="text-sm text-muted-foreground">Training Goal</label>
            <select
              value={goalType}
              onChange={(e) => setGoalType(e.target.value as "strength" | "endurance" | "skill")}
              className="rounded-lg border bg-card px-3 py-2"
            >
              <option value="strength">Strength</option>
              <option value="endurance">Endurance</option>
              <option value="skill">Skill</option>
            </select>
          </div>

          <div className="grid gap-3 rounded-lg border p-3">
            <div className="text-sm font-medium">Targets</div>
            {goals.map((g, idx) => {
              const exercise = exercises.find((e) => e.id === g.exerciseId)
              return (
                <div key={idx} className="grid grid-cols-3 items-end gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Exercise</label>
                    <select
                      value={g.exerciseId}
                      onChange={(e) => {
                        const v = e.target.value
                        setGoals((arr) => arr.map((x, i) => (i === idx ? { ...x, exerciseId: v } : x)))
                      }}
                      className="mt-1 w-full rounded-lg border bg-card px-3 py-2"
                    >
                      {exercises.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Target Reps</label>
                    <input
                      type="number"
                      value={g.targetReps ?? ""}
                      onChange={(e) =>
                        setGoals((arr) =>
                          arr.map((x, i) => (i === idx ? { ...x, targetReps: Number(e.target.value) } : x)),
                        )
                      }
                      className="mt-1 w-full rounded-lg border bg-card px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Target Volume</label>
                    <input
                      type="number"
                      value={g.targetVolume ?? ""}
                      onChange={(e) =>
                        setGoals((arr) =>
                          arr.map((x, i) => (i === idx ? { ...x, targetVolume: Number(e.target.value) } : x)),
                        )
                      }
                      className="mt-1 w-full rounded-lg border bg-card px-3 py-2"
                    />
                  </div>
                </div>
              )
            })}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGoals((arr) => [...arr, { exerciseId: exercises[0]?.id ?? "", targetReps: 10 }])}
                className="rounded-md bg-secondary px-3 py-2 text-sm"
              >
                Add Target
              </button>
              <button
                type="button"
                onClick={() => setGoals((arr) => arr.slice(0, -1))}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                disabled={goals.length === 0}
              >
                Remove Last
              </button>
            </div>
          </div>

          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-primary-foreground flex items-center justify-center gap-2">
            <Save className="h-4 w-4" />
            Save Profile
          </button>

          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Current vs Target</div>
            <ul className="mt-2 grid gap-2">
              {goals.length === 0 && <li className="text-sm text-muted-foreground">No targets defined.</li>}
              {goals.map((g, idx) => {
                const ex = exercises.find((e) => e.id === g.exerciseId)
                return (
                  <li key={idx} className="text-sm">
                    {ex?.name ?? "Exercise"}: Target {g.targetReps ?? "-"} reps, {g.targetVolume ?? "-"} vol
                  </li>
                )
              })}
            </ul>
          </div>
        </form>

        {/* Exercise Rep Goals Section */}
        <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm">
          <div>
            <h2 className="text-lg font-medium">Exercise Rep Goals</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Set target reps for each exercise to track your progress
            </p>
          </div>

          {exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exercises available.</p>
          ) : (
            <div className="space-y-3">
              {exercises.map((ex) => (
                <div key={ex.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{ex.name}</div>
                    {ex.type && (
                      <div className="text-xs text-muted-foreground capitalize">{ex.type}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={exerciseGoals[ex.id] || ""}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : 0
                        setExerciseGoals(prev => ({
                          ...prev,
                          [ex.id]: value
                        }))
                      }}
                      className="w-20 rounded-lg border bg-background px-3 py-1.5 text-sm text-center"
                      placeholder="Goal"
                      min="1"
                    />
                    <span className="text-xs text-muted-foreground">reps</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveExerciseGoals}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Exercise Goals
          </button>
        </div>

        {/* Data Backup & Restore Section */}
        <DataBackup />
      </section>
    </main>
  )
}