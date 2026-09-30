"use client"

import { useState, useMemo } from "react"
import type { Workout, Exercise } from "@/lib/types"
import { Activity } from "lucide-react"
import soundManager from "@/lib/sounds"
import { motion, AnimatePresence } from "framer-motion"
import { DetailBottomSheet } from "./detail-bottom-sheet"
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
  intensity: number // 0 to 1 relative load for heatmap shading
  volumePercent: number // 0 to 100% share of total training sets
}

// Strict white monochrome heatmap scale (zinc-900 to bright white)
export const WHITE_HEATMAP_SCALE = [
  { key: "none", label: "0%", color: "#18181b", stroke: "#27272a" },
  { key: "low", label: "1–25%", color: "#27272a", stroke: "#3f3f46" },
  { key: "med-low", label: "26–50%", color: "#3f3f46", stroke: "#52525b" },
  { key: "med-high", label: "51–75%", color: "#71717a", stroke: "#a1a1aa" },
  { key: "high", label: "76–100%", color: "#ffffff", stroke: "#ffffff" },
] as const

export function getWhiteIntensityTier(intensity: number) {
  if (intensity <= 0) return WHITE_HEATMAP_SCALE[0]
  if (intensity <= 0.25) return WHITE_HEATMAP_SCALE[1]
  if (intensity <= 0.50) return WHITE_HEATMAP_SCALE[2]
  if (intensity <= 0.75) return WHITE_HEATMAP_SCALE[3]
  return WHITE_HEATMAP_SCALE[4]
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

// Calisthenics-focused suggested target movements
const SUGGESTED_EXERCISES: Record<string, string[]> = {
  chest: ["Push-ups", "Dips", "Archer Push-ups", "Diamond Push-ups"],
  shoulders: ["Pike Push-ups", "Handstand Hold", "Elevated Pike"],
  biceps: ["Chin-ups", "Close-grip Pull-ups", "Inverted Rows"],
  triceps: ["Tricep Dips", "Diamond Push-ups", "Bench Dips"],
  forearms: ["Dead Hang", "False Grip Hang", "Wrist Curls"],
  core: ["Hanging Leg Raises", "Plank Hold", "Hollow Body Hold", "L-Sit"],
  obliques: ["Side Plank", "Russian Twists", "Windshield Wipers"],
  traps: ["Scapular Pull-ups", "Inverted Rows", "Farmer's Walk", "Neck Holds"],
  lats: ["Pull-ups", "Wide-grip Pull-ups", "Inverted Rows"],
  "lower back": ["Superman Hold", "Bird Dogs", "Back Extensions"],
  glutes: ["Glute Bridges", "Single-leg Hip Thrusts", "Deep Squats"],
  quads: [
    "Bodyweight Squats",
    "Pistol Squats",
    "Sissy Squats",
    "Lunges",
    "Cossack Squats",
    "Side Lunges",
  ],
  hamstrings: ["Nordic Curls", "Single-leg Deadlifts", "Glute-Ham Bridges"],
  calves: ["Standing Calf Raises", "Single-leg Calf Raises", "Jump Rope"],
}

/**
 * Maps SVG path slugs to canonical calisthenics muscle keys.
 * Adductors are folded into the thigh region (quads on front, hamstrings on back).
 * Neck is folded into traps.
 */
function slugToMuscleKey(slug: string, view?: "front" | "back"): string | null {
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
    case "neck":
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
      return view === "back" ? "hamstrings" : "quads"
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
  if (clean.includes("neck") || clean.includes("cervical")) return "traps"
  if (clean.includes("trap") || clean.includes("upper back")) return "traps"
  if (clean.includes("lower back") || clean.includes("lumbar")) return "lower back"
  if (clean.includes("lat") || clean.includes("back")) return "lats"
  if (clean.includes("glute") || clean.includes("abductor")) return "glutes"
  if (clean.includes("quad")) return "quads"
  if (clean.includes("hamstring")) return "hamstrings"
  if (clean.includes("calv") || clean.includes("tibialis")) return "calves"
  if (clean.includes("adductor") || clean.includes("inner thigh") || clean.includes("groin")) return "quads"
  if (clean.includes("leg")) return "quads"
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
  // Toggle: Both | Front | Back (defaults to Both view)
  const [activeView, setActiveView] = useState<"both" | "front" | "back">("both")
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null)

  // Compute stats and percentages per muscle (14 calisthenics-sensible groups)
  const muscleStats = useMemo(() => {
    const stats: Record<string, MuscleStat> = {
      chest: { key: "chest", name: "Chest", view: "front", category: "push", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      shoulders: { key: "shoulders", name: "Shoulders", view: "both", category: "push", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      biceps: { key: "biceps", name: "Biceps", view: "front", category: "arms", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      triceps: { key: "triceps", name: "Triceps", view: "back", category: "arms", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      forearms: { key: "forearms", name: "Forearms", view: "both", category: "arms", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      core: { key: "core", name: "Abdominals", view: "front", category: "core", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      obliques: { key: "obliques", name: "Obliques", view: "front", category: "core", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      lats: { key: "lats", name: "Lats", view: "back", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      traps: { key: "traps", name: "Traps", view: "back", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      "lower back": { key: "lower back", name: "Lower Back", view: "back", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      glutes: { key: "glutes", name: "Glutes", view: "back", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      quads: { key: "quads", name: "Quads", view: "front", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      hamstrings: { key: "hamstrings", name: "Hamstrings", view: "back", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
      calves: { key: "calves", name: "Calves", view: "both", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: 0, volumePercent: 0 },
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

  const getFillColor = (
    slug: string,
    isHovered: boolean,
    isSelected: boolean,
    view: "front" | "back"
  ) => {
    if (NEUTRAL_SLUGS.has(slug)) return "#09090b"

    const muscleKey = slugToMuscleKey(slug, view)
    if (!muscleKey) return "#09090b"

    const stat = muscleStats[muscleKey]
    const intensity = stat?.intensity ?? 0
    const tier = getWhiteIntensityTier(intensity)

    if (isSelected) return "#ffffff"
    if (isHovered) return intensity > 0 ? "#e4e4e7" : "#27272a"

    return tier.color
  }

  const getStrokeColor = (
    slug: string,
    isHovered: boolean,
    isSelected: boolean,
    view: "front" | "back"
  ) => {
    if (NEUTRAL_SLUGS.has(slug)) return "#18181b"
    if (isSelected) return "#ffffff"
    if (isHovered) return "#ffffff"

    const muscleKey = slugToMuscleKey(slug, view)
    const intensity = muscleKey ? muscleStats[muscleKey]?.intensity ?? 0 : 0
    const tier = getWhiteIntensityTier(intensity)

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

  const renderPart = (part: BodyPartPaths, index: number, view: "front" | "back") => {
    const isNeutral = NEUTRAL_SLUGS.has(part.slug)
    const muscleKey = slugToMuscleKey(part.slug, view)
    const isSelected = !!muscleKey && selectedMuscle === muscleKey
    const isHovered = !!muscleKey && hoveredMuscle === muscleKey
    const stat = muscleKey ? muscleStats[muscleKey] : null
    const isTrained = (stat?.sets ?? 0) > 0

    const fill = getFillColor(part.slug, isHovered, isSelected, view)
    const stroke = getStrokeColor(part.slug, isHovered, isSelected, view)
    const strokeWidth = isSelected ? 2.5 : isHovered ? 1.8 : isTrained ? 1.2 : 0.8

    return (
      <g
        key={`${part.slug}-${index}`}
        className={`${isNeutral ? "pointer-events-none" : "cursor-pointer"} transition-all duration-150`}
        onClick={() => {
          if (muscleKey) {
            soundManager.play("click", 0.3)
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
            strokeLinecap="round"
          />
        ))}
      </g>
    )
  }

  // Floating Numeric % Badge Pin on SVG (Large, Bold, High Contrast, Readable on 360px phones)
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
    const pct = stat.volumePercent
    const isTrained = stat.sets > 0

    // Capsule dimensions: much larger, high contrast pill readable without zooming
    const w = 126
    const h = 58
    const rx = 16

    const labelFontSize = label.length > 8 ? 11 : label.length > 6 ? 13 : 15

    return (
      <g
        key={`badge-${muscleKey}-${x}-${y}`}
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer select-none"
        onClick={() => {
          soundManager.play("click", 0.3)
          setSelectedMuscle(muscleKey)
        }}
        onMouseEnter={() => setHoveredMuscle(muscleKey)}
        onMouseLeave={() => setHoveredMuscle(null)}
      >
        {/* Background Capsule Pill */}
        <rect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          rx={rx}
          ry={rx}
          fill="#09090b"
          stroke={
            isSelected
              ? "#ffffff"
              : isHovered
              ? "#ffffff"
              : isTrained
              ? "#e4e4e7"
              : "#3f3f46"
          }
          strokeWidth={isSelected ? 3 : isHovered ? 2.5 : isTrained ? 2 : 1.5}
        />
        {/* Label */}
        <text
          x={0}
          y={-7}
          textAnchor="middle"
          fill={isSelected ? "#ffffff" : isTrained ? "#d4d4d8" : "#a1a1aa"}
          fontSize={labelFontSize}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="700"
          letterSpacing="0.5"
        >
          {label.toUpperCase()}
        </text>
        {/* BIG & Unmissable % (Volume Share) */}
        <text
          x={0}
          y={20}
          textAnchor="middle"
          fill={isSelected || isTrained ? "#ffffff" : "#71717a"}
          fontSize={30}
          fontFamily="var(--font-display), Space Grotesk, sans-serif"
          fontWeight="800"
        >
          {pct}%
        </text>
      </g>
    )
  }

  // Front badges: spaced cleanly across front body landmarks
  const renderFrontBadges = () => (
    <>
      {renderSvgNumericBadge("chest", 363.5, 365, "Chest")}
      {renderSvgNumericBadge("shoulders", 195, 310, "Delts")}
      {renderSvgNumericBadge("biceps", 145, 435, "Biceps")}
      {renderSvgNumericBadge("forearms", 120, 590, "Forearms")}
      {renderSvgNumericBadge("core", 363.5, 520, "Abs")}
      {renderSvgNumericBadge("obliques", 495, 575, "Obliques")}
      {renderSvgNumericBadge("quads", 310, 800, "Quads")}
      {renderSvgNumericBadge("calves", 300, 1080, "Calves")}
    </>
  )

  // Back badges: spaced cleanly across back body landmarks
  const renderBackBadges = () => (
    <>
      {renderSvgNumericBadge("traps", 1081.5, 290, "Traps")}
      {renderSvgNumericBadge("lats", 1185, 470, "Lats")}
      {renderSvgNumericBadge("triceps", 885, 430, "Triceps")}
      {renderSvgNumericBadge("lower back", 1081.5, 595, "Lower Back")}
      {renderSvgNumericBadge("glutes", 1081.5, 720, "Glutes")}
      {renderSvgNumericBadge("hamstrings", 1025, 875, "Hamstrings")}
      {renderSvgNumericBadge("calves", 1025, 1080, "Calves")}
    </>
  )

  // Sorted muscle list & summary stats
  const { sortedMuscles, topMuscle, activeCount, totalSetsSum, totalMuscleGroups } = useMemo(() => {
    const list = Object.values(muscleStats).sort((a, b) => {
      if (b.volumePercent !== a.volumePercent) return b.volumePercent - a.volumePercent
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
      totalMuscleGroups: list.length,
    }
  }, [muscleStats])

  const activeModalMuscle = selectedMuscle ? muscleStats[selectedMuscle] : null

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6 shadow-sm space-y-6">
      {/* ─── Section Header (Monochrome Icon + Title) & Both/Front/Back Toggle (Tap >= 44px) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-white">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight font-display">Muscles</h2>
            <p className="text-xs text-zinc-400 font-body">Biomechanical load distribution & target volume</p>
          </div>
        </div>

        {/* View Toggle: Both | Front | Back (Tap Targets >= 44px) */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto min-h-[44px]">
          {(["both", "front", "back"] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => {
                soundManager.play("click", 0.2)
                setActiveView(view)
              }}
              className={`min-h-[44px] px-3.5 sm:px-4 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center capitalize ${
                activeView === view
                  ? "bg-white text-zinc-950 shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {view === "both" ? "Both" : view === "front" ? "Front" : "Back"}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Neutral Overview Header (Shown unprompted when nothing selected) ─── */}
      <div className="pb-1 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
              Muscle Activation
            </h3>
            <p className="text-xs text-zinc-400 font-body mt-0.5">
              <span className="font-display font-semibold tabular-nums text-zinc-300">
                {activeCount}
              </span>{" "}
              of {totalMuscleGroups} muscle groups trained ·{" "}
              <span className="font-display font-semibold tabular-nums text-zinc-300">
                {totalSetsSum}
              </span>{" "}
              total {totalSetsSum === 1 ? "set" : "sets"}
            </p>
          </div>

          {topMuscle && topMuscle.sets > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-body text-zinc-300 self-start sm:self-auto">
              <span className="text-zinc-500">Most trained:</span>
              <span className="font-semibold text-white">{topMuscle.name}</span>
              <span className="text-zinc-500">·</span>
              <span className="font-display font-semibold tabular-nums text-zinc-200">
                {topMuscle.volumePercent}% of sets
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Anatomy Figure SVG Canvas ─── */}
      <div className="w-full flex justify-center py-2 relative">
        <AnimatePresence mode="wait">
          {activeView === "both" ? (
            <motion.div
              key="both"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-4 md:gap-8"
            >
              {/* Front Figure */}
              <div className="w-full max-w-[320px] flex flex-col items-center">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  Front
                </span>
                <svg
                  viewBox={MALE_FRONT_VIEWBOX}
                  className="w-full h-auto select-none max-h-[460px]"
                >
                  {frontParts.map((p, i) => renderPart(p, i, "front"))}
                  {renderFrontBadges()}
                </svg>
              </div>

              {/* Back Figure */}
              <div className="w-full max-w-[320px] flex flex-col items-center">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  Back
                </span>
                <svg
                  viewBox={MALE_BACK_VIEWBOX}
                  className="w-full h-auto select-none max-h-[460px]"
                >
                  {backParts.map((p, i) => renderPart(p, i, "back"))}
                  {renderBackBadges()}
                </svg>
              </div>
            </motion.div>
          ) : activeView === "front" ? (
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
                {frontParts.map((p, i) => renderPart(p, i, "front"))}
                {renderFrontBadges()}
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
                {backParts.map((p, i) => renderPart(p, i, "back"))}
                {renderBackBadges()}
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── White Heat Scale Legend ─── */}
      <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 flex-wrap gap-2">
        <span className="font-body text-[11px] text-zinc-500 uppercase tracking-wider">
          Activation Scale
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500 font-body">None</span>
          <div className="flex gap-1 items-center">
            {WHITE_HEATMAP_SCALE.map((tier) => (
              <div
                key={tier.key}
                className="h-3 w-3 rounded-[3px] border"
                style={{ backgroundColor: tier.color, borderColor: tier.stroke }}
                title={tier.label}
              />
            ))}
          </div>
          <span className="text-[11px] text-zinc-500 font-body">Max</span>
        </div>
      </div>

      {/* ─── Muscle List: Tap opens Bottom Sheet Modal (No inline expanding clutter) ─── */}
      <div className="pt-2 space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-body uppercase tracking-wider pb-1">
          <span>Muscle Group</span>
          <span>Volume Share</span>
        </div>

        <div className="space-y-2">
          {sortedMuscles.map((muscle) => {
            const isTrained = muscle.sets > 0

            return (
              <div
                key={muscle.key}
                onClick={() => {
                  soundManager.play("click", 0.25)
                  setSelectedMuscle(muscle.key)
                }}
                className="p-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 border min-h-[56px] bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-850"
              >
                {/* BIG unmissable percentage on the left (Volume Share) */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span
                    className={`font-display font-bold text-2xl sm:text-3xl tabular-nums min-w-[3.5rem] text-right shrink-0 ${
                      isTrained ? "text-white" : "text-zinc-600"
                    }`}
                  >
                    {muscle.volumePercent}%
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-medium text-sm text-zinc-100 truncate font-body">
                        {muscle.name}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 bg-zinc-850 border border-zinc-700/60 text-zinc-400">
                        {muscle.category}
                      </span>
                    </div>

                    {/* Pure White Progress Bar */}
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(muscle.volumePercent, isTrained ? 4 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right side: Share & sets info */}
                <div className="flex flex-col items-end shrink-0 pl-2 text-right">
                  <span className="font-display font-semibold text-xs tabular-nums text-zinc-300">
                    {muscle.volumePercent}% of sets
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

      {/* ─── Bottom-Sheet Modal for Muscle Drilldown (Clutter-Free, Focused) ─── */}
      <DetailBottomSheet
        isOpen={!!activeModalMuscle}
        onClose={() => setSelectedMuscle(null)}
        title={activeModalMuscle?.name || "Muscle Detail"}
        badge={activeModalMuscle?.category}
        subtitle={
          activeModalMuscle
            ? `${activeModalMuscle.volumePercent}% of total sets · ${activeModalMuscle.sets} ${activeModalMuscle.sets === 1 ? "set" : "sets"} logged`
            : undefined
        }
      >
        {activeModalMuscle && activeModalMuscle.exercises.length > 0 ? (
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block">
              Top Exercises
            </span>
            <div className="space-y-1.5">
              {activeModalMuscle.exercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs"
                >
                  <span className="text-zinc-200 font-medium font-body truncate">
                    {ex.name}
                  </span>
                  <span className="font-display tabular-nums text-white font-semibold shrink-0 ml-2">
                    {ex.sets} {ex.sets === 1 ? "set" : "sets"}{ex.reps > 0 ? ` · ${ex.reps} reps` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-1 font-body text-xs text-zinc-400">
            <p>No workout sets logged for this muscle in this date range.</p>
            {activeModalMuscle && (
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block">
                  Target Movements
                </span>
                <div className="flex flex-wrap gap-2">
                  {(SUGGESTED_EXERCISES[activeModalMuscle.key] || []).map((ex, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailBottomSheet>
    </div>
  )
}
