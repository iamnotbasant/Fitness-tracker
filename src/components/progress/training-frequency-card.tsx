"use client"

import React, { useState, useMemo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import type { Workout, Exercise } from "@/lib/types"
import { Share2, Check } from "lucide-react"
import { toast } from "sonner"
import soundManager from "@/lib/sounds"
import { DetailBottomSheet } from "@/components/charts/detail-bottom-sheet"
import {
  MALE_FRONT_PARTS,
  MALE_BACK_PARTS,
  MALE_FRONT_VIEWBOX,
  MALE_BACK_VIEWBOX,
  type BodyPartPaths,
} from "@/components/charts/muscle-map-data"

export interface MuscleActivationData {
  key: string
  name: string
  category: "push" | "pull" | "legs" | "core" | "arms"
  sets: number
  reps: number
  intensity: number // 0 to 1
  volumePercent: number // 0 to 100
  exercises: { name: string; sets: number; reps: number }[]
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
      return "core"
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
  if (clean.includes("oblique") || clean.includes("serratus")) return "core"
  if (clean.includes("neck") || clean.includes("cervical") || clean.includes("trap") || clean.includes("upper back")) return "traps"
  if (clean.includes("lower back") || clean.includes("lumbar")) return "lower back"
  if (clean.includes("lat") || clean.includes("back")) return "lats"
  if (clean.includes("glute") || clean.includes("abductor")) return "glutes"
  if (clean.includes("quad") || clean.includes("adductor") || clean.includes("inner thigh") || clean.includes("groin") || clean.includes("leg")) return "quads"
  if (clean.includes("hamstring")) return "hamstrings"
  if (clean.includes("calv") || clean.includes("tibialis")) return "calves"
  return clean
}

const EXERCISE_TARGET_DICTIONARY: Record<string, { primary: string[]; secondary?: string[] }> = {
  "push up": { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  "push-up": { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  "pushup": { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  "bench press": { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  "dip": { primary: ["chest", "triceps"], secondary: ["shoulders"] },
  "dips": { primary: ["chest", "triceps"], secondary: ["shoulders"] },
  "pull up": { primary: ["lats"], secondary: ["biceps", "forearms", "traps"] },
  "pull-up": { primary: ["lats"], secondary: ["biceps", "forearms", "traps"] },
  "chin up": { primary: ["lats", "biceps"], secondary: ["forearms"] },
  "chin-up": { primary: ["lats", "biceps"], secondary: ["forearms"] },
  "pike push": { primary: ["shoulders"], secondary: ["triceps", "core"] },
  "overhead press": { primary: ["shoulders"], secondary: ["triceps"] },
  "handstand": { primary: ["shoulders"], secondary: ["triceps", "core"] },
  "squat": { primary: ["quads", "glutes"], secondary: ["hamstrings", "core"] },
  "pistol": { primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"] },
  "lunge": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  "leg raise": { primary: ["core"], secondary: ["quads"] },
  "plank": { primary: ["core"], secondary: ["shoulders"] },
  "bar hang": { primary: ["forearms"], secondary: ["lats"] },
  "dead hang": { primary: ["forearms"], secondary: ["lats"] },
  "calf raise": { primary: ["calves"] },
}

const SUGGESTED_MOVEMENTS: Record<string, string[]> = {
  chest: ["Push-ups", "Dips", "Diamond Push-ups", "Archer Push-ups"],
  shoulders: ["Pike Push-ups", "Handstand Hold", "Elevated Pike Push-ups"],
  biceps: ["Chin-ups", "Close-grip Pull-ups", "Inverted Rows"],
  triceps: ["Tricep Dips", "Diamond Push-ups", "Bench Dips"],
  forearms: ["Dead Hang", "False Grip Hang", "Wrist Curls"],
  core: ["Hanging Leg Raises", "Plank Hold", "Hollow Body Hold", "L-Sit"],
  traps: ["Scapular Pull-ups", "Inverted Rows", "Neck Extensions"],
  lats: ["Pull-ups", "Wide-grip Pull-ups", "Inverted Rows"],
  "lower back": ["Superman Hold", "Bird Dogs", "Back Extensions"],
  glutes: ["Glute Bridges", "Single-leg Hip Thrusts", "Deep Squats"],
  quads: ["Bodyweight Squats", "Pistol Squats", "Sissy Squats", "Lunges"],
  hamstrings: ["Nordic Curls", "Single-leg Deadlifts", "Glute-Ham Bridges"],
  calves: ["Standing Calf Raises", "Single-leg Calf Raises", "Jump Rope"],
}

// Ordered list of muscle groups for tracking and "Not trained" summary
const ORDERED_MUSCLE_GROUPS: { key: string; name: string; category: "push" | "pull" | "legs" | "core" | "arms" }[] = [
  { key: "chest", name: "Chest", category: "push" },
  { key: "core", name: "Core", category: "core" },
  { key: "lats", name: "Lats", category: "pull" },
  { key: "lower back", name: "Lower Back", category: "pull" },
  { key: "traps", name: "Traps", category: "pull" },
  { key: "shoulders", name: "Shoulders", category: "push" },
  { key: "biceps", name: "Biceps", category: "arms" },
  { key: "triceps", name: "Tricep", category: "arms" },
  { key: "forearms", name: "Forearms", category: "arms" },
  { key: "quads", name: "Quads", category: "legs" },
  { key: "hamstrings", name: "Hamstrings", category: "legs" },
  { key: "glutes", name: "Glutes", category: "legs" },
  { key: "calves", name: "Calves", category: "legs" },
]

interface TrainingFrequencyCardProps {
  workouts: Workout[]
  exercises?: Exercise[]
  periodLabel?: string
}

export function TrainingFrequencyCard({
  workouts,
  exercises = [],
  periodLabel = "This Week",
}: TrainingFrequencyCardProps) {
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null)
  const prefersReduced = useReducedMotion()

  // Calculate total sets, volume, and reps directly from period-filtered workouts
  const { totalSets, totalVolumeKg, totalReps } = useMemo(() => {
    let setsCount = 0
    let weightVolume = 0
    let repsCount = 0

    workouts.forEach((w) => {
      const s = Math.max(1, w.sets || 1)
      const r = w.reps || 0
      const wt = w.weight || 0
      setsCount += s
      repsCount += r
      if (wt > 0) {
        weightVolume += wt * (r > 0 ? r : s)
      } else if (w.volume && w.volume > 0) {
        weightVolume += w.volume
      }
    })

    return {
      totalSets: setsCount,
      totalVolumeKg: Math.round(weightVolume),
      totalReps: repsCount,
    }
  }, [workouts])

  // Calculate muscle stats
  const { muscleStats, trainedMuscles, untrainedMuscleNames } = useMemo(() => {
    const stats: Record<string, MuscleActivationData> = {}
    ORDERED_MUSCLE_GROUPS.forEach((m) => {
      stats[m.key] = {
        key: m.key,
        name: m.name,
        category: m.category,
        sets: 0,
        reps: 0,
        intensity: 0,
        volumePercent: 0,
        exercises: [],
      }
    })

    const exIdMap = new Map<string, Exercise>()
    const exNameMap = new Map<string, Exercise>()
    exercises.forEach((ex) => {
      exIdMap.set(String(ex.id), ex)
      if (ex.name) exNameMap.set(ex.name.toLowerCase().trim(), ex)
    })

    workouts.forEach((w) => {
      const ex =
        exIdMap.get(String(w.exerciseId)) ||
        (w.exerciseName ? exNameMap.get(w.exerciseName.toLowerCase().trim()) : undefined)
      const parts = ex?.bodyParts || []
      const sets = Math.max(1, w.sets || 1)
      const reps = w.reps || 0
      const exName = w.exerciseName || ex?.name || "Exercise"
      const nameLower = exName.toLowerCase().trim()

      let primaryKeys: string[] = []
      let secondaryKeys: string[] = []

      if (parts && parts.length > 0) {
        primaryKeys = Array.from(
          new Set(parts.map((p) => normalizeBodyPart(p)).filter((p) => !!stats[p]))
        )
      } else {
        for (const [key, mapping] of Object.entries(EXERCISE_TARGET_DICTIONARY)) {
          if (nameLower.includes(key)) {
            primaryKeys = mapping.primary.filter((m) => !!stats[m])
            secondaryKeys = (mapping.secondary || []).filter((m) => !!stats[m])
            break
          }
        }
      }

      if (primaryKeys.length === 0) {
        primaryKeys = ["chest"]
      }

      primaryKeys.forEach((key) => {
        if (!stats[key]) return
        stats[key].sets += sets
        stats[key].reps += reps
        const existingEx = stats[key].exercises.find((e) => e.name === exName)
        if (existingEx) {
          existingEx.sets += sets
          existingEx.reps += reps
        } else {
          stats[key].exercises.push({ name: exName, sets, reps })
        }
      })

      secondaryKeys.forEach((key) => {
        if (!stats[key] || primaryKeys.includes(key)) return
        const halfSets = Math.max(1, Math.round(sets * 0.5))
        const halfReps = Math.round(reps * 0.5)
        stats[key].sets += halfSets
        stats[key].reps += halfReps
        const existingEx = stats[key].exercises.find((e) => e.name === exName)
        if (existingEx) {
          existingEx.sets += halfSets
          existingEx.reps += halfReps
        } else {
          stats[key].exercises.push({ name: exName, sets: halfSets, reps: halfReps })
        }
      })
    })

    const maxSets = Math.max(1, ...Object.values(stats).map((s) => s.sets))
    const totalAssignedSets = Object.values(stats).reduce((acc, s) => acc + s.sets, 0)

    Object.values(stats).forEach((s) => {
      s.intensity = s.sets > 0 ? Math.min(1, s.sets / maxSets) : 0
      s.volumePercent =
        totalAssignedSets > 0 ? Math.round((s.sets / totalAssignedSets) * 100) : 0
    })

    const trained = Object.values(stats)
      .filter((s) => s.sets > 0)
      .sort((a, b) => b.sets - a.sets)

    const untrainedNames = ORDERED_MUSCLE_GROUPS.filter((m) => stats[m.key].sets === 0).map(
      (m) => m.name
    )

    return {
      muscleStats: stats,
      trainedMuscles: trained,
      untrainedMuscleNames: untrainedNames,
    }
  }, [workouts, exercises])

  const frontParts = useMemo(
    () => MALE_FRONT_PARTS.filter((p) => !SUBGROUP_SLUGS.has(p.slug)),
    []
  )
  const backParts = useMemo(
    () => MALE_BACK_PARTS.filter((p) => !SUBGROUP_SLUGS.has(p.slug)),
    []
  )

  // Handle Share button tap (Native share or clipboard copy)
  const handleShare = async () => {
    soundManager.play("click", 0.2)
    const trainedSummary =
      trainedMuscles.map((m) => `${m.sets} ${m.name}`).join(", ") || "None logged"
    const shareText = `🏋️ Training Frequency (${periodLabel})\n• ${totalSets} sets · ${
      totalVolumeKg > 0 ? `${totalVolumeKg.toLocaleString()} kg lifted` : `${totalReps.toLocaleString()} reps`
    }\n• Trained: ${trainedSummary}`

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "My Training Frequency",
          text: shareText,
        })
        toast.success("Training status shared!")
        return
      } catch (err: any) {
        if (err?.name === "AbortError") return
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText)
      toast.success("Training summary copied to clipboard!")
    }
  }

// Heat map color generator for anatomical muscle groups
// Matches Reference 08:
// - Untrained: dark sculpted slate (#26282e) with crisp contour stroke (#383c46)
// - Neutral: dark background charcoal (#18191d) with stroke (#22242a)
// - Trained: rich coral/crimson heat scale mapped from faintest deep crimson (lowest sets)
//   to bright radiant coral (highest sets), normalized against maxSets in the current period.
function getMuscleColors(
  intensity: number,
  isTrained: boolean,
  isNeutral: boolean,
  isSelected: boolean,
  isHovered: boolean
) {
  if (isSelected) {
    return {
      fill: "#ffffff",
      stroke: "#ffffff",
      strokeWidth: 2.2,
    }
  }

  if (isHovered && !isNeutral) {
    return {
      fill: isTrained ? "#fb7185" : "#3f434d",
      stroke: "#ffffff",
      strokeWidth: 1.8,
    }
  }

  if (isNeutral) {
    return {
      fill: "#18191d",
      stroke: "#22242a",
      strokeWidth: 0.9,
    }
  }

  if (!isTrained || intensity <= 0) {
    return {
      fill: "#26282e",
      stroke: "#383c46",
      strokeWidth: 1.0,
    }
  }

  // Trained: intensity is in (0, 1] normalized to max sets in period.
  // Effective factor t in [0.20, 1.00] ensures even a 1-set group has a distinct deep red fill,
  // while the top group (t=1) reaches bright radiant coral.
  const t = 0.20 + 0.80 * Math.max(0, Math.min(1, intensity))

  // Fill: deep crimson rgb(120, 23, 29) -> hot coral-red rgb(242, 72, 79)
  const r = Math.round(120 + t * (242 - 120))
  const g = Math.round(23 + t * (72 - 23))
  const b = Math.round(29 + t * (79 - 29))
  const fill = `rgb(${r}, ${g}, ${b})`

  // Contour stroke: bright definition between muscle boundaries
  const sr = Math.round(155 + t * (255 - 155))
  const sg = Math.round(38 + t * (155 - 38))
  const sb = Math.round(45 + t * (160 - 45))
  const stroke = `rgb(${sr}, ${sg}, ${sb})`
  const strokeWidth = 1.1 + t * 0.4

  return { fill, stroke, strokeWidth }
}

  // Render muscle part SVG with reference 08 coral/crimson styling & sculpted anatomy
  const renderPart = (part: BodyPartPaths, index: number, view: "front" | "back") => {
    const isNeutral = NEUTRAL_SLUGS.has(part.slug)
    const muscleKey = slugToMuscleKey(part.slug, view)
    const stat = muscleKey ? muscleStats[muscleKey] : null
    const isTrained = Boolean(stat && stat.sets > 0)
    const isSelected = Boolean(muscleKey && selectedMuscle === muscleKey)
    const isHovered = Boolean(muscleKey && hoveredMuscle === muscleKey)
    const intensity = stat?.intensity ?? 0

    const { fill, stroke, strokeWidth } = getMuscleColors(
      intensity,
      isTrained,
      isNeutral,
      isSelected,
      isHovered
    )

    return (
      <g
        key={`${part.slug}-${index}-${view}`}
        className={`${isNeutral ? "pointer-events-none" : "cursor-pointer"} transition-all duration-150`}
        onClick={() => {
          if (muscleKey) {
            soundManager.play("click", 0.25)
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
            className="transition-colors duration-200"
          />
        ))}
      </g>
    )
  }

  const activeMuscleModal = selectedMuscle ? muscleStats[selectedMuscle] : null

  // Volume text display: e.g. "380 kg lifted · This Week" or "250 reps · This Week"
  const volumeDisplay =
    totalVolumeKg > 0
      ? `${totalVolumeKg.toLocaleString()} kg lifted · ${periodLabel}`
      : `${totalReps.toLocaleString()} reps · ${periodLabel}`

  return (
    <div className="rounded-3xl border border-zinc-800/90 bg-[#121316] p-5 sm:p-6 shadow-xl space-y-5">
      {/* ─── 1. Header Row (Matching 08-mascot-reference.jpg) ─── */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Sets & Volume */}
        <div className="space-y-0.5">
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight tabular-nums">
            {totalSets} sets
          </div>
          <div className="text-xs sm:text-sm font-medium text-zinc-400 font-body">
            {volumeDisplay}
          </div>
        </div>

        {/* Right: Share icon button (tap >= 44px) */}
        <button
          type="button"
          onClick={handleShare}
          className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
          aria-label="Share training status"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* ─── 2. Front & Back Anatomical Figures (Side-by-side, Reference 08 style) ─── */}
      <motion.div
        animate={
          prefersReduced
            ? {}
            : {
                y: [-4, 4, -4],
              }
        }
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-full flex items-center justify-center gap-4 sm:gap-8 py-3"
      >
        {/* Front Figure */}
        <div className="flex-1 max-w-[155px] sm:max-w-[195px] flex flex-col items-center">
          <svg
            viewBox={MALE_FRONT_VIEWBOX}
            className="w-full h-auto select-none max-h-[300px] sm:max-h-[360px] filter drop-shadow-md"
          >
            {frontParts.map((p, i) => renderPart(p, i, "front"))}
          </svg>
        </div>

        {/* Back Figure */}
        <div className="flex-1 max-w-[155px] sm:max-w-[195px] flex flex-col items-center">
          <svg
            viewBox={MALE_BACK_VIEWBOX}
            className="w-full h-auto select-none max-h-[300px] sm:max-h-[360px] filter drop-shadow-md"
          >
            {backParts.map((p, i) => renderPart(p, i, "back"))}
          </svg>
        </div>
      </motion.div>

      {/* ─── 3. Trained Muscle Badges (e.g. "3 Chest", "1 Core") ─── */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {trainedMuscles.length > 0 ? (
            trainedMuscles.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  soundManager.play("click", 0.2)
                  setSelectedMuscle((prev) => (prev === m.key ? null : m.key))
                }}
                className={`min-h-[44px] px-3.5 py-1.5 rounded-full border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  selectedMuscle === m.key
                    ? "bg-white border-white text-zinc-950"
                    : "bg-zinc-850 hover:bg-zinc-800 border-zinc-700/60 text-white"
                }`}
              >
                <span
                  className={`font-bold text-xs font-display tabular-nums ${
                    selectedMuscle === m.key ? "text-zinc-950" : "text-white"
                  }`}
                >
                  {m.sets}
                </span>
                <span
                  className={`font-medium text-xs font-body ${
                    selectedMuscle === m.key ? "text-zinc-800" : "text-zinc-300"
                  }`}
                >
                  {m.name}
                </span>
              </button>
            ))
          ) : (
            <p className="text-xs text-zinc-500 font-body py-1">
              No muscles trained in this period
            </p>
          )}
        </div>

        {/* ─── 4. "Not trained: ..." List (Reference 08) ─── */}
        {untrainedMuscleNames.length > 0 && (
          <p className="text-[11px] sm:text-xs text-zinc-400 font-body text-center max-w-md mx-auto leading-relaxed">
            <span className="text-zinc-400 font-medium">Not trained:</span>{" "}
            {untrainedMuscleNames.join(", ")}
          </p>
        )}
      </div>

      {/* Detail Bottom Sheet for Tapped Muscle */}
      <DetailBottomSheet
        isOpen={Boolean(activeMuscleModal)}
        onClose={() => setSelectedMuscle(null)}
        title={activeMuscleModal?.name || "Muscle Detail"}
        badge={activeMuscleModal?.category}
        subtitle={
          activeMuscleModal
            ? `${activeMuscleModal.sets} ${activeMuscleModal.sets === 1 ? "set" : "sets"} · ${activeMuscleModal.reps} reps logged (${periodLabel})`
            : undefined
        }
      >
        {activeMuscleModal && activeMuscleModal.exercises.length > 0 ? (
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
              Logged Movements ({periodLabel})
            </span>
            <div className="space-y-1.5">
              {activeMuscleModal.exercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs"
                >
                  <span className="text-zinc-200 font-medium font-body truncate">
                    {ex.name}
                  </span>
                  <span className="font-display tabular-nums text-white font-semibold shrink-0 ml-2">
                    {ex.sets} {ex.sets === 1 ? "set" : "sets"} · {ex.reps} reps
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-1 font-body text-xs text-zinc-400">
            <p>No workout sets logged for this muscle in {periodLabel.toLowerCase()}.</p>
            {activeMuscleModal && (
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                  Recommended Target Movements
                </span>
                <div className="flex flex-wrap gap-2">
                  {(SUGGESTED_MOVEMENTS[activeMuscleModal.key] || []).map((m, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs"
                    >
                      {m}
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
