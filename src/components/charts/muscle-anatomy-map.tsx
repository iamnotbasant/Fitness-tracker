"use client"

import { useState, useMemo } from "react"
import type { Workout, Exercise } from "@/lib/types"
import { X, Dumbbell } from "lucide-react"
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

// Strict white monochrome heatmap scale (zinc-900 to bright white)
export const WHITE_HEATMAP_SCALE = [
  { key: "no-workout", label: "0%", bracket: "0%", color: "#18181b", stroke: "#27272a", text: "#71717a", min: 0, max: 0 },
  { key: "very-low", label: "1–10%", bracket: "1–10%", color: "#27272a", stroke: "#3f3f46", text: "#a1a1aa", min: 1, max: 10 },
  { key: "low", label: "11–40%", bracket: "11–40%", color: "#3f3f46", stroke: "#52525b", text: "#d4d4d8", min: 11, max: 40 },
  { key: "moderate", label: "41–70%", bracket: "41–70%", color: "#52525b", stroke: "#71717a", text: "#e4e4e7", min: 41, max: 70 },
  { key: "high", label: "71–90%", bracket: "71–90%", color: "#a1a1aa", stroke: "#d4d4d8", text: "#ffffff", min: 71, max: 90 },
  { key: "very-high", label: "91–100%", bracket: "91–100%", color: "#ffffff", stroke: "#ffffff", text: "#ffffff", min: 91, max: 100 },
] as const

export function getWhiteIntensityTier(intensity: number) {
  if (intensity <= 0) return WHITE_HEATMAP_SCALE[0]
  if (intensity <= 0.10) return WHITE_HEATMAP_SCALE[1]
  if (intensity <= 0.40) return WHITE_HEATMAP_SCALE[2]
  if (intensity <= 0.70) return WHITE_HEATMAP_SCALE[3]
  if (intensity <= 0.90) return WHITE_HEATMAP_SCALE[4]
  return WHITE_HEATMAP_SCALE[5]
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
  shoulders: ["Pike Push-ups", "Handstand Hold", "Elevated Pike"],
  biceps: ["Chin-ups", "Close-grip Pull-ups", "Inverted Rows"],
  triceps: ["Tricep Dips", "Diamond Push-ups", "Bench Dips"],
  forearms: ["Dead Hang", "False Grip Hang", "Wrist Curls"],
  core: ["Hanging Leg Raises", "Plank Hold", "Hollow Body Hold", "L-Sit"],
  obliques: ["Side Plank", "Russian Twists", "Windshield Wipers"],
  traps: ["Scapular Pull-ups", "Inverted Rows", "Farmer's Walk"],
  neck: ["Isometric Neck Holds", "Neck Flexion / Extension"],
  lats: ["Pull-ups", "Wide-grip Pull-ups", "Inverted Rows"],
  "lower back": ["Superman Hold", "Bird Dogs", "Back Extensions"],
  glutes: ["Glute Bridges", "Single-leg Hip Thrusts", "Deep Squats"],
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
  const [activeView, setActiveView] = useState<"front" | "back">("front")
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null)

  // Compute stats and percentages per muscle
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

  const getFillColor = (slug: string, isHovered: boolean, isSelected: boolean) => {
    if (NEUTRAL_SLUGS.has(slug)) return "#09090b"

    const muscleKey = slugToMuscleKey(slug)
    if (!muscleKey) return "#09090b"

    const stat = muscleStats[muscleKey]
    const intensity = stat?.intensity ?? 0
    const tier = getWhiteIntensityTier(intensity)

    if (isSelected) return "#ffffff"
    if (isHovered) return intensity > 0 ? "#e4e4e7" : "#27272a"

    return tier.color
  }

  const getStrokeColor = (slug: string, isHovered: boolean, isSelected: boolean) => {
    if (isSelected) return "#ffffff"
    if (isHovered) return "#e4e4e7"

    const muscleKey = slugToMuscleKey(slug)
    const intensity = muscleKey ? muscleStats[muscleKey]?.intensity ?? 0 : 0
    const tier = getWhiteIntensityTier(intensity)

    if (NEUTRAL_SLUGS.has(slug)) return "#18181b"
    return tier.stroke
  }

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

    const fill = getFillColor(part.slug, isHovered, isSelected)
    const stroke = getStrokeColor(part.slug, isHovered, isSelected)
    const strokeWidth = isSelected ? 2.5 : isHovered ? 1.8 : isTrained ? 1.2 : 0.8

    return (
      <g
        key={`${part.slug}-${index}`}
        className={`${isNeutral ? "pointer-events-none" : "cursor-pointer"} transition-all duration-150`}
        onClick={() => {
          if (muscleKey) {
            soundManager.play("click", 0.3)
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

  // Floating Numeric % Badge Pin on SVG (Strict Monochrome)
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
    const tier = getWhiteIntensityTier(stat.intensity)

    return (
      <g
        key={`badge-${muscleKey}-${x}-${y}`}
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer select-none"
        onClick={() => {
          soundManager.play("click", 0.3)
          setSelectedMuscle((prev) => (prev === muscleKey ? null : muscleKey))
        }}
        onMouseEnter={() => setHoveredMuscle(muscleKey)}
        onMouseLeave={() => setHoveredMuscle(null)}
      >
        {/* Background Capsule Pill */}
        <rect
          x="-36"
          y="-12"
          width="72"
          height="24"
          rx="12"
          ry="12"
          fill={isSelected ? "#27272a" : "#09090b"}
          stroke={isSelected ? "#ffffff" : isHovered ? "#e4e4e7" : tier.stroke}
          strokeWidth={isSelected ? "2" : "1"}
        />
        {/* Swatch Dot */}
        <circle
          cx="-24"
          cy="0"
          r="3"
          fill={tier.color === "#18181b" ? "#3f3f46" : tier.color}
        />
        {/* Label & Numeric Percentage */}
        <text
          x="-14"
          y="3.5"
          fill={isSelected ? "#ffffff" : "#d4d4d8"}
          fontSize="9.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          {label} {pct}%
        </text>
      </g>
    )
  }

  // Sorted muscle list for simple progress bar rows
  const sortedMuscles = useMemo(() => {
    return Object.values(muscleStats).sort((a, b) => {
      if (b.intensity !== a.intensity) return b.intensity - a.intensity
      if (b.sets !== a.sets) return b.sets - a.sets
      return a.name.localeCompare(b.name)
    })
  }, [muscleStats])

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6 shadow-sm space-y-6">
      {/* ─── Top Control Strip: Title & Front/Back Toggle ─── */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-zinc-800 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight">Muscles</h2>
          <p className="text-[11px] text-zinc-500 font-mono">White-intensity activation map</p>
        </div>

        {/* Front / Back Toggle */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              setActiveView("front")
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeView === "front"
                ? "bg-white text-black shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              setActiveView("back")
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeView === "back"
                ? "bg-white text-black shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Back
          </button>
        </div>
      </div>

      {/* ─── Anatomy Figure SVG Canvas ─── */}
      <div className="w-full flex justify-center py-2 relative">
        <AnimatePresence mode="wait">
          {activeView === "front" ? (
            <motion.div
              key="front"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-[340px] flex flex-col items-center"
            >
              <svg
                viewBox={MALE_FRONT_VIEWBOX}
                className="w-full h-auto select-none max-h-[460px]"
              >
                {frontParts.map(renderPart)}
                {/* Clear Numeric % Labels over Front Muscles */}
                {renderSvgNumericBadge("chest", 363.5, 365, "Pec")}
                {renderSvgNumericBadge("shoulders", 215, 320, "Delt")}
                {renderSvgNumericBadge("biceps", 160, 440, "Arm")}
                {renderSvgNumericBadge("core", 363.5, 520, "Abs")}
                {renderSvgNumericBadge("obliques", 265, 590, "Obl")}
                {renderSvgNumericBadge("quads", 310, 800, "Quad")}
                {renderSvgNumericBadge("calves", 300, 1080, "Calf")}
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-[340px] flex flex-col items-center"
            >
              <svg
                viewBox={MALE_BACK_VIEWBOX}
                className="w-full h-auto select-none max-h-[460px]"
              >
                {backParts.map(renderPart)}
                {/* Clear Numeric % Labels over Back Muscles */}
                {renderSvgNumericBadge("traps", 1081.5, 290, "Trap")}
                {renderSvgNumericBadge("lats", 1025, 470, "Lat")}
                {renderSvgNumericBadge("triceps", 915, 430, "Tri")}
                {renderSvgNumericBadge("lower back", 1081.5, 600, "Low")}
                {renderSvgNumericBadge("glutes", 1030, 715, "Glut")}
                {renderSvgNumericBadge("hamstrings", 1025, 870, "Ham")}
                {renderSvgNumericBadge("calves", 1025, 1080, "Calf")}
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Labeled Legend in Greys/White ─── */}
      <div className="pt-3 border-t border-zinc-800">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">Intensity Legend</span>
          <span className="text-[11px] text-zinc-500 font-mono">Relative load scale</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {WHITE_HEATMAP_SCALE.map((item) => (
            <div
              key={item.key}
              className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs"
            >
              <span
                className="h-3 w-3 rounded-xs shrink-0 border"
                style={{
                  backgroundColor: item.color,
                  borderColor: item.stroke,
                }}
              />
              <span className="font-mono text-zinc-300 text-[11px] truncate">{item.bracket}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Tap Muscle → Contributing Exercises Panel ─── */}
      <AnimatePresence>
        {selectedMuscle && muscleStats[selectedMuscle] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-zinc-700 bg-zinc-950 p-4 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {muscleStats[selectedMuscle].name}
                </h3>
                <span className="text-xs font-mono text-zinc-400">
                  {Math.round(muscleStats[selectedMuscle].intensity * 100)}% load · {muscleStats[selectedMuscle].sets} sets logged
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMuscle(null)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {muscleStats[selectedMuscle].exercises.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {muscleStats[selectedMuscle].exercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
                  >
                    <span className="text-zinc-200 font-medium truncate mr-2">{ex.name}</span>
                    <span className="font-mono text-zinc-400 shrink-0">
                      {ex.sets}s {ex.reps > 0 ? `· ${ex.reps}r` : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 space-y-1.5 pt-1">
                <p>No logged sets yet. Target exercises:</p>
                <div className="flex flex-wrap gap-1.5">
                  {(SUGGESTED_EXERCISES[selectedMuscle] || []).map((ex, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px]"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── SIMPLE LIST: Muscle Group Name + White Progress Bar + % ─── */}
      <div className="pt-2 border-t border-zinc-800 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-zinc-500 font-mono uppercase tracking-wider pb-1">
          <span>Muscle Group</span>
          <span>Load</span>
        </div>

        <div className="space-y-2">
          {sortedMuscles.map((muscle) => {
            const pct = Math.round(muscle.intensity * 100)
            const isSelected = selectedMuscle === muscle.key

            return (
              <div
                key={muscle.key}
                onClick={() => {
                  soundManager.play("click", 0.25)
                  setSelectedMuscle((prev) => (prev === muscle.key ? null : muscle.key))
                }}
                className={`p-2.5 rounded-xl transition-all cursor-pointer flex flex-col gap-1.5 border ${
                  isSelected
                    ? "bg-zinc-800/80 border-white/40"
                    : "bg-zinc-950/60 border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium truncate ${isSelected ? "text-white font-bold" : "text-zinc-200"}`}>
                    {muscle.name}
                  </span>
                  <div className="flex items-baseline gap-2 font-mono shrink-0 ml-2">
                    <span className="text-zinc-500 text-[11px]">{muscle.sets} sets</span>
                    <span className="text-white font-bold text-xs">{pct}%</span>
                  </div>
                </div>

                {/* White Progress Bar */}
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(pct, muscle.sets > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
