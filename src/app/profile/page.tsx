"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useProfile, useExercises } from "@/hooks/use-local-data"
import type { Goal } from "@/lib/types"
import { User, Save, Activity, RefreshCw, Volume2, VolumeX, Vibrate } from "lucide-react"
import { toast } from "sonner"
import { mutate as globalMutate } from "swr"
import { DataBackup } from "@/components/profile/data-backup"
import { Switch } from "@/components/ui/switch"
import soundManager, { isVibrationEnabled, setVibrationEnabled } from "@/lib/sounds"
import { PageTransition } from "@/components/ui/page-transition"

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
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg")
  const [goalType, setGoalType] = useState(profile.goalType ?? "strength")
  const [goals, setGoals] = useState<Goal[]>(profile.goals || [])

  // Sound & Vibration preference states
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [vibrationEnabledState, setVibrationEnabledState] = useState(true)

  useEffect(() => {
    setSoundEnabled(soundManager.isEnabled())
    setVibrationEnabledState(isVibrationEnabled())
  }, [])

  const handleToggleSound = (checked: boolean) => {
    soundManager.setEnabled(checked)
    setSoundEnabled(checked)
    toast.success(checked ? "Sound effects enabled" : "Sound effects muted")
  }

  const handleToggleVibration = (checked: boolean) => {
    setVibrationEnabled(checked)
    setVibrationEnabledState(checked)
    toast.success(checked ? "Vibration enabled" : "Vibration disabled")
  }

  // Load preferred weight unit
  useEffect(() => {
    try {
      const saved = localStorage.getItem("preferred_weight_unit")
      if (saved === "kg" || saved === "lbs") setWeightUnit(saved)
    } catch {}
  }, [])

  const handleToggleUnit = (unit: "kg" | "lbs") => {
    setWeightUnit(unit)
    try {
      localStorage.setItem("preferred_weight_unit", unit)
    } catch {}
  }

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

  // BMI and Calorie target calculation
  const bmiInfo = useMemo(() => {
    const h = Number(heightCm)
    const w = Number(weightKg)
    if (!h || !w || h <= 0 || w <= 0) return null

    const heightM = h / 100
    const bmi = Math.round((w / (heightM * heightM)) * 10) / 10

    let category = "Normal weight"
    let badgeClass = "text-emerald-500 bg-emerald-500/15 border-emerald-500/30"
    if (bmi < 18.5) {
      category = "Underweight"
      badgeClass = "text-amber-500 bg-amber-500/15 border-amber-500/30"
    } else if (bmi >= 25 && bmi < 30) {
      category = "Overweight"
      badgeClass = "text-amber-500 bg-amber-500/15 border-amber-500/30"
    } else if (bmi >= 30) {
      category = "Obese"
      badgeClass = "text-rose-500 bg-rose-500/15 border-rose-500/30"
    }

    // Basal Metabolic Rate (Mifflin-St Jeor formula)
    const bmr = Math.round(10 * w + 6.25 * h - 5 * 25 + 5)
    // Estimated Maintenance (TDEE with workout routine ~ 1.45 multiplier)
    const tdee = Math.round(bmr * 1.45)
    // Target based on training goal
    const targetCalories = goalType === "strength" 
      ? Math.round(tdee * 1.1) 
      : goalType === "endurance" 
      ? tdee 
      : Math.round(tdee * 0.95)

    return { bmi, category, badgeClass, bmr, tdee, targetCalories }
  }, [heightCm, weightKg, goalType])

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

  const [isRecalculating, setIsRecalculating] = useState(false)
  const handleRecalculatePoints = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null
    setIsRecalculating(true)
    const toastId = toast.loading("Normalizing points for all workouts...")
    try {
      const res = await fetch("/api/workouts/recalculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || `Updated ${data.updatedCount} workouts successfully!`, { id: toastId })
        globalMutate("/api/workouts?limit=10000")
      } else {
        toast.error(data.error || "Failed to normalize points", { id: toastId })
      }
    } catch {
      toast.error("Network error while normalizing points", { id: toastId })
    } finally {
      setIsRecalculating(false)
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
    <PageTransition>
      <main className="pb-32 md:pb-12">
        <header className="mx-auto max-w-3xl px-4 pt-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Set your info and targets.</p>
        </header>

        <section className="mx-auto max-w-3xl px-4 pt-4 space-y-6">
          <form
            className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-6 shadow-xs"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                await save({
                  name: name.trim(),
                  heightCm: Number(heightCm) || undefined,
                  weightKg: Number(weightKg) || undefined,
                  goalType: goalType as any,
                  goals,
                })
                toast.success("Profile saved!")
              } catch (err: any) {
                toast.error(err?.message || "Failed to save profile")
              }
            }}
          >
            <div className="grid gap-1.5">
              <label className="text-sm text-muted-foreground">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="w-full rounded-xl border bg-card px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="cm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">Weight</label>
                  <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-full text-xs border border-border/50">
                    <button
                      type="button"
                      onClick={() => handleToggleUnit("kg")}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                        weightUnit === "kg"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleUnit("lbs")}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                        weightUnit === "lbs"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      lbs
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={
                    weightKg === ""
                      ? ""
                      : weightUnit === "lbs"
                      ? Math.round(Number(weightKg) * 2.20462 * 10) / 10
                      : weightKg
                  }
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === "") {
                      setWeightKg("")
                    } else {
                      const num = Number(val)
                      setWeightKg(weightUnit === "lbs" ? Math.round((num / 2.20462) * 10) / 10 : num)
                    }
                  }}
                  className="w-full rounded-xl border bg-card px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={weightUnit}
                />
              </div>
            </div>

            {/* Dynamic BMI & Calorie Target Calculator */}
            {bmiInfo && (
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Body Metrics & Calorie Target
                    </span>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${bmiInfo.badgeClass}`}>
                    {bmiInfo.category}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-card border border-border/50">
                    <div className="text-[10px] sm:text-[11px] text-muted-foreground">BMI</div>
                    <div className="text-sm sm:text-base font-bold text-foreground mt-0.5">{bmiInfo.bmi}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-border/50">
                    <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate">BMR / Base</div>
                    <div className="text-sm sm:text-base font-bold text-foreground mt-0.5 truncate">{bmiInfo.bmr} kcal</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="text-[10px] sm:text-[11px] text-primary font-medium truncate">Daily Target</div>
                    <div className="text-sm sm:text-base font-bold text-primary mt-0.5 truncate">{bmiInfo.targetCalories} kcal</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-1.5">
              <label className="text-sm text-muted-foreground">Training Goal</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as "strength" | "endurance" | "skill")}
                className="rounded-xl border bg-card px-3 py-2 text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="strength">Strength (Muscle Building Surplus)</option>
                <option value="endurance">Endurance (Performance Maintenance)</option>
                <option value="skill">Skill (Lean Athletic)</option>
              </select>
            </div>

            {/* Target Exercises Setup */}
            <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="text-sm font-medium text-foreground">Exercise Targets</div>
              {goals.map((g, idx) => {
                const exercise = exercises.find((e) => e.id === g.exerciseId)
                return (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 items-end gap-2.5 sm:gap-3 pb-3 border-b sm:border-b-0 border-border/40">
                    <div>
                      <label className="text-xs text-muted-foreground">Exercise</label>
                      <select
                        value={g.exerciseId}
                        onChange={(e) => {
                          const v = e.target.value
                          setGoals((arr) => arr.map((x, i) => (i === idx ? { ...x, exerciseId: v } : x)))
                        }}
                        className="mt-1 w-full rounded-xl border bg-card px-3 py-2 text-sm"
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
                        className="mt-1 w-full rounded-xl border bg-card px-3 py-2 text-sm"
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
                        className="mt-1 w-full rounded-xl border bg-card px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setGoals((arr) => [...arr, { exerciseId: exercises[0]?.id ?? "", targetReps: 10 }])}
                  className="rounded-full bg-secondary px-3.5 py-1.5 text-sm hover:bg-secondary/80 active:scale-[0.98] transition-all cursor-pointer border border-border/60"
                >
                  Add Target
                </button>
                <button
                  type="button"
                  onClick={() => setGoals((arr) => arr.slice(0, -1))}
                  className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground hover:bg-muted active:scale-[0.98] transition-all cursor-pointer"
                  disabled={goals.length === 0}
                >
                  Remove Last
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="h-10 px-5 rounded-full bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
            >
              <Save className="h-4 w-4" />
              <span>Save Profile</span>
            </button>

            {/* Flattened Current vs Target Section (clean integrated summary, no double border) */}
            <div className="pt-3 border-t border-border/50 space-y-2">
              <div className="text-sm font-medium text-foreground">Current vs Target Summary</div>
              <ul className="grid gap-1.5">
                {goals.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No targets defined yet.</li>
                ) : (
                  goals.map((g, idx) => {
                    const ex = exercises.find((e) => e.id === g.exerciseId)
                    return (
                      <li key={idx} className="text-sm flex items-center justify-between py-1 border-b border-border/30 last:border-b-0">
                        <span className="font-medium text-foreground">{ex?.name ?? "Exercise"}</span>
                        <span className="text-muted-foreground font-mono">
                          Target {g.targetReps ?? "-"} reps · {g.targetVolume ?? "-"} vol
                        </span>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>
          </form>

          {/* Exercise Rep Goals Section */}
          <div className="grid gap-4 rounded-2xl border bg-card p-5 sm:p-6 shadow-xs">
            <div>
              <h2 className="text-lg font-medium tracking-tight text-foreground">Exercise Rep Goals</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Set target reps for each exercise to track your progress
              </p>
            </div>

            {exercises.length === 0 ? (
              <p className="text-sm text-muted-foreground">No exercises available.</p>
            ) : (
              <div className="space-y-2.5">
                {exercises.map((ex) => (
                  <div key={ex.id} className="flex items-center gap-3 py-1 border-b border-border/30 last:border-b-0">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{ex.name}</div>
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
                        className="w-20 rounded-full border bg-background px-3 py-1.5 text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Goal"
                        min="1"
                      />
                      <span className="text-xs text-muted-foreground font-mono">{ex.type === "timer" ? "sec" : "reps"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveExerciseGoals}
              className="h-10 px-5 rounded-full bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/90 active:scale-[0.98] transition-all shadow-xs"
            >
              <Save className="h-4 w-4" />
              <span>Save Exercise Goals</span>
            </button>
          </div>

          {/* Points System Calibration */}
          <div className="grid gap-3 rounded-2xl border bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium tracking-tight text-foreground">Points System Calibration</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Normalize past workouts to the balanced points scale. Preserves 100% of your workouts and history.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRecalculatePoints}
                disabled={isRecalculating}
                className="h-9 px-4 rounded-full bg-secondary border border-border/80 text-xs font-semibold hover:bg-secondary/80 active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all self-start sm:self-auto shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRecalculating ? "animate-spin" : ""}`} />
                <span>{isRecalculating ? "Normalizing..." : "Normalize Points"}</span>
              </button>
            </div>
          </div>

          {/* Sound & Vibration Preferences */}
          <div className="grid gap-3 rounded-2xl border bg-card p-5 sm:p-6 shadow-xs">
            <div>
              <h2 className="text-lg font-medium tracking-tight text-foreground">Preferences</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customize audio feedback and haptics during workouts.
              </p>
            </div>
            <div className="divide-y divide-border/60">
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <div className="text-sm font-medium">Sound Effects</div>
                    <div className="text-xs text-muted-foreground">Timer beeps, set completions, and celebration chimes</div>
                  </div>
                </div>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={handleToggleSound}
                  aria-label="Toggle Sound Effects"
                />
              </div>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <Vibrate className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <div className="text-sm font-medium">Vibration & Haptics</div>
                    <div className="text-xs text-muted-foreground">Tactile feedback for rest countdowns and completed reps</div>
                  </div>
                </div>
                <Switch
                  checked={vibrationEnabledState}
                  onCheckedChange={handleToggleVibration}
                  aria-label="Toggle Vibration"
                />
              </div>
            </div>
          </div>

          {/* Data Backup & Restore Section */}
          <DataBackup />
        </section>
      </main>
    </PageTransition>
  )
}