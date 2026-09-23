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
  if (clean.includes("core") || clean.includes("abs") || clean.includes("abdom")) return "core"
  if (clean.includes("chest") || clean.includes("pec")) return "chest"
  if (clean.includes("shoulder") || clean.includes("delt")) return "shoulders"
  if (clean.includes("bicep")) return "biceps"
  if (clean.includes("tricep")) return "triceps"
  if (clean.includes("forearm") || clean.includes("grip") || clean.includes("wrist")) return "forearms"
  if (clean.includes("oblique") || clean.includes("serratus")) return "obliques"
  if (clean.includes("neck") || clean.includes("cervical")) return "neck"
  if (clean.includes("trap") || clean.includes("upper back")) return "traps"
  if (clean.includes("lower back") || clean.includes("lumbar")) return "lower back"
  if (clean.includes("lat") || clean.includes("back")) return "lats"
  if (clean.includes("glute") || clean.includes("abductor")) return "glutes"
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

      let primaryKeys: string[] = []
      let secondaryKeys: string[] = []

      // 1. PRIMARY SOURCE OF TRUTH: User's explicitly chosen body parts on the exercise
      if (parts && parts.length > 0) {
        primaryKeys = Array.from(new Set(
          parts
            .map((p) => normalizeBodyPart(p))
            .filter((p) => !!stats[p])
        ))
        // User explicitly configured these parts; do not add unwanted secondary muscles
      } else {
        // 2. Fallback to precise exercise target dictionary
        for (const [key, mapping] of Object.entries(EXERCISE_TARGET_DICTIONARY)) {
          if (nameLower.includes(key)) {
            primaryKeys = mapping.primary.filter((m) => !!stats[m])
            secondaryKeys = (mapping.secondary || []).filter((m) => !!stats[m])
            break
          }
        }

        // 3. Fallback to split classification if still not matched
        if (primaryKeys.length === 0 && ex?.split) {
          const split = ex.split.toLowerCase()
          if (split === "push") primaryKeys = ["chest", "shoulders", "triceps"]
          else if (split === "pull") primaryKeys = ["lats", "biceps"]
          else if (split === "legs") primaryKeys = ["quads", "glutes"]
          else if (split === "core") primaryKeys = ["core"]
          else if (split === "arms") primaryKeys = ["biceps", "triceps"]
        }
      }

      // Attribute to primary target muscles (1.0x volume, sets, reps, points)
      primaryKeys.forEach((key) => {
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

      // Attribute to secondary assisting muscles (stabilizers get fractional intensity volume)
      secondaryKeys.forEach((key) => {
        if (primaryKeys.includes(key)) return
        const item = stats[key]
        const assistingSets = Math.max(1, Math.round(sets * 0.5))
        item.sets += assistingSets
        item.reps += Math.round(reps * 0.5)
        item.points += Math.round(points * 0.5)

        const existingEx = item.exercises.find((e) => e.name.toLowerCase() === exName.toLowerCase())
        if (existingEx) {
          existingEx.sets += assistingSets
          existingEx.reps += Math.round(reps * 0.5)
        } else {
          item.exercises.push({ name: exName, sets: assistingSets, reps: Math.round(reps * 0.5) })
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

  // Real totals calculated directly from workouts without double counting across muscles
  const actualTotalSets = useMemo(() => workouts.reduce((sum, w) => sum + (w.sets || 1), 0), [workouts])
  const actualTotalPoints = useMemo(() => workouts.reduce((sum, w) => sum + (w.points ?? w.total_points ?? 0), 0), [workouts])
  const actualTotalReps = useMemo(() => workouts.reduce((sum, w) => sum + (w.reps || 0), 0), [workouts])

  // Summary statistics for "Trained vs Untrained" presentation
  const trainedStats = useMemo(() => {
    const list = Object.values(muscleStats)
    const trained = list.filter((s) => s.sets > 0)
    const untrained = list.filter((s) => s.sets === 0)
    const trainedCount = trained.length
    const trainedPct = Math.round((trainedCount / list.length) * 100)

    const topMuscles = [...trained].sort((a, b) => b.sets - a.sets).slice(0, 6)

    return {
      trained,
      untrained,
      trainedCount,
      untrainedCount: untrained.length,
      trainedPct,
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
            }}
          />
        ))}
      </g>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP CONTAINER: Anatomical Mascot Hero */}
      <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-[#14141a] via-[#101015] to-[#0d0d12] p-4 sm:p-6 shadow-sm relative overflow-hidden">
        {/* Ambient subtle glow */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(239,68,68,0.06)_0%,_transparent_65%)]" />

        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4 mb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <AnimatedFlame className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">Muscle Map & Heatmap</h3>
              <p className="text-xs text-muted-foreground">
                Anatomical activation & volume distribution
              </p>
            </div>
          </div>

          {/* View Switcher: Both, Front, Back */}
          <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
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

        {/* Interactive Live HUD Pill */}
        <div className="w-full min-h-[42px] mb-3 flex items-center justify-center relative z-10">
          {activeInspectedStat && activeInspectedTier ? (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-background/95 border border-border/80 shadow-lg text-xs backdrop-blur-md transition-all"
            >
              <span
                className="h-2.5 w-2.5 rounded-sm border border-white/20 shadow-xs shrink-0"
                style={{ backgroundColor: activeInspectedTier.color }}
              />
              <span className="font-bold text-foreground text-sm">{activeInspectedStat.name}</span>
              <span className="text-muted-foreground">·</span>
              {activeInspectedStat.sets > 0 ? (
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <span className="text-primary font-bold">{activeInspectedStat.sets} sets</span>
                  <span className="text-muted-foreground">({activeInspectedStat.reps} reps)</span>
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white shadow-xs"
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
            </motion.div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-secondary/40 border border-border/40 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>
                <strong className="text-foreground">{trainedStats.trainedCount} of 16</strong> muscles active ({trainedStats.trainedPct}%)
              </span>
              <span className="text-muted-foreground/60">·</span>
              <span>Click any muscle to inspect focus below</span>
            </div>
          )}
        </div>

        {/* Anatomical SVGs Canvas */}
        <div className="w-full [perspective:1000px] relative z-10 flex justify-center py-2">
          <AnimatePresence mode="wait">
            {activeView === "both" ? (
              <motion.div
                key="both"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-3xl flex flex-row justify-center gap-6 sm:gap-14 items-center"
              >
                {/* Front (Anterior) */}
                <div className="flex flex-col items-center flex-1 max-w-[340px]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
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

                {/* Back (Posterior) */}
                <div className="flex flex-col items-center flex-1 max-w-[340px]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-md flex justify-center items-center"
              >
                <div className="flex flex-col items-center flex-1 max-w-[360px]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Front (Anterior)
                  </span>
                  <svg
                    viewBox={MALE_FRONT_VIEWBOX}
                    className="w-full h-auto select-none max-h-[540px]"
                  >
                    {frontParts.map(renderPart)}
                  </svg>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="back"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-md flex justify-center items-center"
              >
                <div className="flex flex-col items-center flex-1 max-w-[360px]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Back (Posterior)
                  </span>
                  <svg
                    viewBox={MALE_BACK_VIEWBOX}
                    className="w-full h-auto select-none max-h-[540px]"
                  >
                    {backParts.map(renderPart)}
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Clean Heatmap Scale Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-border/40 w-full mt-4 relative z-10 text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Untrained</span>
          <div className="flex items-center gap-1.5">
            {RED_HEATMAP_SCALE.map((item) => (
              <div
                key={item.key}
                className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-[4px] border shadow-2xs transition-transform hover:scale-115 cursor-pointer"
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

      {/* 2. BOTTOM CONTAINER: Activation & Muscular Focus Details (Spacious Full Width) */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm">
        <AnimatePresence mode="wait">
          {selectedMuscle && muscleStats[selectedMuscle] ? (
            /* Selected Muscle Focus Inspector */
            <motion.div
              key={selectedMuscle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Header with Title and Close Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                      {muscleStats[selectedMuscle].category.toUpperCase()}
                    </span>
                    {muscleStats[selectedMuscle].sets > 0 ? (
                      <span
                        className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-md text-white shadow-xs"
                        style={{
                          backgroundColor: getIntensityTier(muscleStats[selectedMuscle].intensity).color,
                        }}
                      >
                        {getIntensityTier(muscleStats[selectedMuscle].intensity).label} ({Math.round(muscleStats[selectedMuscle].intensity * 100)}%)
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-md bg-[#1c1f26] text-muted-foreground border border-border/60">
                        Untrained (0 sets)
                      </span>
                    )}
                  </div>
                  <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-2">
                    {muscleStats[selectedMuscle].name}
                  </h4>
                </div>

                <button
                  onClick={() => {
                    soundManager.play("click", 0.3)
                    setSelectedMuscle(null)
                  }}
                  className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-border/60 bg-secondary/50 hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Back to Overview
                </button>
              </div>

              {/* Heat Intensity Bar */}
              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                    <AnimatedActivity className="h-4 w-4 text-primary" />
                    Relative Muscular Load Intensity
                  </span>
                  <span className="font-bold text-foreground">
                    {muscleStats[selectedMuscle].sets > 0
                      ? `${Math.round(muscleStats[selectedMuscle].intensity * 100)}% · ${getIntensityTier(muscleStats[selectedMuscle].intensity).label}`
                      : "0% · Untrained"}
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(muscleStats[selectedMuscle].sets > 0 ? 5 : 0, Math.round(muscleStats[selectedMuscle].intensity * 100))}%`,
                      backgroundColor: getIntensityColor(muscleStats[selectedMuscle].intensity),
                    }}
                  />
                </div>
              </div>

              {/* Clean Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-secondary/20 border border-border/40">
                  <span className="text-[11px] text-muted-foreground block font-medium">Logged Sets</span>
                  <span className="text-xl font-bold text-foreground mt-0.5 block">
                    {muscleStats[selectedMuscle].sets}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-secondary/20 border border-border/40">
                  <span className="text-[11px] text-muted-foreground block font-medium">Total Reps</span>
                  <span className="text-xl font-bold text-foreground mt-0.5 block">
                    {muscleStats[selectedMuscle].reps}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-secondary/20 border border-border/40">
                  <span className="text-[11px] text-muted-foreground block font-medium">Muscle Load</span>
                  <span className="text-xl font-bold text-primary mt-0.5 block">
                    {Math.round(muscleStats[selectedMuscle].intensity * 100)}%
                  </span>
                </div>
              </div>

              {/* Exercises Stimulating This Muscle */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <AnimatedDumbbell className="h-3.5 w-3.5 text-primary" />
                  Exercises ({muscleStats[selectedMuscle].exercises.length})
                </span>

                {muscleStats[selectedMuscle].exercises.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {muscleStats[selectedMuscle].exercises.map((ex, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/20 border border-border/40"
                      >
                        <span className="font-medium text-foreground text-xs truncate mr-2">{ex.name}</span>
                        <span className="font-bold text-foreground text-xs shrink-0">
                          {ex.sets} sets {ex.reps > 0 ? `· ${ex.reps} reps` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/60 p-4 bg-secondary/10 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      No workouts logged for this muscle yet. Suggested exercises:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {(SUGGESTED_EXERCISES[selectedMuscle] || []).map((rec, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg text-xs font-medium bg-secondary text-foreground border border-border/40"
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
            /* Full Body Activation Overview (Default) - Ultra-Clean Minimal */
            <motion.div
              key="all-overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* Clean Minimal Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <h4 className="text-sm font-semibold tracking-tight text-foreground">
                    Active Muscular Focus
                  </h4>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {trainedStats.trainedCount > 0 ? `${trainedStats.trainedCount} trained · ${actualTotalSets} sets` : "No workouts logged"}
                </span>
              </div>

              {trainedStats.topMuscles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 py-8 px-4 text-center bg-secondary/10">
                  <p className="text-xs text-muted-foreground">
                    No exercises logged yet. Log a workout to illuminate your anatomy map!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {trainedStats.topMuscles.map((m) => {
                    const tier = getIntensityTier(m.intensity)
                    return (
                      <div
                        key={m.key}
                        onClick={() => {
                          soundManager.play("click", 0.3)
                          setSelectedMuscle(m.key)
                        }}
                        className="group p-3 rounded-xl border border-border/50 bg-secondary/25 hover:bg-secondary/45 hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: tier.color }}
                          />
                          <span className="font-semibold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {m.name.split(" ")[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-foreground">
                            {m.sets} sets
                          </span>
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-white shadow-2xs"
                            style={{ backgroundColor: tier.color }}
                          >
                            {tier.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
