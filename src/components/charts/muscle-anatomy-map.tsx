"use client"

import { useState, useMemo } from "react"
import type { Workout, Exercise } from "@/lib/types"
import {
  Dumbbell,
  Flame,
  Activity,
  Info,
  CheckCircle2,
  X,
  BarChart3,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  ChevronRight,
} from "lucide-react"
import { AnimatedFlame, AnimatedDumbbell, AnimatedActivity } from "@/components/ui/animated-icons"
import soundManager from "@/lib/sounds"
import { motion, AnimatePresence } from "framer-motion"
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

// Refined thermal red heatmap scale with sleek dark slate for Untrained
export const RED_HEATMAP_SCALE = [
  { key: "no-workout", label: "Untrained", color: "#1c1f26", stroke: "#2d323e", min: 0, max: 0 },
  { key: "very-low", label: "Light (0–10%)", color: "#4a181d", stroke: "#682329", min: 0, max: 10 },
  { key: "low", label: "Mild (10–40%)", color: "#7f1d1d", stroke: "#991b1b", min: 10, max: 40 },
  { key: "moderate", label: "Moderate (40–70%)", color: "#b91c1c", stroke: "#dc2626", min: 40, max: 70 },
  { key: "high", label: "High (70–90%)", color: "#ef4444", stroke: "#f87171", min: 70, max: 90 },
  { key: "very-high", label: "Max Overload (90–100%)", color: "#ff334b", stroke: "#ff6b7b", min: 90, max: 100 },
] as const

export function getIntensityTier(intensity: number) {
  if (intensity <= 0) {
    return { key: "no-workout", label: "Untrained", bracket: "0%", color: "#1c1f26", stroke: "#2d323e", text: "Untrained" }
  }
  if (intensity <= 0.10) {
    return { key: "very-low", label: "Light", bracket: "0–10%", color: "#4a181d", stroke: "#682329", text: "Light" }
  }
  if (intensity <= 0.40) {
    return { key: "low", label: "Mild", bracket: "10–40%", color: "#7f1d1d", stroke: "#991b1b", text: "Mild" }
  }
  if (intensity <= 0.70) {
    return { key: "moderate", label: "Moderate", bracket: "40–70%", color: "#b91c1c", stroke: "#dc2626", text: "Moderate" }
  }
  if (intensity <= 0.90) {
    return { key: "high", label: "High", bracket: "70–90%", color: "#ef4444", stroke: "#f87171", text: "High" }
  }
  return { key: "very-high", label: "Max Overload", bracket: "90–100%", color: "#ff334b", stroke: "#ff6b7b", text: "Max Overload" }
}

interface MuscleAnatomyMapProps {
  workouts: Workout[]
  exercises: Exercise[]
}

// Sub-groups that overlap with primary groups in standard view
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

// Non-muscle anatomical elements to render in neutral silhouette styling
const NEUTRAL_SLUGS = new Set([
  "head",
  "hair",
  "hands",
  "feet",
  "knees",
  "ankles",
])

// Recommended exercises for each muscle group when untrained
const SUGGESTED_EXERCISES: Record<string, string[]> = {
  chest: ["Bench Press", "Push-ups", "Dips", "Chest Flyes"],
  shoulders: ["Overhead Press", "Lateral Raises", "Face Pulls", "Pike Push-ups"],
  biceps: ["Barbell Curls", "Hammer Curls", "Chin-ups", "Incline Dumbbell Curls"],
  triceps: ["Tricep Dips", "Tricep Pushdowns", "Diamond Push-ups", "Skull Crushers"],
  forearms: ["Bar Hang / Dead Hang", "Wrist Curls", "Farmer's Walk", "Hammer Curls"],
  core: ["Plank Hold", "Hanging Leg Raises", "Ab Wheel", "Crunches"],
  obliques: ["Russian Twists", "Side Planks", "Bicycle Crunches", "Woodchoppers"],
  traps: ["Barbell Shrugs", "Face Pulls", "Farmer's Walk", "Rack Pulls"],
  neck: ["Neck Curls", "Neck Extensions", "Isometric Neck Holds"],
  lats: ["Pull-ups", "Lat Pulldowns", "Barbell Rows", "Inverted Rows"],
  "lower back": ["Romanian Deadlifts", "Hyperextensions", "Bird Dogs", "Good Mornings"],
  glutes: ["Hip Thrusts", "Glute Bridges", "Squats", "Bulgarian Split Squats"],
  quads: ["Barbell Squats", "Leg Press", "Lunges", "Leg Extensions"],
  adductors: ["Sumo Squats", "Cossack Squats", "Side Lunges", "Adductor Machine"],
  hamstrings: ["Romanian Deadlifts (RDL)", "Leg Curls", "Nordic Curls", "Glute Bridges"],
  calves: ["Standing Calf Raises", "Seated Calf Raises", "Jump Rope", "Tibialis Raises"],
}

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
    case "neck":
      return "neck"
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

// Normalize freeform text to canonical muscle key
function normalizeBodyPart(part: string): string {
  const clean = part.toLowerCase().trim()
  if (clean.includes("chest") || clean.includes("pec")) return "chest"
  if (clean.includes("shoulder") || clean.includes("delt")) return "shoulders"
  if (clean.includes("bicep")) return "biceps"
  if (clean.includes("tricep")) return "triceps"
  if (clean.includes("forearm") || clean.includes("grip") || clean.includes("wrist")) return "forearms"
  if (clean.includes("oblique") || clean.includes("serratus")) return "obliques"
  if (clean.includes("core") || clean.includes("abs") || clean.includes("abdom")) return "core"
  if (clean.includes("neck") || clean.includes("cervical")) return "neck"
  if (clean.includes("trap") || clean.includes("upper back")) return "traps"
  if (clean.includes("lower back") || clean.includes("lumbar")) return "lower back"
  if (clean.includes("lat") || clean.includes("back")) return "lats"
  if (clean.includes("glute")) return "glutes"
  if (clean.includes("quad")) return "quads"
  if (clean.includes("hamstring")) return "hamstrings"
  if (clean.includes("calv") || clean.includes("tibialis")) return "calves"
  if (clean.includes("adductor") || clean.includes("inner thigh")) return "adductors"
  return clean
}

// Scientific multi-muscle exercise dictionary for fallback matching
const EXERCISE_TARGET_DICTIONARY: Record<string, { primary: string[]; secondary?: string[] }> = {
  // Push / Chest
  "push up": { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  "push-up": { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  "pushup": { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  "bench press": { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  "chest press": { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  "chest fly": { primary: ["chest"], secondary: ["shoulders"] },
  "incline press": { primary: ["chest", "shoulders"], secondary: ["triceps"] },
  "decline press": { primary: ["chest"], secondary: ["triceps"] },
  "dip": { primary: ["chest", "triceps"], secondary: ["shoulders"] },
  "dips": { primary: ["chest", "triceps"], secondary: ["shoulders"] },

  // Shoulders
  "overhead press": { primary: ["shoulders"], secondary: ["triceps", "traps"] },
  "shoulder press": { primary: ["shoulders"], secondary: ["triceps", "traps"] },
  "military press": { primary: ["shoulders"], secondary: ["triceps", "traps"] },
  "lateral raise": { primary: ["shoulders"], secondary: ["traps"] },
  "front raise": { primary: ["shoulders"], secondary: ["chest"] },
  "rear delt": { primary: ["shoulders"], secondary: ["traps", "lats"] },
  "face pull": { primary: ["shoulders", "traps"], secondary: ["lats"] },
  "arnold press": { primary: ["shoulders"], secondary: ["triceps"] },
  "pike push": { primary: ["shoulders"], secondary: ["triceps", "core"] },

  // Pull / Lats / Back
  "pull up": { primary: ["lats"], secondary: ["biceps", "forearms", "traps"] },
  "pull-up": { primary: ["lats"], secondary: ["biceps", "forearms", "traps"] },
  "pullup": { primary: ["lats"], secondary: ["biceps", "forearms", "traps"] },
  "chin up": { primary: ["lats", "biceps"], secondary: ["forearms"] },
  "chin-up": { primary: ["lats", "biceps"], secondary: ["forearms"] },
  "lat pull": { primary: ["lats"], secondary: ["biceps", "traps"] },
  "row": { primary: ["lats", "traps"], secondary: ["biceps", "lower back"] },
  "barbell row": { primary: ["lats", "traps"], secondary: ["biceps", "lower back"] },
  "dumbbell row": { primary: ["lats", "traps"], secondary: ["biceps"] },
  "cable row": { primary: ["lats", "traps"], secondary: ["biceps"] },
  "shrug": { primary: ["traps"], secondary: ["neck"] },
  "hang": { primary: ["forearms"], secondary: ["lats", "shoulders"] },
  "bar hang": { primary: ["forearms"], secondary: ["lats", "shoulders"] },
  "dead hang": { primary: ["forearms"], secondary: ["lats", "shoulders"] },

  // Legs / Glutes / Calves
  "squat": { primary: ["quads", "glutes"], secondary: ["hamstrings", "core"] },
  "leg press": { primary: ["quads"], secondary: ["glutes"] },
  "lunge": { primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"] },
  "split squat": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  "leg extension": { primary: ["quads"] },
  "deadlift": { primary: ["hamstrings", "glutes", "lower back"], secondary: ["traps", "forearms"] },
  "romanian deadlift": { primary: ["hamstrings", "glutes"], secondary: ["lower back"] },
  "rdl": { primary: ["hamstrings", "glutes"], secondary: ["lower back"] },
  "leg curl": { primary: ["hamstrings"], secondary: ["calves"] },
  "hip thrust": { primary: ["glutes"], secondary: ["hamstrings"] },
  "glute bridge": { primary: ["glutes"], secondary: ["hamstrings", "lower back"] },
  "calf raise": { primary: ["calves"] },

  // Arms
  "bicep curl": { primary: ["biceps"], secondary: ["forearms"] },
  "hammer curl": { primary: ["biceps", "forearms"] },
  "preacher curl": { primary: ["biceps"] },
  "curl": { primary: ["biceps"], secondary: ["forearms"] },
  "tricep pushdown": { primary: ["triceps"] },
  "tricep extension": { primary: ["triceps"] },
  "skull crusher": { primary: ["triceps"] },
  "wrist curl": { primary: ["forearms"] },

  // Core
  "plank": { primary: ["core"], secondary: ["obliques", "shoulders"] },
  "crunch": { primary: ["core"] },
  "sit up": { primary: ["core"] },
  "sit-up": { primary: ["core"] },
  "leg raise": { primary: ["core"] },
  "russian twist": { primary: ["obliques"], secondary: ["core"] },
  "side plank": { primary: ["obliques"], secondary: ["core"] },
}

export function MuscleAnatomyMap({ workouts, exercises }: MuscleAnatomyMapProps) {
  const [activeView, setActiveView] = useState<"both" | "front" | "back">("both")
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<"all" | "trained" | "untrained">("all")

  // Compute accurate stats per muscle group
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
      neck: { key: "neck", name: "Neck (Cervical)", view: "both", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      lats: { key: "lats", name: "Latissimus Dorsi", view: "back", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      "lower back": { key: "lower back", name: "Lower Back", view: "back", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      glutes: { key: "glutes", name: "Gluteals", view: "back", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      quads: { key: "quads", name: "Quadriceps", view: "front", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      adductors: { key: "adductors", name: "Adductors (Inner Thigh)", view: "both", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      hamstrings: { key: "hamstrings", name: "Hamstrings", view: "back", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
      calves: { key: "calves", name: "Calves & Tibialis", view: "both", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0 },
    }

    const exIdMap = new Map<string, Exercise>()
    const exNameMap = new Map<string, Exercise>()
    exercises.forEach((ex) => {
      exIdMap.set(String(ex.id), ex)
      if (ex.name) exNameMap.set(ex.name.toLowerCase().trim(), ex)
    })

    workouts.forEach((w) => {
      const ex = exIdMap.get(String(w.exerciseId)) || (w.exerciseName ? exNameMap.get(w.exerciseName.toLowerCase().trim()) : undefined)
      const parts = ex?.bodyParts || []
      const points = w.points ?? w.total_points ?? 0
      const sets = w.sets || 1
      const reps = w.reps || 0
      const exName = w.exerciseName || ex?.name || "Exercise"
      const nameLower = exName.toLowerCase().trim()

      const targetedKeys = new Set<string>()

      // 1. Direct match from exercise bodyParts
      parts.forEach((p) => {
        const norm = normalizeBodyPart(p)
        if (stats[norm]) targetedKeys.add(norm)
      })

      // 2. Lookup in exercise target dictionary
      if (targetedKeys.size === 0) {
        for (const [key, mapping] of Object.entries(EXERCISE_TARGET_DICTIONARY)) {
          if (nameLower.includes(key)) {
            mapping.primary.forEach((m) => stats[m] && targetedKeys.add(m))
            break
          }
        }
      }

      // 3. Fallback to split classification if still not matched
      if (targetedKeys.size === 0 && ex?.split) {
        const split = ex.split.toLowerCase()
        if (split === "push") {
          targetedKeys.add("chest")
          targetedKeys.add("shoulders")
        } else if (split === "pull") {
          targetedKeys.add("lats")
        } else if (split === "legs") {
          targetedKeys.add("quads")
        } else if (split === "core") {
          targetedKeys.add("core")
        } else if (split === "arms") {
          targetedKeys.add("biceps")
          targetedKeys.add("triceps")
        }
      }

      // Attribute sets, reps, and points
      targetedKeys.forEach((key) => {
        const item = stats[key]
        item.sets += sets
        item.reps += reps
        item.points += points

        const existingEx = item.exercises.find((e) => e.name.toLowerCase() === exName.toLowerCase())
        if (existingEx) {
          existingEx.sets += sets
          existingEx.reps += reps
        } else {
          item.exercises.push({ name: exName, sets, reps })
        }
      })
    })

    // Mathematical Normalization for Heatmap Intensity (0 to 1):
    // If a user has 0 workouts, all intensity is 0.
    // If maxSets is low (< 3), scale relative to 3 sets to avoid 1 set showing as 100% max overload.
    // Once maxSets >= 3, direct linear ratio represents relative muscular load.
    const allSets = Object.values(stats).map((s) => s.sets)
    const maxSets = Math.max(0, ...allSets)
    const scaleBase = Math.max(maxSets, 3)

    Object.values(stats).forEach((s) => {
      if (s.sets > 0 && maxSets > 0) {
        s.intensity = Math.min(1, Number((s.sets / scaleBase).toFixed(3)))
      } else {
        s.intensity = 0
      }
    })

    return stats
  }, [workouts, exercises])

  // Intensity color according to refined thermal red scale + dark slate for Untrained
  const getIntensityColor = (intensity: number) => {
    if (intensity <= 0) return "#1c1f26"    // Sleek Dark Slate for Untrained
    if (intensity <= 0.10) return "#4a181d" // Light (0–10%)
    if (intensity <= 0.40) return "#7f1d1d" // Mild (10–40%)
    if (intensity <= 0.70) return "#b91c1c" // Moderate (40–70%)
    if (intensity <= 0.90) return "#ef4444" // High (70–90%)
    return "#ff334b"                         // Max Overload (90–100%)
  }

  // Get fill color for an SVG body part
  const getFillColor = (slug: string, isHovered: boolean, isSelected: boolean) => {
    if (NEUTRAL_SLUGS.has(slug)) {
      return "#101217"
    }

    const muscleKey = slugToMuscleKey(slug)
    if (!muscleKey) return "#101217"

    const stat = muscleStats[muscleKey]
    const intensity = stat?.intensity ?? 0

    if (isSelected) {
      return intensity > 0 ? "#ef4444" : "#2d323f"
    }
    if (isHovered) {
      return intensity > 0 ? "#f87171" : "#262a34"
    }

    return getIntensityColor(intensity)
  }

  // Get contour stroke color for crisp anatomical definition
  const getStrokeColor = (slug: string, isHovered: boolean, isSelected: boolean) => {
    if (isSelected) return "#ef4444"
    if (isHovered) return "#f87171"

    const muscleKey = slugToMuscleKey(slug)
    const intensity = muscleKey ? muscleStats[muscleKey]?.intensity ?? 0 : 0

    // Neutral non-muscle anatomical parts (head, hands, feet) keep dark slate outline
    if (NEUTRAL_SLUGS.has(slug)) {
      return "#232731"
    }

    // Unworked muscles get subtle dark seam outline
    if (intensity <= 0) {
      return "#2a2f3a"
    }

    // High and very-high active muscles get glowing distinct red borders
    if (intensity > 0.70) return "#f87171"
    if (intensity > 0.40) return "#ef4444"
    return "#991b1b"
  }

  // Active inspected muscle (hover takes temporary preview precedence, selected locks it)
  const activeKey = hoveredMuscle || selectedMuscle
  const activeInspectedStat = activeKey ? muscleStats[activeKey] : null
  const activeInspectedTier = activeInspectedStat ? getIntensityTier(activeInspectedStat.intensity) : null

  // Summary statistics for "Trained vs Untrained" presentation
  const trainedStats = useMemo(() => {
    const list = Object.values(muscleStats)
    const trained = list.filter((s) => s.sets > 0)
    const untrained = list.filter((s) => s.sets === 0)
    const totalSets = list.reduce((sum, s) => sum + s.sets, 0)
    const totalReps = list.reduce((sum, s) => sum + s.reps, 0)
    const totalPoints = list.reduce((sum, s) => sum + s.points, 0)
    const trainedCount = trained.length
    const trainedPct = Math.round((trainedCount / list.length) * 100)

    const topMuscles = [...trained].sort((a, b) => b.sets - a.sets).slice(0, 5)

    return {
      trained,
      untrained,
      trainedCount,
      untrainedCount: untrained.length,
      trainedPct,
      totalSets,
      totalReps,
      totalPoints,
      topMuscles,
    }
  }, [muscleStats])

  // Filter primary parts (excludes sub-slices to prevent overlap)
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

    const stat = muscleKey ? muscleStats[muscleKey] : null
    const isTrained = (stat?.sets ?? 0) > 0

    // Filter mode dimming/highlighting
    let opacityClass = "opacity-100"
    if (filterMode === "trained" && !isNeutral && !isTrained) {
      opacityClass = "opacity-20"
    } else if (filterMode === "untrained" && !isNeutral && isTrained) {
      opacityClass = "opacity-25"
    }

    const fill = getFillColor(part.slug, isHovered, isSelected)
    const stroke = getStrokeColor(part.slug, isHovered, isSelected)
    const strokeWidth = isSelected ? 2.6 : isHovered ? 2.0 : isTrained ? 1.4 : 1.1

    return (
      <g
        key={`${part.slug}-${index}`}
        className={`${isNeutral ? "pointer-events-none" : "cursor-pointer"} ${opacityClass} transition-opacity duration-200`}
        onClick={() => {
          if (muscleKey) {
            soundManager.play("click", 0.35)
            setSelectedMuscle((prev) => (prev === muscleKey ? null : muscleKey))
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
            strokeLinecap="round"
            style={{
              filter: isTrained
                ? stat && stat.intensity > 0.7
                  ? "drop-shadow(0 0 5px rgba(254, 30, 38, 0.45))"
                  : "drop-shadow(0 0 2px rgba(253, 95, 95, 0.2))"
                : undefined,
              transition: "fill 0.25s ease, stroke 0.2s ease, stroke-width 0.2s ease",
            }}
          />
        ))}
      </g>
    )
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-5">
      {/* Header & Controls: Title & View Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <AnimatedFlame className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">Muscle Map & Heatmap</h3>
            <p className="text-[11px] text-muted-foreground">
              Anatomical activation & volume distribution
            </p>
          </div>
        </div>

        {/* View Switcher: Both, Front, Back */}
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveView("both")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === "both"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Both Views
          </button>
          <button
            onClick={() => setActiveView("front")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === "front"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Front (Anterior)
          </button>
          <button
            onClick={() => setActiveView("back")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === "back"
                ? "bg-background text-foreground shadow-xs"
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
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-5 sm:p-7 min-h-[560px] rounded-2xl bg-gradient-to-b from-[#14141a] via-[#101015] to-[#0d0d12] border border-border/70 relative overflow-hidden shadow-inner">
          {/* Subtle ambient gradient backdrop */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)]" />

          {/* Minimal Status Header */}
          <div className="w-full flex items-center justify-between gap-2 mb-3 px-1 z-10">
            <div className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-semibold text-foreground">
                {trainedStats.trainedCount} of 16
              </span>
              <span className="text-muted-foreground text-[11px]">muscles active ({trainedStats.trainedPct}%)</span>
            </div>

            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Click muscle to inspect
            </span>
          </div>

          {/* Live Interactive Hover HUD */}
          <div className="w-full min-h-[36px] mb-2 flex items-center justify-center z-10">
            {activeInspectedStat && activeInspectedTier ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-background/95 border border-border/80 shadow-md text-xs backdrop-blur-md transition-all animate-in fade-in duration-150">
                <span
                  className="h-2.5 w-2.5 rounded-sm border border-white/20 shadow-xs shrink-0"
                  style={{ backgroundColor: activeInspectedTier.color }}
                />
                <span className="font-bold text-foreground">{activeInspectedStat.name}</span>
                <span className="text-muted-foreground">·</span>
                {activeInspectedStat.sets > 0 ? (
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <span className="text-primary font-bold">{activeInspectedStat.sets} sets</span>
                    <span className="text-muted-foreground">({activeInspectedStat.reps} reps)</span>
                    <span
                      className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider text-white shadow-xs"
                      style={{ backgroundColor: activeInspectedTier.color }}
                    >
                      {activeInspectedTier.label} ({Math.round(activeInspectedStat.intensity * 100)}%)
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-[#1c1f26] border border-border/80 shadow-2xs" />
                    Untrained (0 sets)
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Info className="h-3 w-3 text-muted-foreground/80" />
                Hover or click any muscle to inspect volume and activation
              </span>
            )}
          </div>

          {/* SVG Body Mannequins */}
          <div className="w-full [perspective:1000px] z-10">
            <AnimatePresence mode="wait">
              {activeView === "both" ? (
                <motion.div
                  key="both"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25 }}
                  className="w-full flex flex-row justify-center gap-4 sm:gap-8 items-center"
                >
                  {/* Anterior (Front) View */}
                  <div className="flex flex-col items-center flex-1 max-w-[310px]">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Front (Anterior)
                    </span>
                    <svg
                      viewBox={MALE_FRONT_VIEWBOX}
                      className="w-full h-auto select-none max-h-[520px]"
                    >
                      {frontParts.map(renderPart)}
                    </svg>
                  </div>

                  {/* Posterior (Back) View */}
                  <div className="flex flex-col items-center flex-1 max-w-[310px]">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Back (Posterior)
                    </span>
                    <svg
                      viewBox={MALE_BACK_VIEWBOX}
                      className="w-full h-auto select-none max-h-[520px]"
                    >
                      {backParts.map(renderPart)}
                    </svg>
                  </div>
                </motion.div>
              ) : activeView === "front" ? (
                <motion.div
                  key="front"
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -90, opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="w-full flex justify-center items-center"
                >
                  <div className="flex flex-col items-center flex-1 max-w-[350px]">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Front (Anterior)
                    </span>
                    <svg
                      viewBox={MALE_FRONT_VIEWBOX}
                      className="w-full h-auto select-none max-h-[550px]"
                    >
                      {frontParts.map(renderPart)}
                    </svg>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="back"
                  initial={{ rotateY: -90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: 90, opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="w-full flex justify-center items-center"
                >
                  <div className="flex flex-col items-center flex-1 max-w-[350px]">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Back (Posterior)
                    </span>
                    <svg
                      viewBox={MALE_BACK_VIEWBOX}
                      className="w-full h-auto select-none max-h-[550px]"
                    >
                      {backParts.map(renderPart)}
                    </svg>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Color Intensity Scale Legend */}
          <div className="flex items-center justify-center gap-2.5 pt-4 border-t border-border/30 w-full mt-3 z-10 text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground">Untrained</span>
            <div className="flex items-center gap-1.5">
              {RED_HEATMAP_SCALE.map((item) => (
                <div
                  key={item.key}
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-[4px] border shadow-2xs transition-transform hover:scale-110 cursor-pointer"
                  style={{
                    backgroundColor: item.color,
                    borderColor: item.color === "#1c1f26" ? "#2d323e" : item.stroke,
                  }}
                  title={item.label}
                />
              ))}
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">Max Overload</span>
          </div>
        </div>

        {/* Selected Muscle Detail Inspector or Full Body Overview */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {selectedMuscle && muscleStats[selectedMuscle] ? (
              <motion.div
                key={selectedMuscle}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-border/60 bg-secondary/30 p-4 sm:p-5 space-y-4 shadow-xs"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                        {muscleStats[selectedMuscle].category.toUpperCase()}
                      </span>
                      {muscleStats[selectedMuscle].sets > 0 ? (
                        <span
                          className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md text-white shadow-xs"
                          style={{
                            backgroundColor: getIntensityTier(muscleStats[selectedMuscle].intensity).color,
                          }}
                        >
                          {getIntensityTier(muscleStats[selectedMuscle].intensity).label} ({Math.round(muscleStats[selectedMuscle].intensity * 100)}%)
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#1c1f26] text-muted-foreground border border-border/60">
                          Untrained
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg font-bold tracking-tight text-foreground mt-1.5">
                      {muscleStats[selectedMuscle].name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        soundManager.play("click", 0.3)
                        setSelectedMuscle(null)
                      }}
                      title="Close Inspector"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Heat Intensity Gauge */}
                <div className="p-3 rounded-xl bg-background/80 border border-border/50 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <AnimatedActivity className="h-3.5 w-3.5 text-primary" />
                      Relative Heat Intensity
                    </span>
                    <span className="font-bold text-foreground">
                      {muscleStats[selectedMuscle].sets > 0
                        ? `${Math.round(muscleStats[selectedMuscle].intensity * 100)}% (${getIntensityTier(muscleStats[selectedMuscle].intensity).label})`
                        : "0% (Untrained)"}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(muscleStats[selectedMuscle].sets > 0 ? 5 : 0, Math.round(muscleStats[selectedMuscle].intensity * 100))}%`,
                        backgroundColor: getIntensityColor(muscleStats[selectedMuscle].intensity),
                      }}
                    />
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block font-medium">Logged Sets</span>
                    <span className="text-lg font-black text-foreground">
                      {muscleStats[selectedMuscle].sets}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block font-medium">Total Reps</span>
                    <span className="text-lg font-black text-foreground">
                      {muscleStats[selectedMuscle].reps}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block font-medium">Points</span>
                    <span className="text-lg font-black text-primary">
                      {muscleStats[selectedMuscle].points}
                    </span>
                  </div>
                </div>

                {/* Exercises logged for this muscle */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <AnimatedDumbbell className="h-3.5 w-3.5 text-primary" />
                    Exercises Stimulating This Muscle
                  </span>

                  {muscleStats[selectedMuscle].exercises.length > 0 ? (
                    <>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-none">
                        {muscleStats[selectedMuscle].exercises.map((ex, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-background/70 border border-border/40 text-xs"
                          >
                            <span className="font-semibold text-foreground">{ex.name}</span>
                            <span className="text-muted-foreground font-medium">
                              <span className="text-foreground font-bold">{ex.sets} sets</span> ({ex.reps} reps)
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/70 p-3.5 bg-background/40 space-y-2.5">
                      <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>No workouts logged for {muscleStats[selectedMuscle].name}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        This muscle has 0 sets in the current time period. Recommended exercises to activate this group:
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {(SUGGESTED_EXERCISES[selectedMuscle] || []).map((rec, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-secondary/80 text-foreground/80 border border-border/50"
                          >
                            {rec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="all-overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-border/60 bg-secondary/30 p-4 sm:p-5 space-y-4 shadow-xs"
              >
                <div className="border-b border-border/40 pb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">
                      Anatomy Activation Overview
                    </h4>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Click any muscle on the mannequin
                  </span>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block font-medium">Trained</span>
                    <span className="text-lg font-black text-[#ef4444]">
                      {trainedStats.trainedCount} <span className="text-xs font-normal text-muted-foreground">/ 16</span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block font-medium">Total Sets</span>
                    <span className="text-lg font-black text-foreground">
                      {trainedStats.totalSets}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block font-medium">Points</span>
                    <span className="text-lg font-black text-primary">
                      {trainedStats.totalPoints}
                    </span>
                  </div>
                </div>

                {/* Top Activated Muscles */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Top Worked Muscles
                    </span>
                    <span className="text-[10px] text-muted-foreground">Ranked by volume</span>
                  </div>

                  {trainedStats.topMuscles.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 p-4 text-center bg-background/40">
                      <p className="text-xs text-muted-foreground">
                        No muscle volume logged yet. Start a workout to light up the map!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-none">
                      {trainedStats.topMuscles.map((m) => {
                        const pct = Math.round((m.sets / Math.max(1, trainedStats.totalSets)) * 100)
                        const tier = getIntensityTier(m.intensity)
                        return (
                          <div
                            key={m.key}
                            onClick={() => {
                              soundManager.play("click", 0.35)
                              setSelectedMuscle(m.key)
                            }}
                            className="p-2.5 rounded-xl bg-background/70 border border-border/40 text-xs cursor-pointer hover:border-primary/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-semibold text-foreground flex items-center gap-1.5">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: tier.color }}
                                />
                                {m.name}
                              </span>
                              <span className="text-muted-foreground font-medium">
                                <span className="text-foreground font-bold">{m.sets} sets</span> ({pct}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.round(m.intensity * 100)}%`,
                                  backgroundColor: getIntensityColor(m.intensity),
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Untrained Muscles List */}
                {trainedStats.untrained.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      Untrained Muscles ({trainedStats.untrainedCount})
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {trainedStats.untrained.map((u) => (
                        <button
                          key={u.key}
                          onClick={() => {
                            soundManager.play("click", 0.3)
                            setSelectedMuscle(u.key)
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-background/60 hover:bg-background text-muted-foreground hover:text-foreground border border-border/50 transition-colors cursor-pointer"
                        >
                          {u.name.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
