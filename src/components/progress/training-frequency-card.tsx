"use client"

import React, { useState, useMemo } from "react"
import type { Workout, Exercise } from "@/lib/types"
import { ChevronDown, Check } from "lucide-react"
import soundManager from "@/lib/sounds"
import { DetailBottomSheet } from "@/components/charts/detail-bottom-sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  MALE_FRONT_PARTS,
  MALE_BACK_PARTS,
  MALE_FRONT_VIEWBOX,
  MALE_BACK_VIEWBOX,
  type BodyPartPaths,
} from "@/components/charts/muscle-map-data"
import { getPresetDates, type PresetRange } from "@/components/ui/date-range-filter"

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

const WHITE_HEATMAP_TIERS = [
  { min: 0, fill: "#18181b", stroke: "#27272a" },
  { min: 0.01, fill: "#27272a", stroke: "#3f3f46" },
  { min: 0.26, fill: "#3f3f46", stroke: "#52525b" },
  { min: 0.51, fill: "#71717a", stroke: "#a1a1aa" },
  { min: 0.76, fill: "#ffffff", stroke: "#ffffff" },
]

function getHeatmapColors(intensity: number) {
  if (intensity <= 0) return WHITE_HEATMAP_TIERS[0]
  if (intensity <= 0.25) return WHITE_HEATMAP_TIERS[1]
  if (intensity <= 0.50) return WHITE_HEATMAP_TIERS[2]
  if (intensity <= 0.75) return WHITE_HEATMAP_TIERS[3]
  return WHITE_HEATMAP_TIERS[4]
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
  "dip": { primary: ["chest", "triceps"], secondary: ["shoulders"] },
  "dips": { primary: ["chest", "triceps"], secondary: ["shoulders"] },
  "pull up": { primary: ["lats"], secondary: ["biceps", "forearms", "traps"] },
  "pull-up": { primary: ["lats"], secondary: ["biceps", "forearms", "traps"] },
  "chin up": { primary: ["lats", "biceps"], secondary: ["forearms"] },
  "chin-up": { primary: ["lats", "biceps"], secondary: ["forearms"] },
  "pike push": { primary: ["shoulders"], secondary: ["triceps", "core"] },
  "handstand": { primary: ["shoulders"], secondary: ["triceps", "core"] },
  "squat": { primary: ["quads", "glutes"], secondary: ["hamstrings", "core"] },
  "pistol": { primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"] },
  "lunge": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  "leg raise": { primary: ["core"], secondary: ["obliques"] },
  "plank": { primary: ["core"], secondary: ["shoulders", "obliques"] },
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
  obliques: ["Side Plank", "Russian Twists", "Windshield Wipers"],
  traps: ["Scapular Pull-ups", "Inverted Rows", "Neck Extensions"],
  lats: ["Pull-ups", "Wide-grip Pull-ups", "Inverted Rows"],
  "lower back": ["Superman Hold", "Bird Dogs", "Back Extensions"],
  glutes: ["Glute Bridges", "Single-leg Hip Thrusts", "Deep Squats"],
  quads: ["Bodyweight Squats", "Pistol Squats", "Sissy Squats", "Lunges"],
  hamstrings: ["Nordic Curls", "Single-leg Deadlifts", "Glute-Ham Bridges"],
  calves: ["Standing Calf Raises", "Single-leg Calf Raises", "Jump Rope"],
}

const FREQUENCY_RANGES: { id: PresetRange; label: string }[] = [
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "all_time", label: "All Time" },
]

interface TrainingFrequencyCardProps {
  workouts: Workout[]
  exercises: Exercise[]
}

export function TrainingFrequencyCard({ workouts, exercises }: TrainingFrequencyCardProps) {
  const [selectedRange, setSelectedRange] = useState<PresetRange>("this_week")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null)

  // Filter workouts for this section based on selected range
  const filteredWorkouts = useMemo(() => {
    if (selectedRange === "all_time") return workouts
    const { start, end } = getPresetDates(selectedRange)
    if (!start && !end) return workouts
    return workouts.filter((w) => {
      const d = (w.date || "").slice(0, 10)
      if (!d) return false
      if (start && d < start) return false
      if (end && d > end) return false
      return true
    })
  }, [workouts, selectedRange])

  // Calculate muscle stats
  const muscleStats = useMemo(() => {
    const stats: Record<string, MuscleActivationData> = {
      chest: { key: "chest", name: "Chest", category: "push", sets: 0, reps: 0, intensity: 0, volumePercent: 0, exercises: [] },
      shoulders: { key: "shoulders", name: "Shoulders", category: "push", sets: 0, reps: 0, intensity: 0, volumePercent: 0, exercises: [] },
      biceps: { key: "biceps", name: "Biceps", category: "arms", sets: 0, reps: 0, intensity: 0, volumePercent: 0, exercises: [] },
      triceps: { key: "triceps", name: "Triceps", category: "arms", sets: 0, reps: 0, intensity: 0, volumePercent: 0, exercises: [] },
      forearms: { key: "forearms", name: "Forearms", category: "arms", sets: 0, reps: 0, intensity: 0, volumePercent: 0, exercises: [] },
      core: { key: "core", name: "Abdominals", category: "core", sets: 0, reps: 0, intensity: 0, volumePercent: 0, exercises: [] },
      obliques: { key: "obliques", name: "Obliques", category: "core", sets: 0, reps: 0, intensity: 0, volumePercent: 0, exercises: [] },
      lats: { key: "lats", name: "Lats", category: "pull", sets: 0, reps: 0, intensity: 0, volumePercent: 0, exercises: [] },
      traps: { key: "traps", name: "Traps", category: "pull", sets: 0, reps: 0, intensity: 0, volumePercent: 0, exercises: [] },
      "lower back": { key: "lower back", name: "Lower Back", category: "pull", sets: 0, reps: 0, intensity: 0, volumePercent: 0, exercises: [] },
      glutes: { key: "glutes", name: "Glutes", category: "legs", sets: 0, reps: 0, intensity: 0, volumePercent: 0, exercises: [] },
      quads: { key: "quads", name: "Quads", category: "legs", sets: 0, reps: 0, intensity: 0, volumePercent: 0, exercises: [] },
      hamstrings: { key: "hamstrings", name: "Hamstrings", category: "legs", sets: 0, reps: 0, intensity: 0, volumePercent: 0, exercises: [] },
      calves: { key: "calves", name: "Calves", category: "legs", sets: 0, reps: 0, intensity: 0, volumePercent: 0, exercises: [] },
    }

    const exIdMap = new Map<string, Exercise>()
    const exNameMap = new Map<string, Exercise>()
    exercises.forEach((ex) => {
      exIdMap.set(String(ex.id), ex)
      if (ex.name) exNameMap.set(ex.name.toLowerCase().trim(), ex)
    })

    filteredWorkouts.forEach((w) => {
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

      primaryKeys.forEach((key) => {
        const item = stats[key]
        item.sets += sets
        item.reps += sets * reps

        const existing = item.exercises.find((e) => e.name.toLowerCase() === exName.toLowerCase())
        if (existing) {
          existing.sets += sets
          existing.reps += sets * reps
        } else {
          item.exercises.push({ name: exName, sets, reps: sets * reps })
        }
      })

      secondaryKeys.forEach((key) => {
        if (primaryKeys.includes(key)) return
        const item = stats[key]
        const assistingSets = Math.max(1, Math.round(sets * 0.5))
        item.sets += assistingSets
        item.reps += Math.round(sets * reps * 0.5)

        const existing = item.exercises.find((e) => e.name.toLowerCase() === exName.toLowerCase())
        if (existing) {
          existing.sets += assistingSets
          existing.reps += Math.round(sets * reps * 0.5)
        } else {
          item.exercises.push({ name: exName, sets: assistingSets, reps: Math.round(sets * reps * 0.5) })
        }
      })
    })

    const allSets = Object.values(stats).map((s) => s.sets)
    const maxSets = Math.max(0, ...allSets)
    const totalSetsSum = allSets.reduce((sum, v) => sum + v, 0)

    Object.values(stats).forEach((s) => {
      if (s.sets > 0 && maxSets > 0) {
        s.intensity = Number((s.sets / maxSets).toFixed(3))
        s.volumePercent = totalSetsSum > 0 ? Math.round((s.sets / totalSetsSum) * 100) : 0
      } else {
        s.intensity = 0
        s.volumePercent = 0
      }
    })

    return stats
  }, [filteredWorkouts, exercises])

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
    const stat = muscleKey ? muscleStats[muscleKey] : null
    const intensity = stat?.intensity ?? 0

    const isSelected = !!muscleKey && selectedMuscle === muscleKey
    const isHovered = !!muscleKey && hoveredMuscle === muscleKey

    const tier = getHeatmapColors(intensity)
    let fill = isNeutral ? "#09090b" : tier.fill
    let stroke = isNeutral ? "#18181b" : tier.stroke

    if (isSelected) {
      fill = "#ffffff"
      stroke = "#ffffff"
    } else if (isHovered && !isNeutral) {
      fill = intensity > 0 ? "#e4e4e7" : "#27272a"
      stroke = "#ffffff"
    }

    const strokeWidth = isSelected ? 2.5 : isHovered ? 2 : (stat?.sets ?? 0) > 0 ? 1.2 : 0.8

    return (
      <g
        key={`${part.slug}-${index}`}
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
          />
        ))}
      </g>
    )
  }

  const activeMuscleModal = selectedMuscle ? muscleStats[selectedMuscle] : null
  const activeRangeLabel = FREQUENCY_RANGES.find((r) => r.id === selectedRange)?.label || "This Week"

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header: Title + Small Range Dropdown */}
      <div className="flex items-center justify-between gap-3 pb-1 border-b border-zinc-800">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight font-display">
            Training Frequency
          </h2>
          <p className="text-xs text-zinc-400 font-body mt-0.5">
            Target muscle distribution & intensity
          </p>
        </div>

        {/* Small Range Dropdown: "This Week" (min 44px tap target) */}
        <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-10 min-h-[44px] px-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-850 hover:border-zinc-700 text-xs font-medium text-white flex items-center gap-2 transition-all shadow-xs cursor-pointer shrink-0"
            >
              <span>{activeRangeLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            className="w-40 p-1 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl text-xs"
          >
            <div className="space-y-0.5">
              {FREQUENCY_RANGES.map((opt) => {
                const isSelected = selectedRange === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      soundManager.play("click", 0.2)
                      setSelectedRange(opt.id)
                      setDropdownOpen(false)
                    }}
                    className={`w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer text-xs ${
                      isSelected
                        ? "bg-zinc-800 text-white font-semibold border border-zinc-700 shadow-xs"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-850"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Front + Back Body Figures SIDE BY SIDE */}
      <div className="w-full flex items-center justify-center gap-3 sm:gap-6 py-2">
        {/* Front Figure */}
        <div className="flex-1 max-w-[155px] sm:max-w-[195px] flex flex-col items-center">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
            Front
          </span>
          <svg
            viewBox={MALE_FRONT_VIEWBOX}
            className="w-full h-auto select-none max-h-[290px] sm:max-h-[350px]"
          >
            {frontParts.map((p, i) => renderPart(p, i, "front"))}
          </svg>
        </div>

        {/* Back Figure */}
        <div className="flex-1 max-w-[155px] sm:max-w-[195px] flex flex-col items-center">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
            Back
          </span>
          <svg
            viewBox={MALE_BACK_VIEWBOX}
            className="w-full h-auto select-none max-h-[290px] sm:max-h-[350px]"
          >
            {backParts.map((p, i) => renderPart(p, i, "back"))}
          </svg>
        </div>
      </div>

      {/* High / Low Legend: White Monochrome Gradient Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-400 max-w-xs mx-auto w-full">
        <span className="text-[11px] text-zinc-400 font-medium font-body">Low</span>
        <div className="flex items-center gap-1.5 flex-1 mx-3">
          <div className="h-2 w-full rounded-full bg-gradient-to-r from-zinc-800 via-zinc-400 to-white" />
        </div>
        <span className="text-[11px] text-zinc-200 font-medium font-body">High</span>
      </div>

      {/* Detail Bottom Sheet for Tapped Muscle */}
      <DetailBottomSheet
        isOpen={!!activeMuscleModal}
        onClose={() => setSelectedMuscle(null)}
        title={activeMuscleModal?.name || "Muscle Detail"}
        badge={activeMuscleModal?.category}
        subtitle={
          activeMuscleModal
            ? `${activeMuscleModal.volumePercent}% of sets · ${activeMuscleModal.sets} ${activeMuscleModal.sets === 1 ? "set" : "sets"} logged`
            : undefined
        }
      >
        {activeMuscleModal && activeMuscleModal.exercises.length > 0 ? (
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
              Logged Movements ({activeRangeLabel})
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
            <p>No workout sets logged for this muscle in {activeRangeLabel.toLowerCase()}.</p>
            {activeMuscleModal && (
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                  Calisthenics Target Movements
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
