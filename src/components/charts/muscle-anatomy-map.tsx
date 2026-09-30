"use client"

import { useState, useMemo } from "react"
import type { Workout, Exercise } from "@/lib/types"
import { X, Activity } from "lucide-react"
import soundManager from "@/lib/sounds"
import { motion, AnimatePresence } from "framer-motion"
import {
  ANALYTICS_PALETTE,
  getMuscleCategoryConfig,
  type MuscleCategoryKey,
} from "@/lib/analytics-palette"
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

// Calm desaturated intensity ramp
export const ANATOMY_INTENSITY_SCALE = [
  { key: "none", label: "0%", bracket: "0%", color: "#141418", stroke: "#222228", text: "#71717a" },
  { key: "low", label: "1–25%", bracket: "1–25%", color: "#1c282b", stroke: "#2b3d42", text: "#8b9ea0" },
  { key: "med-low", label: "26–50%", bracket: "26–50%", color: "#253e41", stroke: "#385b60", text: "#a4b9bb" },
  { key: "med-high", label: "51–75%", bracket: "51–75%", color: "#345c5d", stroke: "#4b8284", text: "#c5dad9" },
  { key: "high", label: "76–100%", bracket: "76–100%", color: "#4fa8a0", stroke: "#6fc4bc", text: "#ffffff" },
] as const

// Backwards-compatible export
export const WHITE_HEATMAP_SCALE = ANATOMY_INTENSITY_SCALE
export function getWhiteIntensityTier(intensity: number) {
  if (intensity <= 0) return ANATOMY_INTENSITY_SCALE[0]
  if (intensity <= 0.25) return ANATOMY_INTENSITY_SCALE[1]
  if (intensity <= 0.50) return ANATOMY_INTENSITY_SCALE[2]
  if (intensity <= 0.75) return ANATOMY_INTENSITY_SCALE[3]
  return ANATOMY_INTENSITY_SCALE[4]
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
    const cat = getMuscleCategoryConfig(muscleKey)

    if (isSelected) return cat.hex
    if (isHovered) return intensity > 0 ? cat.stroke : "#1e1e26"
    if (intensity <= 0) return "#141418"

    const alphaHex = Math.round(Math.min(1, Math.max(0.3, intensity)) * 255)
      .toString(16)
      .padStart(2, "0")
    return `${cat.hex}${alphaHex}`
  }

  const getStrokeColor = (slug: string, isHovered: boolean, isSelected: boolean) => {
    if (NEUTRAL_SLUGS.has(slug)) return "#18181b"

    const muscleKey = slugToMuscleKey(slug)
    if (!muscleKey) return "#222228"

    const stat = muscleStats[muscleKey]
    const intensity = stat?.intensity ?? 0
    const cat = getMuscleCategoryConfig(muscleKey)

    if (isSelected) return "#ffffff"
    if (isHovered) return "#ffffff"
    if (intensity <= 0) return "#222228"

    return cat.stroke
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

  // Floating Numeric % Badge Pin on SVG (BIG & Unmissable)
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
    const cat = getMuscleCategoryConfig(muscleKey)
    const isTrained = stat.sets > 0

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
          x="-43"
          y="-14"
          width="86"
          height="28"
          rx="14"
          ry="14"
          fill={isSelected ? "#1c1c24" : "#0c0c10f0"}
          stroke={isSelected ? "#ffffff" : isHovered ? "#ffffff" : isTrained ? cat.stroke : "#27272e"}
          strokeWidth={isSelected ? "2" : isHovered ? "1.8" : "1"}
        />
        {/* Swatch Dot */}
        <circle
          cx="-29"
          cy="0"
          r="3.5"
          fill={isTrained ? cat.hex : "#3f3f46"}
        />
        {/* Label */}
        <text
          x="-21"
          y="-2"
          fill={isSelected ? "#ffffff" : "#a1a1aa"}
          fontSize="8.5"
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
          letterSpacing="0.4"
        >
          {label.toUpperCase()}
        </text>
        {/* BIG & Unmissable % */}
        <text
          x="-21"
          y="9.5"
          fill={isSelected ? "#ffffff" : isTrained ? cat.stroke : "#71717a"}
          fontSize="12.5"
          fontFamily="var(--font-display), Space Grotesk, sans-serif"
          fontWeight="700"
        >
          {pct}%
        </text>
      </g>
    )
  }

  // Sorted muscle list & summary stats
  const { sortedMuscles, topMuscle, activeCount, totalSetsSum } = useMemo(() => {
    const list = Object.values(muscleStats).sort((a, b) => {
      if (b.intensity !== a.intensity) return b.intensity - a.intensity
      if (b.sets !== a.sets) return b.sets - a.sets
      return a.name.localeCompare(b.name)
    })
    const active = list.filter((m) => m.sets > 0)
    const sum = list.reduce((acc, m) => acc + m.sets, 0)
    return {
      sortedMuscles: list,
      topMuscle: active[0] || list[0],
      activeCount: active.length,
      totalSetsSum: sum,
    }
  }, [muscleStats])

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#121216]/90 p-4 sm:p-6 shadow-sm space-y-6">
      {/* ─── Section Header (Consistent Icon + Title) & Front/Back Toggle ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#4fa8a0]/10 border border-[#4fa8a0]/25 text-[#4fa8a0]">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight font-display">Muscles</h2>
            <p className="text-xs text-zinc-400 font-body">Biomechanical load distribution & target volume</p>
          </div>
        </div>

        {/* Front / Back Toggle (Tap >= 44px) */}
        <div className="flex items-center gap-1 bg-[#0c0c10] p-1 rounded-xl border border-white/[0.08] self-start sm:self-auto min-h-[44px]">
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              setActiveView("front")
            }}
            className={`h-9 px-3.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
              activeView === "front"
                ? "bg-[#4fa8a0]/20 text-[#6fc4bc] border border-[#4fa8a0]/40 shadow-xs"
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
            className={`h-9 px-3.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
              activeView === "back"
                ? "bg-[#4fa8a0]/20 text-[#6fc4bc] border border-[#4fa8a0]/40 shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Back
          </button>
        </div>
      </div>

      {/* ─── Hero Metric: Primary Target Focus ─── */}
      <div className="pb-1">
        <span className="text-[11px] font-body uppercase tracking-wider text-zinc-400 block mb-1">
          Primary Focus
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-display tabular-nums">
            {topMuscle && topMuscle.sets > 0
              ? `${topMuscle.name.split(" ")[0]} · ${Math.round(topMuscle.intensity * 100)}%`
              : "No Target Data"}
          </span>
        </div>
        <p className="text-xs text-zinc-400 font-body mt-1">
          <span className="font-display font-semibold tabular-nums text-zinc-300">{activeCount}</span> of 16 muscle groups trained · <span className="font-display font-semibold tabular-nums text-zinc-300">{totalSetsSum}</span> total sets logged
        </p>
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

      {/* ─── Category Swatches + Intensity Legend ─── */}
      <div className="pt-3 border-t border-white/[0.08] space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-body text-[11px] uppercase tracking-wider text-zinc-400">Muscle Categories</span>
          <span className="text-[11px] text-zinc-500 font-body">Muted low-saturation palette</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(
            [
              { cat: "push", label: "Push (Chest, Delts)", hex: ANALYTICS_PALETTE.muscleCategories.push.hex },
              { cat: "pull", label: "Pull (Lats, Traps)", hex: ANALYTICS_PALETTE.muscleCategories.pull.hex },
              { cat: "legs", label: "Legs (Quads, Glutes)", hex: ANALYTICS_PALETTE.muscleCategories.legs.hex },
              { cat: "core", label: "Core (Abs, Obliques)", hex: ANALYTICS_PALETTE.muscleCategories.core.hex },
              { cat: "arms", label: "Arms (Biceps, Triceps)", hex: ANALYTICS_PALETTE.muscleCategories.arms.hex },
            ] as const
          ).map((item) => (
            <div
              key={item.cat}
              className="flex items-center gap-2 p-2 rounded-xl bg-[#0c0c10] border border-white/[0.06] text-xs"
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.hex }}
              />
              <span className="font-body text-zinc-300 text-[11px] truncate">{item.label}</span>
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
            className="rounded-xl border border-white/[0.12] bg-[#0c0c10] p-4 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <div>
                <h3 className="text-sm font-bold text-white font-display">
                  {muscleStats[selectedMuscle].name}
                </h3>
                <span className="text-xs font-display tabular-nums text-zinc-400">
                  {Math.round(muscleStats[selectedMuscle].intensity * 100)}% load · {muscleStats[selectedMuscle].sets} sets logged
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMuscle(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#14141a] border border-white/[0.06] text-xs"
                  >
                    <span className="text-zinc-200 font-medium truncate mr-2 font-body">{ex.name}</span>
                    <span className="font-display tabular-nums text-zinc-400 shrink-0">
                      {ex.sets}s {ex.reps > 0 ? `· ${ex.reps}r` : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 space-y-1.5 pt-1 font-body">
                <p>No logged sets yet. Target exercises:</p>
                <div className="flex flex-wrap gap-1.5">
                  {(SUGGESTED_EXERCISES[selectedMuscle] || []).map((ex, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-[#14141a] border border-white/[0.06] text-zinc-300 text-[11px]"
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

      {/* ─── LIST: Muscle Group with BIG Unmissable % and Category Color Bars ─── */}
      <div className="pt-3 border-t border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-body uppercase tracking-wider pb-1">
          <span>Muscle Group</span>
          <span>Volume Share</span>
        </div>

        <div className="space-y-2">
          {sortedMuscles.map((muscle) => {
            const pct = Math.round(muscle.intensity * 100)
            const isSelected = selectedMuscle === muscle.key
            const cat = getMuscleCategoryConfig(muscle.key)
            const isTrained = muscle.sets > 0

            return (
              <div
                key={muscle.key}
                onClick={() => {
                  soundManager.play("click", 0.25)
                  setSelectedMuscle((prev) => (prev === muscle.key ? null : muscle.key))
                }}
                className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 border min-h-[56px] ${
                  isSelected
                    ? "bg-[#181820] border-white/40 shadow-xs"
                    : "bg-[#0c0c10]/70 border-white/[0.06] hover:border-white/[0.15] hover:bg-[#14141a]"
                }`}
              >
                {/* BIG unmissable percentage on the left */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span
                    className="font-display font-bold text-2xl sm:text-3xl tabular-nums min-w-[3.5rem] text-right shrink-0"
                    style={{ color: isTrained ? cat.stroke : "#71717a" }}
                  >
                    {pct}%
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium text-sm truncate font-body ${isSelected ? "text-white font-bold" : "text-zinc-100"}`}>
                        {muscle.name}
                      </span>
                      <span
                        className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 border"
                        style={{
                          backgroundColor: cat.subtleBg,
                          color: cat.stroke,
                          borderColor: `${cat.hex}40`,
                        }}
                      >
                        {cat.label}
                      </span>
                    </div>

                    {/* Category-colored Progress Bar */}
                    <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(pct, isTrained ? 4 : 0)}%`,
                          backgroundColor: isTrained ? cat.hex : "transparent",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right side: Share & sets info */}
                <div className="flex flex-col items-end shrink-0 pl-2 text-right">
                  <span className="font-display font-semibold text-xs tabular-nums text-zinc-300">
                    {muscle.volumePercent}% share
                  </span>
                  <span className="text-[11px] text-zinc-500 font-body">
                    {muscle.sets} {muscle.sets === 1 ? "set" : "sets"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
