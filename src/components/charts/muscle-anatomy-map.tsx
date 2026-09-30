"use client"

import { useState, useMemo } from "react"
import type { Workout, Exercise } from "@/lib/types"
import {
  X,
  Sparkles,
  Info,
  ChevronRight,
  Filter,
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
  intensity: number // 0 to 1 relative load
  volumePercent: number // 0 to 100% share of total training sets
}

// Refined thermal red heatmap scale with sleek dark slate for Untrained
export const RED_HEATMAP_SCALE = [
  { key: "no-workout", label: "Untrained", bracket: "0%", color: "#1c1f26", stroke: "#2d323e", min: 0, max: 0 },
  { key: "very-low", label: "Light", bracket: "1–10%", color: "#4a181d", stroke: "#682329", min: 1, max: 10 },
  { key: "low", label: "Mild", bracket: "11–40%", color: "#7f1d1d", stroke: "#991b1b", min: 11, max: 40 },
  { key: "moderate", label: "Moderate", bracket: "41–70%", color: "#b91c1c", stroke: "#dc2626", min: 41, max: 70 },
  { key: "high", label: "High", bracket: "71–90%", color: "#ef4444", stroke: "#f87171", min: 71, max: 90 },
  { key: "very-high", label: "Max Overload", bracket: "91–100%", color: "#ff334b", stroke: "#ff6b7b", min: 91, max: 100 },
] as const

export function getIntensityTier(intensity: number) {
  if (intensity <= 0) {
    return { key: "no-workout", label: "Untrained", bracket: "0%", color: "#1c1f26", stroke: "#2d323e", text: "Untrained" }
  }
  if (intensity <= 0.10) {
    return { key: "very-low", label: "Light", bracket: "1–10%", color: "#4a181d", stroke: "#682329", text: "Light" }
  }
  if (intensity <= 0.40) {
    return { key: "low", label: "Mild", bracket: "11–40%", color: "#7f1d1d", stroke: "#991b1b", text: "Mild" }
  }
  if (intensity <= 0.70) {
    return { key: "moderate", label: "Moderate", bracket: "41–70%", color: "#b91c1c", stroke: "#dc2626", text: "Moderate" }
  }
  if (intensity <= 0.90) {
    return { key: "high", label: "High", bracket: "71–90%", color: "#ef4444", stroke: "#f87171", text: "High" }
  }
  return { key: "very-high", label: "Max Overload", bracket: "91–100%", color: "#ff334b", stroke: "#ff6b7b", text: "Max Overload" }
}

interface MuscleAnatomyMapProps {
  workouts: Workout[]
  exercises: Exercise[]
}

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

const NEUTRAL_SLUGS = new Set([
  "head",
  "hair",
  "hands",
  "feet",
  "knees",
  "ankles",
])

const SUGGESTED_EXERCISES: Record<string, string[]> = {
  chest: ["Push-ups", "Dips", "Archer Push-ups", "Diamond Push-ups"],
  shoulders: ["Pike Push-ups", "Handstand Hold", "Elevated Pike", "Lateral Raises"],
  biceps: ["Chin-ups", "Close-grip Pull-ups", "Inverted Rows (Underhand)"],
  triceps: ["Tricep Dips", "Diamond Push-ups", "Bench Dips", "Tricep Extensions"],
  forearms: ["Dead Hang", "False Grip Hang", "Wrist Curls", "Towel Pull-ups"],
  core: ["Hanging Leg Raises", "Plank Hold", "Hollow Body Hold", "L-Sit"],
  obliques: ["Side Plank", "Russian Twists", "Windshield Wipers"],
  traps: ["Scapular Pull-ups", "Inverted Rows", "Farmer's Walk", "Shrugs"],
  neck: ["Isometric Neck Holds", "Neck Flexion / Extension"],
  lats: ["Pull-ups", "Wide-grip Pull-ups", "Inverted Rows", "Lat Pulldowns"],
  "lower back": ["Superman Hold", "Bird Dogs", "Back Extensions", "Bridge Hold"],
  glutes: ["Glute Bridges", "Single-leg Hip Thrusts", "Deep Squats", "Step-ups"],
  quads: ["Bodyweight Squats", "Pistol Squats", "Sissy Squats", "Lunges"],
  adductors: ["Cossack Squats", "Side Lunges", "Adductor Plank"],
  hamstrings: ["Nordic Curls", "Single-leg Deadlifts", "Glute-Ham Bridges"],
  calves: ["Standing Calf Raises", "Single-leg Calf Raises", "Jump Rope"],
}

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

const EXERCISE_TARGET_DICTIONARY: Record<string, { primary: string[]; secondary?: string[] }> = {
  "push up": { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  "push-up": { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  "pushup": { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  "bench press": { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  "chest fly": { primary: ["chest"], secondary: ["shoulders"] },
  "dip": { primary: ["chest", "triceps"], secondary: ["shoulders"] },
  "dips": { primary: ["chest", "triceps"], secondary: ["shoulders"] },
  "overhead press": { primary: ["shoulders"], secondary: ["triceps", "traps"] },
  "pike push": { primary: ["shoulders"], secondary: ["triceps", "core"] },
  "handstand": { primary: ["shoulders"], secondary: ["triceps", "core"] },
  "lateral raise": { primary: ["shoulders"], secondary: ["traps"] },
  "pull up": { primary: ["lats"], secondary: ["biceps", "forearms", "traps"] },
  "pull-up": { primary: ["lats"], secondary: ["biceps", "forearms", "traps"] },
  "pullup": { primary: ["lats"], secondary: ["biceps", "forearms", "traps"] },
  "chin up": { primary: ["lats", "biceps"], secondary: ["forearms"] },
  "chin-up": { primary: ["lats", "biceps"], secondary: ["forearms"] },
  "lat pull": { primary: ["lats"], secondary: ["biceps", "traps"] },
  "row": { primary: ["lats", "traps"], secondary: ["biceps", "lower back"] },
  "bar hang": { primary: ["forearms"], secondary: ["lats"] },
  "dead hang": { primary: ["forearms"], secondary: ["lats"] },
  "squat": { primary: ["quads", "glutes"], secondary: ["hamstrings", "core"] },
  "pistol squat": { primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"] },
  "lunge": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  "leg raise": { primary: ["core"], secondary: ["obliques"] },
  "plank": { primary: ["core"], secondary: ["shoulders", "obliques"] },
  "crunch": { primary: ["core"] },
  "bicep curl": { primary: ["biceps"], secondary: ["forearms"] },
  "tricep extension": { primary: ["triceps"] },
  "calf raise": { primary: ["calves"] },
}

export function MuscleAnatomyMap({ workouts, exercises }: MuscleAnatomyMapProps) {
  const [activeView, setActiveView] = useState<"both" | "front" | "back">("both")
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<"all" | "trained" | "untrained">("all")

  // Compute stats and numeric percentages per muscle
  const muscleStats = useMemo(() => {
    const stats: Record<string, MuscleStat> = {
      chest: { key: "chest", name: "Pectorals (Chest)", view: "front", category: "push", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      shoulders: { key: "shoulders", name: "Deltoids (Shoulders)", view: "both", category: "push", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      biceps: { key: "biceps", name: "Biceps", view: "front", category: "arms", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      triceps: { key: "triceps", name: "Triceps", view: "back", category: "arms", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      forearms: { key: "forearms", name: "Forearms", view: "both", category: "arms", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      core: { key: "core", name: "Abdominals (Core)", view: "front", category: "core", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      obliques: { key: "obliques", name: "Obliques", view: "front", category: "core", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      traps: { key: "traps", name: "Trapezius (Upper Back)", view: "back", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      neck: { key: "neck", name: "Neck (Cervical)", view: "both", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      lats: { key: "lats", name: "Latissimus Dorsi (Lats)", view: "back", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      "lower back": { key: "lower back", name: "Lower Back", view: "back", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      glutes: { key: "glutes", name: "Gluteals", view: "back", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      quads: { key: "quads", name: "Quadriceps", view: "front", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      adductors: { key: "adductors", name: "Adductors", view: "both", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      hamstrings: { key: "hamstrings", name: "Hamstrings", view: "back", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      calves: { key: "calves", name: "Calves & Tibialis", view: "both", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
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
      const sets = Math.max(1, w.sets || 1)
      const reps = w.reps || 0
      const exName = w.exerciseName || ex?.name || "Exercise"
      const nameLower = exName.toLowerCase().trim()

      let primaryKeys: string[] = []
      let secondaryKeys: string[] = []

      if (parts && parts.length > 0) {
        primaryKeys = Array.from(new Set(
          parts.map((p) => normalizeBodyPart(p)).filter((p) => !!stats[p])
        ))
      } else {
        for (const [key, mapping] of Object.entries(EXERCISE_TARGET_DICTIONARY)) {
          if (nameLower.includes(key)) {
            primaryKeys = mapping.primary.filter((m) => !!stats[m])
            secondaryKeys = (mapping.secondary || []).filter((m) => !!stats[m])
            break
          }
        }

        if (primaryKeys.length === 0 && ex?.split) {
          const split = ex.split.toLowerCase()
          if (split === "push") primaryKeys = ["chest", "shoulders", "triceps"]
          else if (split === "pull") primaryKeys = ["lats", "biceps"]
          else if (split === "legs") primaryKeys = ["quads", "glutes"]
          else if (split === "core") primaryKeys = ["core"]
          else if (split === "arms") primaryKeys = ["biceps", "triceps"]
        }
      }

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

    const allSets = Object.values(stats).map((s) => s.sets)
    const totalSetsSum = allSets.reduce((sum, v) => sum + v, 0)
    const maxSets = Math.max(0, ...allSets)
    const scaleBase = Math.max(maxSets, 3)

    Object.values(stats).forEach((s) => {
      if (s.sets > 0 && maxSets > 0) {
        s.intensity = Math.min(1, Number((s.sets / scaleBase).toFixed(3)))
        s.volumePercent = totalSetsSum > 0 ? Math.round((s.sets / totalSetsSum) * 100) : 0
      } else {
        s.intensity = 0
        s.volumePercent = 0
      }
    })

    return stats
  }, [workouts, exercises])

  const getIntensityColor = (intensity: number) => {
    if (intensity <= 0) return "#1c1f26"
    if (intensity <= 0.10) return "#4a181d"
    if (intensity <= 0.40) return "#7f1d1d"
    if (intensity <= 0.70) return "#b91c1c"
    if (intensity <= 0.90) return "#ef4444"
    return "#ff334b"
  }

  const getFillColor = (slug: string, isHovered: boolean, isSelected: boolean) => {
    if (NEUTRAL_SLUGS.has(slug)) return "#0f1116"

    const muscleKey = slugToMuscleKey(slug)
    if (!muscleKey) return "#0f1116"

    const stat = muscleStats[muscleKey]
    const intensity = stat?.intensity ?? 0

    if (isSelected) return intensity > 0 ? "#ef4444" : "#2d323f"
    if (isHovered) return intensity > 0 ? "#f87171" : "#262a34"

    return getIntensityColor(intensity)
  }

  const getStrokeColor = (slug: string, isHovered: boolean, isSelected: boolean) => {
    if (isSelected) return "#ffffff"
    if (isHovered) return "#f87171"

    const muscleKey = slugToMuscleKey(slug)
    const intensity = muscleKey ? muscleStats[muscleKey]?.intensity ?? 0 : 0

    if (NEUTRAL_SLUGS.has(slug)) return "#20242e"
    if (intensity <= 0) return "#2a2f3a"
    if (intensity > 0.70) return "#f87171"
    if (intensity > 0.40) return "#ef4444"
    return "#991b1b"
  }

  const activeKey = hoveredMuscle || selectedMuscle
  const activeInspectedStat = activeKey ? muscleStats[activeKey] : null
  const activeInspectedTier = activeInspectedStat ? getIntensityTier(activeInspectedStat.intensity) : null

  const trainedStats = useMemo(() => {
    const list = Object.values(muscleStats)
    const trained = list.filter((s) => s.sets > 0)
    const untrained = list.filter((s) => s.sets === 0)
    const trainedCount = trained.length
    const trainedPct = Math.round((trainedCount / list.length) * 100)
    const sorted = [...list].sort((a, b) => b.sets - a.sets || b.volumePercent - a.volumePercent)

    return {
      all: sorted,
      trained,
      untrained,
      trainedCount,
      untrainedCount: untrained.length,
      trainedPct,
    }
  }, [muscleStats])

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

    let opacityClass = "opacity-100"
    if (filterMode === "trained" && !isNeutral && !isTrained) {
      opacityClass = "opacity-25"
    } else if (filterMode === "untrained" && !isNeutral && isTrained) {
      opacityClass = "opacity-25"
    }

    const fill = getFillColor(part.slug, isHovered, isSelected)
    const stroke = getStrokeColor(part.slug, isHovered, isSelected)
    const strokeWidth = isSelected ? 2.8 : isHovered ? 2.0 : isTrained ? 1.4 : 1.0

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
          />
        ))}
      </g>
    )
  }

  // Floating Numeric % Badge Pin on SVG
  const renderSvgNumericBadge = (
    muscleKey: string,
    x: number,
    y: number,
    label: string
  ) => {
    const stat = muscleStats[muscleKey]
    if (!stat) return null

    const isSelected = selectedMuscle === muscleKey
    const isHovered = hoveredMuscle === muscleKey
    const pct = Math.round(stat.intensity * 100)
    const isTrained = stat.sets > 0
    const tier = getIntensityTier(stat.intensity)

    return (
      <g
        key={`badge-${muscleKey}-${x}-${y}`}
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer select-none"
        onClick={() => {
          soundManager.play("click", 0.35)
          setSelectedMuscle((prev) => (prev === muscleKey ? null : muscleKey))
        }}
        onMouseEnter={() => setHoveredMuscle(muscleKey)}
        onMouseLeave={() => setHoveredMuscle(null)}
      >
        {/* Background Capsule Pill */}
        <rect
          x="-38"
          y="-13"
          width="76"
          height="26"
          rx="13"
          ry="13"
          fill={isSelected ? "#1e212b" : "#0d0f14"}
          stroke={isSelected ? "#ffffff" : isHovered ? tier.stroke : tier.color}
          strokeWidth={isSelected ? "2.5" : "1.5"}
          className="transition-all"
        />
        {/* Color Indicator Dot */}
        <circle
          cx="-26"
          cy="0"
          r="4"
          fill={isTrained ? tier.color : "#2d323e"}
        />
        {/* Label & Numeric Percentage */}
        <text
          x="-17"
          y="4"
          fill="#f3f4f6"
          fontSize="11"
          fontWeight="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {isTrained ? `${pct}%` : "0%"}
        </text>
        <text
          x="10"
          y="4"
          fill="#9ca3af"
          fontSize="9"
          fontWeight="medium"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {label}
        </text>
      </g>
    )
  }

  return (
    <div className="space-y-5">
      {/* 1. ANATOMICAL MASCOT HERO CONTAINER */}
      <div className="rounded-3xl border border-border/60 bg-[#0d0e12] p-4 sm:p-6 shadow-sm relative overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4 mb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <AnimatedFlame className="h-5 w-5 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">Muscle Heatmap & Activation</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Numeric %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Anatomical muscular load intensity · Tap any muscle or percentage pin to inspect
              </p>
            </div>
          </div>

          {/* View Switcher: Both, Front, Back */}
          <div className="flex items-center gap-1 bg-[#16171f] p-1 rounded-xl border border-border/50 self-start sm:self-auto">
            <button
              onClick={() => setActiveView("both")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeView === "both"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Both
            </button>
            <button
              onClick={() => setActiveView("front")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeView === "front"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Front
            </button>
            <button
              onClick={() => setActiveView("back")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeView === "back"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Back
            </button>
          </div>
        </div>

        {/* Live HUD Pill displaying exact selection or summary */}
        <div className="w-full min-h-[42px] mb-3 flex items-center justify-center relative z-10">
          {activeInspectedStat && activeInspectedTier ? (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#14151b] border border-border/80 shadow-lg text-xs transition-all"
            >
              <span
                className="h-3 w-3 rounded-full border border-white/20 shrink-0"
                style={{ backgroundColor: activeInspectedTier.color }}
              />
              <span className="font-bold text-foreground text-sm">{activeInspectedStat.name}</span>
              <span className="text-muted-foreground">·</span>
              {activeInspectedStat.sets > 0 ? (
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <span className="font-mono font-bold text-primary">{Math.round(activeInspectedStat.intensity * 100)}% Load</span>
                  <span className="text-muted-foreground">({activeInspectedStat.sets} sets · {activeInspectedStat.volumePercent}% volume)</span>
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: activeInspectedTier.color }}
                  >
                    {activeInspectedTier.label}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#1c1f26] border border-border/80" />
                  Untrained (0% · 0 sets)
                </span>
              )}
            </motion.div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/30 border border-border/40 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>
                <strong className="text-foreground">{trainedStats.trainedCount} of 16</strong> muscles active ({trainedStats.trainedPct}%)
              </span>
              <span className="text-muted-foreground/60">·</span>
              <span>Every muscle displays its exact percentage</span>
            </div>
          )}
        </div>

        {/* Anatomical SVG Canvas with Responsive Figures & Numeric Callout Badges */}
        <div className="w-full flex justify-center py-2 relative z-10">
          <AnimatePresence mode="wait">
            {activeView === "both" ? (
              <motion.div
                key="both"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-3xl flex flex-row justify-center gap-4 sm:gap-12 items-center"
              >
                {/* Front (Anterior) */}
                <div className="flex flex-col items-center flex-1 max-w-[340px]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Front (Anterior)
                  </span>
                  <svg
                    viewBox={MALE_FRONT_VIEWBOX}
                    className="w-full h-auto select-none max-h-[500px]"
                  >
                    {frontParts.map(renderPart)}
                    {/* Explicit Numeric % Callout Badges over Front Anatomy */}
                    {renderSvgNumericBadge("chest", 363.5, 365, "Pec")}
                    {renderSvgNumericBadge("shoulders", 215, 320, "Delt")}
                    {renderSvgNumericBadge("biceps", 160, 440, "Arm")}
                    {renderSvgNumericBadge("core", 363.5, 520, "Abs")}
                    {renderSvgNumericBadge("obliques", 265, 590, "Obl")}
                    {renderSvgNumericBadge("quads", 310, 800, "Quad")}
                    {renderSvgNumericBadge("calves", 300, 1080, "Calf")}
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
                    className="w-full h-auto select-none max-h-[500px]"
                  >
                    {backParts.map(renderPart)}
                    {/* Explicit Numeric % Callout Badges over Back Anatomy */}
                    {renderSvgNumericBadge("traps", 1081.5, 290, "Trap")}
                    {renderSvgNumericBadge("lats", 1025, 470, "Lat")}
                    {renderSvgNumericBadge("triceps", 915, 430, "Tri")}
                    {renderSvgNumericBadge("lower back", 1081.5, 600, "Low")}
                    {renderSvgNumericBadge("glutes", 1030, 715, "Glut")}
                    {renderSvgNumericBadge("hamstrings", 1025, 870, "Ham")}
                    {renderSvgNumericBadge("calves", 1025, 1080, "Calf")}
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
                    className="w-full h-auto select-none max-h-[520px]"
                  >
                    {frontParts.map(renderPart)}
                    {renderSvgNumericBadge("chest", 363.5, 365, "Pec")}
                    {renderSvgNumericBadge("shoulders", 215, 320, "Delt")}
                    {renderSvgNumericBadge("biceps", 160, 440, "Arm")}
                    {renderSvgNumericBadge("core", 363.5, 520, "Abs")}
                    {renderSvgNumericBadge("obliques", 265, 590, "Obl")}
                    {renderSvgNumericBadge("quads", 310, 800, "Quad")}
                    {renderSvgNumericBadge("calves", 300, 1080, "Calf")}
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
                    className="w-full h-auto select-none max-h-[520px]"
                  >
                    {backParts.map(renderPart)}
                    {renderSvgNumericBadge("traps", 1081.5, 290, "Trap")}
                    {renderSvgNumericBadge("lats", 1025, 470, "Lat")}
                    {renderSvgNumericBadge("triceps", 915, 430, "Tri")}
                    {renderSvgNumericBadge("lower back", 1081.5, 600, "Low")}
                    {renderSvgNumericBadge("glutes", 1030, 715, "Glut")}
                    {renderSvgNumericBadge("hamstrings", 1025, 870, "Ham")}
                    {renderSvgNumericBadge("calves", 1025, 1080, "Calf")}
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Labeled Heatmap Scale Legend with Exact Brackets */}
        <div className="pt-4 border-t border-border/40 w-full mt-4 relative z-10 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Muscular Intensity Legend:</span>
            <span className="text-[11px]">Normalized to peak muscle stimulus</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
            {RED_HEATMAP_SCALE.map((item) => (
              <div
                key={item.key}
                className="flex items-center gap-2 p-2 rounded-xl bg-[#14151b] border border-border/50 text-xs"
              >
                <span
                  className="h-3 w-3 rounded-xs shrink-0 border"
                  style={{
                    backgroundColor: item.color,
                    borderColor: item.color === "#1c1f26" ? "#2d323e" : item.stroke,
                  }}
                />
                <div className="min-w-0">
                  <span className="font-bold text-foreground block truncate text-[11px]">{item.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono block">{item.bracket}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MUSCLE BREAKDOWN & DRILLDOWN CONTAINER */}
      <div className="rounded-3xl border border-border/60 bg-[#121318] p-4 sm:p-6 shadow-sm space-y-4">
        <AnimatePresence mode="wait">
          {selectedMuscle && muscleStats[selectedMuscle] ? (
            /* Selected Muscle Focus Card */
            <motion.div
              key={selectedMuscle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Header with Title and Close Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
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
                  <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1.5">
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
                  Close Drilldown
                </button>
              </div>

              {/* Numerical Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-secondary/20 border border-border/40">
                  <span className="text-[11px] text-muted-foreground block font-medium">Logged Sets</span>
                  <span className="text-xl font-black text-foreground mt-0.5 block font-mono">
                    {muscleStats[selectedMuscle].sets} <span className="text-xs text-muted-foreground font-normal">sets</span>
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-secondary/20 border border-border/40">
                  <span className="text-[11px] text-muted-foreground block font-medium">Total Reps</span>
                  <span className="text-xl font-black text-foreground mt-0.5 block font-mono">
                    {muscleStats[selectedMuscle].reps} <span className="text-xs text-muted-foreground font-normal">reps</span>
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-secondary/20 border border-border/40">
                  <span className="text-[11px] text-muted-foreground block font-medium">Volume Share</span>
                  <span className="text-xl font-black text-primary mt-0.5 block font-mono">
                    {muscleStats[selectedMuscle].volumePercent}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-secondary/20 border border-border/40">
                  <span className="text-[11px] text-muted-foreground block font-medium">Muscular Load</span>
                  <span className="text-xl font-black text-emerald-400 mt-0.5 block font-mono">
                    {Math.round(muscleStats[selectedMuscle].intensity * 100)}%
                  </span>
                </div>
              </div>

              {/* Logged Exercises for this Muscle */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <AnimatedDumbbell className="h-3.5 w-3.5 text-primary" />
                  Logged Exercises Contributing to {muscleStats[selectedMuscle].name}
                </span>

                {muscleStats[selectedMuscle].exercises.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {muscleStats[selectedMuscle].exercises.map((ex, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/40"
                      >
                        <span className="font-semibold text-foreground text-xs truncate mr-2">{ex.name}</span>
                        <span className="font-mono font-bold text-foreground text-xs shrink-0">
                          {ex.sets} sets {ex.reps > 0 ? `· ${ex.reps} reps` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/60 p-4 bg-secondary/10 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      No workouts logged for this muscle yet. Recommended calisthenics exercises:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {(SUGGESTED_EXERCISES[selectedMuscle] || []).map((rec, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-secondary/80 text-foreground border border-border/40"
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
            /* Complete Muscle List (Default) with Clear Numeric % */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/40 flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Muscular Volume & Activation Matrix</h4>
                  <p className="text-[11px] text-muted-foreground">Every muscle with its exact numeric % and logged sets</p>
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFilterMode("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      filterMode === "all"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({trainedStats.all.length})
                  </button>
                  <button
                    onClick={() => setFilterMode("trained")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      filterMode === "trained"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Trained ({trainedStats.trainedCount})
                  </button>
                  <button
                    onClick={() => setFilterMode("untrained")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      filterMode === "untrained"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Untrained ({trainedStats.untrainedCount})
                  </button>
                </div>
              </div>

              {/* Grid of all muscles with explicit numeric % */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {(filterMode === "trained"
                  ? trainedStats.trained
                  : filterMode === "untrained"
                  ? trainedStats.untrained
                  : trainedStats.all
                ).map((m) => {
                  const tier = getIntensityTier(m.intensity)
                  const isSelected = selectedMuscle === m.key
                  const pct = Math.round(m.intensity * 100)

                  return (
                    <div
                      key={m.key}
                      onClick={() => {
                        soundManager.play("click", 0.3)
                        setSelectedMuscle(m.key)
                      }}
                      className={`group p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        isSelected
                          ? "bg-secondary/40 border-primary"
                          : "bg-[#16171e] border-border/50 hover:border-primary/40 hover:bg-[#1a1c24]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: tier.color }}
                          />
                          <span className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                            {m.name.split(" ")[0]}
                          </span>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                          {m.category}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-extrabold font-mono text-foreground">
                            {pct}%
                          </span>
                          <span className="text-[10px] text-muted-foreground">load</span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-foreground font-mono">
                            {m.sets} {m.sets === 1 ? "set" : "sets"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
