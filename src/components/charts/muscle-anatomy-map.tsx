"use client"

import { useState, useMemo } from "react"
import type { Workout, Exercise } from "@/lib/types"
import { Dumbbell, Flame, Layers, Activity, Info, CheckCircle2 } from "lucide-react"
import {
  MALE_FRONT_PARTS,
  MALE_BACK_PARTS,
  MALE_FRONT_VIEWBOX,
  MALE_BACK_VIEWBOX,
  type BodyPartPaths,
} from "./muscle-map-data"

export interface MuscleStat {
  key: string
  name: string
  view: "front" | "back" | "both"
  category: "push" | "pull" | "legs" | "core" | "arms"
  sets: number
  reps: number
  points: number
  exercises: { name: string; sets: number; reps: number }[]
  intensity: number // 0 to 1
}

interface MuscleAnatomyMapProps {
  workouts: Workout[]
  exercises: Exercise[]
}

// Sub-groups that overlap with primary groups when showSubGroups is false
const SUBGROUP_SLUGS = new Set([
  "upperChest",
  "lowerChest",
  "upperAbs",
  "lowerAbs",
  "innerQuad",
  "outerQuad",
  "frontDeltoid",
  "rearDeltoid",
])

// Non-muscle anatomical elements to render in neutral styling
const NEUTRAL_SLUGS = new Set([
  "head",
  "hair",
  "neck",
  "hands",
  "feet",
  "knees",
  "ankles",
])

// Map melihcolpan slug to internal muscle group key
function slugToMuscleKey(slug: string): string | null {
  switch (slug) {
    case "chest":
    case "upperChest":
    case "lowerChest":
      return "chest"
    case "abs":
    case "upperAbs":
    case "lowerAbs":
      return "core"
    case "obliques":
    case "serratus":
    case "hipFlexors":
      return "obliques"
    case "biceps":
      return "biceps"
    case "triceps":
      return "triceps"
    case "deltoids":
    case "frontDeltoid":
    case "rearDeltoid":
      return "shoulders"
    case "trapezius":
      return "traps"
    case "upperBack":
      return "lats"
    case "lowerBack":
      return "lower back"
    case "gluteal":
      return "glutes"
    case "quadriceps":
    case "innerQuad":
    case "outerQuad":
      return "quads"
    case "hamstring":
      return "hamstrings"
    case "calves":
    case "tibialis":
      return "calves"
    case "adductors":
      return "adductors"
    case "forearm":
      return "forearms"
    default:
      return null
  }
}

function normalizeBodyPart(part: string): string {
  const clean = part.toLowerCase().trim()
  if (clean.includes("chest") || clean.includes("pec")) return "chest"
  if (clean.includes("shoulder") || clean.includes("delt")) return "shoulders"
  if (clean.includes("bicep")) return "biceps"
  if (clean.includes("tricep")) return "triceps"
  if (clean.includes("forearm")) return "forearms"
  if (clean.includes("oblique")) return "obliques"
  if (clean.includes("core") || clean.includes("abs") || clean.includes("abdom")) return "core"
  if (clean.includes("lat")) return "lats"
  if (clean.includes("trap") || clean.includes("upper back")) return "traps"
  if (clean.includes("lower back")) return "lower back"
  if (clean.includes("back")) return "lats"
  if (clean.includes("glute")) return "glutes"
  if (clean.includes("quad")) return "quads"
  if (clean.includes("hamstring")) return "hamstrings"
  if (clean.includes("calv")) return "calves"
  if (clean.includes("adductor")) return "adductors"
  return clean
}

export function MuscleAnatomyMap({ workouts, exercises }: MuscleAnatomyMapProps) {
  const [activeView, setActiveView] = useState<"both" | "front" | "back">("both")
  const [selectedMuscle, setSelectedMuscle] = useState<string>("chest")
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>("all")

  // Compute stats per muscle group
  const muscleStats = useMemo(() => {
    const stats: Record<string, MuscleStat> = {
      chest: { key: "chest", name: "Pectorals (Chest)", view: "front", category: "push", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      shoulders: { key: "shoulders", name: "Deltoids (Shoulders)", view: "both", category: "push", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      biceps: { key: "biceps", name: "Biceps", view: "front", category: "arms", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      triceps: { key: "triceps", name: "Triceps", view: "back", category: "arms", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      forearms: { key: "forearms", name: "Forearms", view: "both", category: "arms", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      core: { key: "core", name: "Abdominals (Core)", view: "front", category: "core", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      obliques: { key: "obliques", name: "Obliques & Serratus", view: "front", category: "core", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      traps: { key: "traps", name: "Trapezius (Upper Back)", view: "back", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      lats: { key: "lats", name: "Latissimus Dorsi", view: "back", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      "lower back": { key: "lower back", name: "Lower Back", view: "back", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      glutes: { key: "glutes", name: "Gluteals", view: "back", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      quads: { key: "quads", name: "Quadriceps", view: "front", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      adductors: { key: "adductors", name: "Adductors (Inner Thigh)", view: "both", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      hamstrings: { key: "hamstrings", name: "Hamstrings", view: "back", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      calves: { key: "calves", name: "Calves & Tibialis", view: "both", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
    }

    const exMap = new Map<string, Exercise>()
    exercises.forEach((ex) => exMap.set(String(ex.id), ex))

    workouts.forEach((w) => {
      const ex = exMap.get(String(w.exerciseId))
      const parts = ex?.bodyParts || []
      const points = w.points ?? w.total_points ?? 0
      const sets = w.sets || 1
      const reps = w.reps || 0
      const exName = w.exerciseName || ex?.name || "Exercise"

      // Attribute volume to each body part
      const targetedKeys = new Set<string>()
      parts.forEach((p) => {
        const norm = normalizeBodyPart(p)
        if (stats[norm]) targetedKeys.add(norm)
      })

      // Fallback: match by workout/exercise name
      if (targetedKeys.size === 0) {
        const nameLower = exName.toLowerCase()
        if (nameLower.includes("push") || nameLower.includes("bench") || nameLower.includes("chest") || nameLower.includes("dip")) targetedKeys.add("chest")
        if (nameLower.includes("pull") || nameLower.includes("row") || nameLower.includes("chin") || nameLower.includes("lat")) targetedKeys.add("lats")
        if (nameLower.includes("squat") || nameLower.includes("leg press") || nameLower.includes("lunge")) targetedKeys.add("quads")
        if (nameLower.includes("curl") && !nameLower.includes("leg")) targetedKeys.add("biceps")
        if (nameLower.includes("plank") || nameLower.includes("crunch") || nameLower.includes("situp") || nameLower.includes("ab")) targetedKeys.add("core")
        if (nameLower.includes("deadlift") || nameLower.includes("hinge")) {
          targetedKeys.add("hamstrings")
          targetedKeys.add("lower back")
        }
      }

      targetedKeys.forEach((key) => {
        const item = stats[key]
        item.sets += sets
        item.reps += reps
        item.points += points

        const existingEx = item.exercises.find((e) => e.name === exName)
        if (existingEx) {
          existingEx.sets += sets
          existingEx.reps += reps
        } else {
          item.exercises.push({ name: exName, sets, reps })
        }
      })
    })

    // Calculate max sets for normalized heatmap intensity (0 to 1)
    const maxSets = Math.max(1, ...Object.values(stats).map((s) => s.sets))
    Object.values(stats).forEach((s) => {
      if (s.sets > 0) {
        s.intensity = Math.min(1, Math.max(0.2, s.sets / maxSets))
      } else {
        s.intensity = 0
      }
    })

    return stats
  }, [workouts, exercises])

  // Get color for a muscle based on its intensity (Animated Workout Heatmap: Gray -> Yellow -> Orange -> Red)
  const getFillColor = (slug: string, isHovered: boolean, isSelected: boolean) => {
    if (NEUTRAL_SLUGS.has(slug)) {
      if (slug === "hair") return "#16181d"
      if (slug === "head") return "#232730"
      return "#1f222a"
    }

    const muscleKey = slugToMuscleKey(slug)
    if (!muscleKey) return "#22252e"

    const stat = muscleStats[muscleKey]
    const intensity = stat?.intensity ?? 0

    if (isSelected) {
      return intensity > 0 ? "#ef4444" : "#3b82f6"
    }
    if (isHovered) {
      return intensity > 0 ? "#fb923c" : "#4b5563"
    }

    if (intensity === 0) {
      return "#22252e" // Neutral dark body fill
    }

    // Smooth workout color scale (no glow, crisp fills)
    if (intensity < 0.35) {
      return "#eab308" // Yellow (Light activation)
    } else if (intensity < 0.7) {
      return "#f97316" // Orange (Moderate activation)
    } else {
      return "#ef4444" // Red (High activation)
    }
  }

  const getStrokeColor = (slug: string, isHovered: boolean, isSelected: boolean) => {
    if (isSelected) return "#ffffff"
    if (isHovered) return "#94a3b8"
    if (NEUTRAL_SLUGS.has(slug)) return "#2e3340"
    return "#333846"
  }

  const selectedStat = muscleStats[selectedMuscle] || muscleStats.chest

  // Filter primary parts (no overlapping subgroups)
  const frontParts = useMemo(
    () => MALE_FRONT_PARTS.filter((p) => !SUBGROUP_SLUGS.has(p.slug)),
    []
  )
  const backParts = useMemo(
    () => MALE_BACK_PARTS.filter((p) => !SUBGROUP_SLUGS.has(p.slug)),
    []
  )

  const renderPart = (part: BodyPartPaths, index: number) => {
    const isNeutral = NEUTRAL_SLUGS.has(part.slug)
    const muscleKey = slugToMuscleKey(part.slug)
    const isSelected = !!muscleKey && selectedMuscle === muscleKey
    const isHovered = !!muscleKey && hoveredMuscle === muscleKey

    const fill = getFillColor(part.slug, isHovered, isSelected)
    const stroke = getStrokeColor(part.slug, isHovered, isSelected)
    const strokeWidth = isSelected ? 2.5 : isHovered ? 1.8 : 0.8

    return (
      <g
        key={`${part.slug}-${index}`}
        className={isNeutral ? "pointer-events-none" : "cursor-pointer"}
        onClick={() => {
          if (muscleKey) {
            setSelectedMuscle(muscleKey)
          }
        }}
        onMouseEnter={() => {
          if (muscleKey) setHoveredMuscle(muscleKey)
        }}
        onMouseLeave={() => {
          if (muscleKey) setHoveredMuscle(null)
        }}
      >
        {part.allPaths.map((d, pIdx) => (
          <path
            key={pIdx}
            d={d}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            style={{
              transition: "fill 0.35s ease, stroke 0.2s ease, stroke-width 0.2s ease",
            }}
          />
        ))}
      </g>
    )
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-5">
      {/* Header & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">Male Anatomical Muscle Map</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              Colpan Male Engine
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interactive anatomical heatmap visualizing muscle group activation from logged volume
          </p>
        </div>

        {/* View Switcher: Both, Front, Back */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-secondary/50 p-1 rounded-xl border border-border/60">
          <button
            onClick={() => setActiveView("both")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === "both"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Both Views
          </button>
          <button
            onClick={() => setActiveView("front")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === "front"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Front (Anterior)
          </button>
          <button
            onClick={() => setActiveView("back")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === "back"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Back (Posterior)
          </button>
        </div>
      </div>

      {/* Main Grid: Body Map + Muscle Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Anatomical Models Container */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-[#0e1015] border border-border/60">
          <div className={`w-full flex ${activeView === "both" ? "flex-row justify-center gap-4 sm:gap-8" : "justify-center"} items-center`}>
            {/* Anterior (Front) View */}
            {(activeView === "both" || activeView === "front") && (
              <div className="flex flex-col items-center flex-1 max-w-[280px]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Front (Anterior)
                </span>
                <svg
                  viewBox={MALE_FRONT_VIEWBOX}
                  className="w-full h-auto select-none max-h-[460px]"
                >
                  {frontParts.map(renderPart)}
                </svg>
              </div>
            )}

            {/* Posterior (Back) View */}
            {(activeView === "both" || activeView === "back") && (
              <div className="flex flex-col items-center flex-1 max-w-[280px]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Back (Posterior)
                </span>
                <svg
                  viewBox={MALE_BACK_VIEWBOX}
                  className="w-full h-auto select-none max-h-[460px]"
                >
                  {backParts.map(renderPart)}
                </svg>
              </div>
            )}
          </div>

          {/* Color Intensity Scale Legend */}
          <div className="flex items-center gap-4 pt-6 text-[11px] text-muted-foreground flex-wrap justify-center border-t border-border/30 w-full mt-4">
            <span className="font-semibold text-foreground/80">Activation Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-[#22252e] border border-[#333846]" />
              <span>Unworked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-[#eab308]" />
              <span>Light (1-4 sets)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-[#f97316]" />
              <span>Moderate (5-9 sets)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-[#ef4444]" />
              <span>High (10+ sets)</span>
            </div>
          </div>
        </div>

        {/* Selected Muscle Detail Inspector */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                  {selectedStat.category.toUpperCase()}
                </span>
                <h4 className="text-lg font-bold tracking-tight text-foreground mt-1.5">
                  {selectedStat.name}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">View</span>
                <span className="text-xs font-semibold text-foreground capitalize">
                  {selectedStat.view}
                </span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-2.5 rounded-xl bg-background/80 border border-border/50">
                <span className="text-[10px] text-muted-foreground block font-medium">Sets</span>
                <span className="text-lg font-black text-foreground">{selectedStat.sets}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-background/80 border border-border/50">
                <span className="text-[10px] text-muted-foreground block font-medium">Reps</span>
                <span className="text-lg font-black text-foreground">{selectedStat.reps}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-background/80 border border-border/50">
                <span className="text-[10px] text-muted-foreground block font-medium">Points</span>
                <span className="text-lg font-black text-primary">{selectedStat.points}</span>
              </div>
            </div>

            {/* Targeted Exercises List */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Dumbbell className="h-3.5 w-3.5" />
                Targeted Exercises Logged
              </span>
              {selectedStat.exercises.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 p-4 text-center bg-background/40">
                  <p className="text-xs text-muted-foreground">
                    No workouts logged for {selectedStat.name} yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedStat.exercises.map((ex, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-background/70 border border-border/40 text-xs"
                    >
                      <span className="font-semibold text-foreground truncate max-w-[170px]">
                        {ex.name}
                      </span>
                      <span className="text-muted-foreground font-medium shrink-0">
                        {ex.sets} sets · {ex.reps} reps
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Muscle Select Chips */}
          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3.5">
            <span className="text-xs font-semibold text-muted-foreground block mb-2.5">
              Quick Select Muscle Group:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(muscleStats).map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSelectedMuscle(s.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedMuscle === s.key
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {s.name.split(" ")[0]}
                  {s.sets > 0 && ` (${s.sets})`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
