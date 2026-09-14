"use client"

import { useState, useMemo, useRef } from "react"
import type { Workout, Exercise } from "@/lib/types"
import { Dumbbell, Flame, Sparkles, Layers, ChevronRight, Activity, Zap } from "lucide-react"

export interface MuscleStat {
  key: string
  name: string
  view: "front" | "back" | "both"
  category: "push" | "pull" | "legs" | "core" | "arms"
  sets: number
  reps: number
  points: number
  exercises: { name: string; sets: number; reps: number }[]
  intensity: "none" | "light" | "moderate" | "intense"
}

interface MuscleAnatomyMapProps {
  workouts: Workout[]
  exercises: Exercise[]
}

type ColorScale = "thermal" | "workout" | "neon"

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
  return clean
}

export function MuscleAnatomyMap({ workouts, exercises }: MuscleAnatomyMapProps) {
  const [activeView, setActiveView] = useState<"both" | "front" | "back">("both")
  const [colorScale, setColorScale] = useState<ColorScale>("thermal")
  const [selectedMuscle, setSelectedMuscle] = useState<string>("chest")
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Compute stats per muscle group
  const muscleStats = useMemo(() => {
    const stats: Record<string, MuscleStat> = {
      chest: { key: "chest", name: "Pectorals (Chest)", view: "front", category: "push", sets: 0, reps: 0, points: 0, exercises: [], intensity: "none" },
      shoulders: { key: "shoulders", name: "Deltoids (Shoulders)", view: "both", category: "push", sets: 0, reps: 0, points: 0, exercises: [], intensity: "none" },
      biceps: { key: "biceps", name: "Biceps", view: "front", category: "arms", sets: 0, reps: 0, points: 0, exercises: [], intensity: "none" },
      triceps: { key: "triceps", name: "Triceps", view: "back", category: "arms", sets: 0, reps: 0, points: 0, exercises: [], intensity: "none" },
      forearms: { key: "forearms", name: "Forearms", view: "both", category: "arms", sets: 0, reps: 0, points: 0, exercises: [], intensity: "none" },
      core: { key: "core", name: "Abdominals (Core)", view: "front", category: "core", sets: 0, reps: 0, points: 0, exercises: [], intensity: "none" },
      obliques: { key: "obliques", name: "Obliques", view: "front", category: "core", sets: 0, reps: 0, points: 0, exercises: [], intensity: "none" },
      traps: { key: "traps", name: "Trapezius (Upper Back)", view: "back", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: "none" },
      lats: { key: "lats", name: "Latissimus Dorsi", view: "back", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: "none" },
      "lower back": { key: "lower back", name: "Lower Back", view: "back", category: "pull", sets: 0, reps: 0, points: 0, exercises: [], intensity: "none" },
      glutes: { key: "glutes", name: "Gluteals", view: "back", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: "none" },
      quads: { key: "quads", name: "Quadriceps", view: "front", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: "none" },
      hamstrings: { key: "hamstrings", name: "Hamstrings", view: "back", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: "none" },
      calves: { key: "calves", name: "Calves", view: "both", category: "legs", sets: 0, reps: 0, points: 0, exercises: [], intensity: "none" },
    }

    const exMap = new Map<string, Exercise>()
    exercises.forEach((ex) => exMap.set(String(ex.id), ex))

    workouts.forEach((w) => {
      const ex = exMap.get(String(w.exerciseId))
      const parts = ex?.bodyParts || []
      const points = w.points ?? w.total_points ?? 0
      const reps = w.reps || 0
      const sets = w.sets || 1

      parts.forEach((p) => {
        const key = normalizeBodyPart(p)
        if (stats[key]) {
          stats[key].sets += sets
          stats[key].reps += reps
          stats[key].points += points

          const existingEx = stats[key].exercises.find((e) => e.name === w.exerciseName)
          if (existingEx) {
            existingEx.sets += sets
            existingEx.reps += reps
          } else {
            stats[key].exercises.push({ name: w.exerciseName, sets, reps })
          }
        }
      })
    })

    // Assign intensity levels based on sets
    Object.values(stats).forEach((s) => {
      if (s.sets === 0) s.intensity = "none"
      else if (s.sets <= 12) s.intensity = "light"
      else if (s.sets <= 30) s.intensity = "moderate"
      else s.intensity = "intense"

      s.exercises.sort((a, b) => b.sets - a.sets)
    })

    return stats
  }, [workouts, exercises])

  // Overview metrics
  const summary = useMemo(() => {
    let trainedCount = 0
    let totalSets = 0
    let totalPoints = 0
    let maxSets = 0
    let topMuscle: MuscleStat | null = null

    Object.values(muscleStats).forEach((s) => {
      if (s.sets > 0) trainedCount++
      totalSets += s.sets
      totalPoints += s.points
      if (s.sets > maxSets) {
        maxSets = s.sets
        topMuscle = s
      }
    })

    return { trainedCount, totalSets, totalPoints, topMuscle }
  }, [muscleStats])

  // MuscleMap color mapping
  const getMuscleColor = (key: string, isSelected: boolean, isHovered: boolean) => {
    const stat = muscleStats[key]
    const intensity = stat?.intensity || "none"

    if (activeCategory !== "all" && stat?.category !== activeCategory) {
      return "#1e293b22"
    }

    if (isSelected) {
      return colorScale === "thermal" ? "#ef4444" : colorScale === "workout" ? "#f97316" : "#00f0ff"
    }

    if (isHovered) {
      return colorScale === "thermal" ? "#fb923c" : colorScale === "workout" ? "#fbbf24" : "#38bdf8"
    }

    if (colorScale === "thermal") {
      // Blue -> Green -> Amber -> Red
      switch (intensity) {
        case "intense":
          return "#ef4444" // Thermal Red
        case "moderate":
          return "#f59e0b" // Thermal Amber/Yellow
        case "light":
          return "#10b981" // Thermal Green
        default:
          return "#1e293b" // Muted Slate
      }
    } else if (colorScale === "workout") {
      // Gray -> Warm Amber -> Vivid Orange -> Flame Red
      switch (intensity) {
        case "intense":
          return "#dc2626"
        case "moderate":
          return "#ea580c"
        case "light":
          return "#d97706"
        default:
          return "#1e293b"
      }
    } else {
      // Neon: Dark Cobalt -> Cyan -> Electric Glow
      switch (intensity) {
        case "intense":
          return "#00f0ff"
        case "moderate":
          return "#0284c7"
        case "light":
          return "#0369a1"
        default:
          return "#1e293b"
      }
    }
  }

  const getMuscleStroke = (key: string, isSelected: boolean, isHovered: boolean) => {
    if (isSelected) return "#ffffff"
    if (isHovered) return "#93c5fd"
    const stat = muscleStats[key]
    if (stat && stat.sets > 0) {
      return colorScale === "thermal" ? "#f9731688" : colorScale === "workout" ? "#ea580c88" : "#38bdf888"
    }
    return "#334155"
  }

  const handleMouseMove = (e: React.MouseEvent, key: string) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 10,
      })
    }
    setHoveredMuscle(key)
  }

  const activeStat = muscleStats[selectedMuscle] || muscleStats["chest"]
  const hoveredStat = hoveredMuscle ? muscleStats[hoveredMuscle] : null

  return (
    <div ref={containerRef} className="relative rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-5">
      {/* Real-time Floating Tooltip */}
      {hoveredStat && tooltipPos && (
        <div
          className="pointer-events-none absolute z-40 transform -translate-x-1/2 -translate-y-full px-3 py-1.5 rounded-xl bg-popover text-popover-foreground text-xs shadow-2xl border border-border backdrop-blur-md transition-all duration-75 flex items-center gap-2 select-none"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: getMuscleColor(hoveredStat.key, false, false) }}
          />
          <div>
            <span className="font-bold">{hoveredStat.name}</span>
            <span className="text-muted-foreground ml-1.5 font-medium">
              {hoveredStat.sets > 0 ? `${hoveredStat.sets} sets • ${hoveredStat.points.toLocaleString()} pts` : "No sets logged"}
            </span>
          </div>
        </div>
      )}

      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            Muscle Activation Heatmap
          </h2>
          <p className="text-xs text-muted-foreground">
            Interactive human body map of training volume & muscular fatigue
          </p>
        </div>

        {/* View Switcher & Color Schemes */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Color Scale Pill */}
          <div className="flex items-center bg-secondary/70 p-1 rounded-xl border border-border/50">
            <button
              onClick={() => setColorScale("thermal")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                colorScale === "thermal" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Thermal Scale (Blue to Red)"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444] shadow-[0_0_6px_#ef4444]" />
              <span className="hidden xs:inline">Thermal</span>
            </button>
            <button
              onClick={() => setColorScale("workout")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                colorScale === "workout" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Workout Fire (Gold to Crimson)"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#f97316] shadow-[0_0_6px_#f97316]" />
              <span className="hidden xs:inline">Fire</span>
            </button>
            <button
              onClick={() => setColorScale("neon")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                colorScale === "neon" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Neon Cyan"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#00f0ff] shadow-[0_0_6px_#00f0ff]" />
              <span className="hidden xs:inline">Neon</span>
            </button>
          </div>

          {/* View Toggle (Both / Front / Back) */}
          <div className="flex items-center bg-secondary/70 p-1 rounded-xl border border-border/50">
            <button
              onClick={() => setActiveView("both")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeView === "both" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Both
            </button>
            <button
              onClick={() => setActiveView("front")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeView === "front" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Front
            </button>
            <button
              onClick={() => setActiveView("back")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeView === "back" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Muscle Group Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-muted-foreground mr-1 shrink-0">Filter:</span>
        {[
          { key: "all", label: "All Muscles" },
          { key: "push", label: "Push (Chest/Delts/Triceps)" },
          { key: "pull", label: "Pull (Lats/Traps/Biceps)" },
          { key: "legs", label: "Legs (Quads/Hamstrings/Glutes)" },
          { key: "core", label: "Core" },
          { key: "arms", label: "Arms" },
        ].map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeCategory === cat.key
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Interactive Anatomy Display & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
        {/* Anatomy SVG Display */}
        <div className={`lg:col-span-7 flex ${activeView === "both" ? "flex-row justify-around gap-2 sm:gap-6" : "justify-center"} items-center py-6 bg-gradient-to-b from-secondary/30 via-secondary/15 to-transparent rounded-2xl border border-border/60 p-4 shadow-inner min-h-[440px]`}>
          
          {/* Anterior (Front) Model */}
          {(activeView === "both" || activeView === "front") && (
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Anterior (Front)
              </span>

              <svg
                viewBox="0 0 240 460"
                className={`${activeView === "both" ? "w-36 sm:w-52" : "w-60 sm:w-72"} h-auto drop-shadow-xl select-none transition-transform duration-200`}
              >
                <defs>
                  <linearGradient id="mannequin-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                </defs>

                {/* Humanoid Athletic Base Silhouette */}
                <path
                  d="M120 16 C106 16 98 30 98 46 C98 62 106 72 112 76 L112 82 C92 86 76 100 72 120 L64 176 C62 190 66 206 74 214 L78 216 L76 258 L76 300 L84 394 C86 406 98 406 100 394 L110 258 L120 258 L130 258 L140 394 C142 406 154 406 156 394 L164 300 L164 258 L162 216 L166 214 C174 206 178 190 176 176 L168 120 C164 100 148 86 128 82 L128 76 C134 72 142 62 142 46 C142 30 134 16 120 16 Z"
                  fill="url(#mannequin-fill)"
                  stroke="#334155"
                  strokeWidth="2"
                  opacity="0.9"
                />

                {/* Head & Neck */}
                <ellipse cx="120" cy="46" rx="16" ry="22" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                <path d="M112 68 Q120 72 128 68 L128 80 L112 80 Z" fill="#1e293b" />

                {/* Left Deltoid (Shoulder) */}
                <path
                  d="M94 86 C82 89 73 99 72 112 C71 122 76 130 82 134 C86 130 89 120 91 110 C92 102 94 94 94 86 Z"
                  fill={getMuscleColor("shoulders", selectedMuscle === "shoulders", hoveredMuscle === "shoulders")}
                  stroke={getMuscleStroke("shoulders", selectedMuscle === "shoulders", hoveredMuscle === "shoulders")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("shoulders")}
                  onMouseMove={(e) => handleMouseMove(e, "shoulders")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />
                {/* Right Deltoid (Shoulder) */}
                <path
                  d="M146 86 C158 89 167 99 168 112 C169 122 164 130 158 134 C154 130 151 120 149 110 C148 102 146 94 146 86 Z"
                  fill={getMuscleColor("shoulders", selectedMuscle === "shoulders", hoveredMuscle === "shoulders")}
                  stroke={getMuscleStroke("shoulders", selectedMuscle === "shoulders", hoveredMuscle === "shoulders")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("shoulders")}
                  onMouseMove={(e) => handleMouseMove(e, "shoulders")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />

                {/* Left Pectoralis (Chest) */}
                <path
                  d="M118 88 C104 88 94 92 92 102 C90 112 90 124 95 130 C104 134 114 132 118 130 Z"
                  fill={getMuscleColor("chest", selectedMuscle === "chest", hoveredMuscle === "chest")}
                  stroke={getMuscleStroke("chest", selectedMuscle === "chest", hoveredMuscle === "chest")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("chest")}
                  onMouseMove={(e) => handleMouseMove(e, "chest")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />
                {/* Right Pectoralis (Chest) */}
                <path
                  d="M122 88 C136 88 146 92 148 102 C150 112 150 124 145 130 C136 134 126 132 122 130 Z"
                  fill={getMuscleColor("chest", selectedMuscle === "chest", hoveredMuscle === "chest")}
                  stroke={getMuscleStroke("chest", selectedMuscle === "chest", hoveredMuscle === "chest")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("chest")}
                  onMouseMove={(e) => handleMouseMove(e, "chest")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />

                {/* Left Bicep */}
                <path
                  d="M72 120 C67 126 66 138 68 150 C70 156 74 160 79 158 C82 152 84 140 82 128 Z"
                  fill={getMuscleColor("biceps", selectedMuscle === "biceps", hoveredMuscle === "biceps")}
                  stroke={getMuscleStroke("biceps", selectedMuscle === "biceps", hoveredMuscle === "biceps")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("biceps")}
                  onMouseMove={(e) => handleMouseMove(e, "biceps")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />
                {/* Right Bicep */}
                <path
                  d="M168 120 C173 126 174 138 172 150 C170 156 166 160 161 158 C158 152 156 140 158 128 Z"
                  fill={getMuscleColor("biceps", selectedMuscle === "biceps", hoveredMuscle === "biceps")}
                  stroke={getMuscleStroke("biceps", selectedMuscle === "biceps", hoveredMuscle === "biceps")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("biceps")}
                  onMouseMove={(e) => handleMouseMove(e, "biceps")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />

                {/* Left Forearm */}
                <path
                  d="M68 160 C62 170 59 188 61 208 C63 214 68 216 72 210 C76 200 78 180 77 164 Z"
                  fill={getMuscleColor("forearms", selectedMuscle === "forearms", hoveredMuscle === "forearms")}
                  stroke={getMuscleStroke("forearms", selectedMuscle === "forearms", hoveredMuscle === "forearms")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("forearms")}
                  onMouseMove={(e) => handleMouseMove(e, "forearms")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />
                {/* Right Forearm */}
                <path
                  d="M172 160 C178 170 181 188 179 208 C177 214 172 216 168 210 C164 200 162 180 163 164 Z"
                  fill={getMuscleColor("forearms", selectedMuscle === "forearms", hoveredMuscle === "forearms")}
                  stroke={getMuscleStroke("forearms", selectedMuscle === "forearms", hoveredMuscle === "forearms")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("forearms")}
                  onMouseMove={(e) => handleMouseMove(e, "forearms")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />

                {/* Abdominals (Core) */}
                <g
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("core")}
                  onMouseMove={(e) => handleMouseMove(e, "core")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                >
                  <rect x="107" y="136" width="11" height="13" rx="2.5" fill={getMuscleColor("core", selectedMuscle === "core", hoveredMuscle === "core")} stroke={getMuscleStroke("core", selectedMuscle === "core", hoveredMuscle === "core")} strokeWidth="1" />
                  <rect x="122" y="136" width="11" height="13" rx="2.5" fill={getMuscleColor("core", selectedMuscle === "core", hoveredMuscle === "core")} stroke={getMuscleStroke("core", selectedMuscle === "core", hoveredMuscle === "core")} strokeWidth="1" />
                  <rect x="107" y="152" width="11" height="13" rx="2.5" fill={getMuscleColor("core", selectedMuscle === "core", hoveredMuscle === "core")} stroke={getMuscleStroke("core", selectedMuscle === "core", hoveredMuscle === "core")} strokeWidth="1" />
                  <rect x="122" y="152" width="11" height="13" rx="2.5" fill={getMuscleColor("core", selectedMuscle === "core", hoveredMuscle === "core")} stroke={getMuscleStroke("core", selectedMuscle === "core", hoveredMuscle === "core")} strokeWidth="1" />
                  <path d="M107 168 L118 168 L117 186 L109 184 Z" rx="2" fill={getMuscleColor("core", selectedMuscle === "core", hoveredMuscle === "core")} stroke={getMuscleStroke("core", selectedMuscle === "core", hoveredMuscle === "core")} strokeWidth="1" />
                  <path d="M122 168 L133 168 L131 184 L123 186 Z" rx="2" fill={getMuscleColor("core", selectedMuscle === "core", hoveredMuscle === "core")} stroke={getMuscleStroke("core", selectedMuscle === "core", hoveredMuscle === "core")} strokeWidth="1" />
                </g>

                {/* Left Obliques */}
                <path
                  d="M93 138 C95 150 95 166 97 180 C92 178 88 170 87 156 C87 146 89 139 93 138 Z"
                  fill={getMuscleColor("obliques", selectedMuscle === "obliques", hoveredMuscle === "obliques")}
                  stroke={getMuscleStroke("obliques", selectedMuscle === "obliques", hoveredMuscle === "obliques")}
                  strokeWidth="1"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("obliques")}
                  onMouseMove={(e) => handleMouseMove(e, "obliques")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />
                {/* Right Obliques */}
                <path
                  d="M147 138 C145 150 145 166 143 180 C148 178 152 170 153 156 C153 146 151 139 147 138 Z"
                  fill={getMuscleColor("obliques", selectedMuscle === "obliques", hoveredMuscle === "obliques")}
                  stroke={getMuscleStroke("obliques", selectedMuscle === "obliques", hoveredMuscle === "obliques")}
                  strokeWidth="1"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("obliques")}
                  onMouseMove={(e) => handleMouseMove(e, "obliques")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />

                {/* Left Quadriceps */}
                <g
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("quads")}
                  onMouseMove={(e) => handleMouseMove(e, "quads")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                >
                  <path
                    d="M90 200 C84 216 83 244 86 268 C90 272 94 270 96 258 C94 238 94 214 96 200 Z"
                    fill={getMuscleColor("quads", selectedMuscle === "quads", hoveredMuscle === "quads")}
                    stroke={getMuscleStroke("quads", selectedMuscle === "quads", hoveredMuscle === "quads")}
                    strokeWidth="1.2"
                  />
                  <path
                    d="M98 202 C106 204 110 220 110 252 C108 270 102 278 100 278 C96 274 96 252 98 202 Z"
                    fill={getMuscleColor("quads", selectedMuscle === "quads", hoveredMuscle === "quads")}
                    stroke={getMuscleStroke("quads", selectedMuscle === "quads", hoveredMuscle === "quads")}
                    strokeWidth="1.2"
                  />
                  <path
                    d="M112 240 C116 248 116 266 112 278 C108 278 106 270 108 254 Z"
                    fill={getMuscleColor("quads", selectedMuscle === "quads", hoveredMuscle === "quads")}
                    stroke={getMuscleStroke("quads", selectedMuscle === "quads", hoveredMuscle === "quads")}
                    strokeWidth="1.2"
                  />
                </g>

                {/* Right Quadriceps */}
                <g
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("quads")}
                  onMouseMove={(e) => handleMouseMove(e, "quads")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                >
                  <path
                    d="M150 200 C156 216 157 244 154 268 C150 272 146 270 144 258 C146 238 146 214 144 200 Z"
                    fill={getMuscleColor("quads", selectedMuscle === "quads", hoveredMuscle === "quads")}
                    stroke={getMuscleStroke("quads", selectedMuscle === "quads", hoveredMuscle === "quads")}
                    strokeWidth="1.2"
                  />
                  <path
                    d="M142 202 C134 204 130 220 130 252 C132 270 138 278 140 278 C144 274 144 252 142 202 Z"
                    fill={getMuscleColor("quads", selectedMuscle === "quads", hoveredMuscle === "quads")}
                    stroke={getMuscleStroke("quads", selectedMuscle === "quads", hoveredMuscle === "quads")}
                    strokeWidth="1.2"
                  />
                  <path
                    d="M128 240 C124 248 124 266 128 278 C132 278 134 270 132 254 Z"
                    fill={getMuscleColor("quads", selectedMuscle === "quads", hoveredMuscle === "quads")}
                    stroke={getMuscleStroke("quads", selectedMuscle === "quads", hoveredMuscle === "quads")}
                    strokeWidth="1.2"
                  />
                </g>

                {/* Left Calf / Shin */}
                <path
                  d="M92 292 C98 294 106 296 108 308 L105 376 C100 380 96 374 94 354 L90 314 C89 300 90 294 92 292 Z"
                  fill={getMuscleColor("calves", selectedMuscle === "calves", hoveredMuscle === "calves")}
                  stroke={getMuscleStroke("calves", selectedMuscle === "calves", hoveredMuscle === "calves")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("calves")}
                  onMouseMove={(e) => handleMouseMove(e, "calves")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />
                {/* Right Calf / Shin */}
                <path
                  d="M148 292 C142 294 134 296 132 308 L135 376 C140 380 144 374 146 354 L150 314 C151 300 150 294 148 292 Z"
                  fill={getMuscleColor("calves", selectedMuscle === "calves", hoveredMuscle === "calves")}
                  stroke={getMuscleStroke("calves", selectedMuscle === "calves", hoveredMuscle === "calves")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("calves")}
                  onMouseMove={(e) => handleMouseMove(e, "calves")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />
              </svg>
            </div>
          )}

          {/* Posterior (Back) Model */}
          {(activeView === "both" || activeView === "back") && (
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Posterior (Back)
              </span>

              <svg
                viewBox="0 0 240 460"
                className={`${activeView === "both" ? "w-36 sm:w-52" : "w-60 sm:w-72"} h-auto drop-shadow-xl select-none transition-transform duration-200`}
              >
                {/* Base Body Silhouette */}
                <path
                  d="M120 16 C106 16 98 30 98 46 C98 62 106 72 112 76 L112 82 C92 86 76 100 72 120 L64 176 C62 190 66 206 74 214 L78 216 L76 258 L76 300 L84 394 C86 406 98 406 100 394 L110 258 L120 258 L130 258 L140 394 C142 406 154 406 156 394 L164 300 L164 258 L162 216 L166 214 C174 206 178 190 176 176 L168 120 C164 100 148 86 128 82 L128 76 C134 72 142 62 142 46 C142 30 134 16 120 16 Z"
                  fill="url(#mannequin-fill)"
                  stroke="#334155"
                  strokeWidth="2"
                  opacity="0.9"
                />

                {/* Head (Back View) */}
                <ellipse cx="120" cy="46" rx="16" ry="22" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

                {/* Trapezius */}
                <path
                  d="M120 70 L136 90 L127 126 L120 136 L113 126 L104 90 Z"
                  fill={getMuscleColor("traps", selectedMuscle === "traps", hoveredMuscle === "traps")}
                  stroke={getMuscleStroke("traps", selectedMuscle === "traps", hoveredMuscle === "traps")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("traps")}
                  onMouseMove={(e) => handleMouseMove(e, "traps")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />

                {/* Rear Deltoids */}
                <path
                  d="M96 86 C84 90 75 100 74 112 C73 122 78 128 82 130 L88 114 C88 102 88 94 96 86 Z"
                  fill={getMuscleColor("shoulders", selectedMuscle === "shoulders", hoveredMuscle === "shoulders")}
                  stroke={getMuscleStroke("shoulders", selectedMuscle === "shoulders", hoveredMuscle === "shoulders")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("shoulders")}
                  onMouseMove={(e) => handleMouseMove(e, "shoulders")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />
                <path
                  d="M144 86 C156 90 165 100 166 112 C167 122 162 128 158 130 L152 114 C152 102 152 94 144 86 Z"
                  fill={getMuscleColor("shoulders", selectedMuscle === "shoulders", hoveredMuscle === "shoulders")}
                  stroke={getMuscleStroke("shoulders", selectedMuscle === "shoulders", hoveredMuscle === "shoulders")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("shoulders")}
                  onMouseMove={(e) => handleMouseMove(e, "shoulders")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />

                {/* Left Tricep */}
                <path
                  d="M74 124 C70 130 69 140 71 152 C73 158 77 160 81 156 C83 150 84 138 82 126 Z"
                  fill={getMuscleColor("triceps", selectedMuscle === "triceps", hoveredMuscle === "triceps")}
                  stroke={getMuscleStroke("triceps", selectedMuscle === "triceps", hoveredMuscle === "triceps")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("triceps")}
                  onMouseMove={(e) => handleMouseMove(e, "triceps")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />
                {/* Right Tricep */}
                <path
                  d="M166 124 C170 130 171 140 169 152 C167 158 163 160 159 156 C157 150 156 138 158 126 Z"
                  fill={getMuscleColor("triceps", selectedMuscle === "triceps", hoveredMuscle === "triceps")}
                  stroke={getMuscleStroke("triceps", selectedMuscle === "triceps", hoveredMuscle === "triceps")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("triceps")}
                  onMouseMove={(e) => handleMouseMove(e, "triceps")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />

                {/* Left Latissimus Dorsi */}
                <path
                  d="M98 106 C108 116 114 130 116 152 L116 166 C104 166 94 154 90 138 C88 128 91 114 98 106 Z"
                  fill={getMuscleColor("lats", selectedMuscle === "lats", hoveredMuscle === "lats")}
                  stroke={getMuscleStroke("lats", selectedMuscle === "lats", hoveredMuscle === "lats")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("lats")}
                  onMouseMove={(e) => handleMouseMove(e, "lats")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />
                {/* Right Latissimus Dorsi */}
                <path
                  d="M142 106 C132 116 126 130 124 152 L124 166 C136 166 146 154 150 138 C152 128 149 114 142 106 Z"
                  fill={getMuscleColor("lats", selectedMuscle === "lats", hoveredMuscle === "lats")}
                  stroke={getMuscleStroke("lats", selectedMuscle === "lats", hoveredMuscle === "lats")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("lats")}
                  onMouseMove={(e) => handleMouseMove(e, "lats")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />

                {/* Lower Back */}
                <path
                  d="M112 164 L128 164 L126 186 L114 186 Z"
                  fill={getMuscleColor("lower back", selectedMuscle === "lower back", hoveredMuscle === "lower back")}
                  stroke={getMuscleStroke("lower back", selectedMuscle === "lower back", hoveredMuscle === "lower back")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("lower back")}
                  onMouseMove={(e) => handleMouseMove(e, "lower back")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />

                {/* Left Gluteal */}
                <path
                  d="M95 190 C105 190 116 194 118 208 C118 226 107 240 94 236 C86 234 86 210 95 190 Z"
                  fill={getMuscleColor("glutes", selectedMuscle === "glutes", hoveredMuscle === "glutes")}
                  stroke={getMuscleStroke("glutes", selectedMuscle === "glutes", hoveredMuscle === "glutes")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("glutes")}
                  onMouseMove={(e) => handleMouseMove(e, "glutes")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />
                {/* Right Gluteal */}
                <path
                  d="M145 190 C135 190 124 194 122 208 C122 226 133 240 146 236 C154 234 154 210 145 190 Z"
                  fill={getMuscleColor("glutes", selectedMuscle === "glutes", hoveredMuscle === "glutes")}
                  stroke={getMuscleStroke("glutes", selectedMuscle === "glutes", hoveredMuscle === "glutes")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("glutes")}
                  onMouseMove={(e) => handleMouseMove(e, "glutes")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />

                {/* Left Hamstring */}
                <path
                  d="M93 242 C100 244 112 244 116 252 L114 286 C105 288 95 284 91 274 L89 252 Z"
                  fill={getMuscleColor("hamstrings", selectedMuscle === "hamstrings", hoveredMuscle === "hamstrings")}
                  stroke={getMuscleStroke("hamstrings", selectedMuscle === "hamstrings", hoveredMuscle === "hamstrings")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("hamstrings")}
                  onMouseMove={(e) => handleMouseMove(e, "hamstrings")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />
                {/* Right Hamstring */}
                <path
                  d="M147 242 C140 244 128 244 124 252 L126 286 C135 288 145 284 149 274 L151 252 Z"
                  fill={getMuscleColor("hamstrings", selectedMuscle === "hamstrings", hoveredMuscle === "hamstrings")}
                  stroke={getMuscleStroke("hamstrings", selectedMuscle === "hamstrings", hoveredMuscle === "hamstrings")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("hamstrings")}
                  onMouseMove={(e) => handleMouseMove(e, "hamstrings")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />

                {/* Left Posterior Calf */}
                <path
                  d="M90 296 C98 298 108 300 109 314 L107 372 C102 376 97 370 94 352 L89 318 C88 304 89 298 90 296 Z"
                  fill={getMuscleColor("calves", selectedMuscle === "calves", hoveredMuscle === "calves")}
                  stroke={getMuscleStroke("calves", selectedMuscle === "calves", hoveredMuscle === "calves")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("calves")}
                  onMouseMove={(e) => handleMouseMove(e, "calves")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />
                {/* Right Posterior Calf */}
                <path
                  d="M150 296 C142 298 132 300 131 314 L133 372 C138 376 143 370 146 352 L151 318 C152 304 151 298 150 296 Z"
                  fill={getMuscleColor("calves", selectedMuscle === "calves", hoveredMuscle === "calves")}
                  stroke={getMuscleStroke("calves", selectedMuscle === "calves", hoveredMuscle === "calves")}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150 hover:brightness-115"
                  onClick={() => setSelectedMuscle("calves")}
                  onMouseMove={(e) => handleMouseMove(e, "calves")}
                  onMouseLeave={() => setHoveredMuscle(null)}
                />
              </svg>
            </div>
          )}
        </div>

        {/* Muscle Details Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-4 shadow-sm">
            {/* Header & Status */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Focused Muscle
                </span>
                <h3 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2 mt-0.5">
                  {activeStat.name}
                </h3>
              </div>
              <span
                className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border shadow-sm ${
                  activeStat.intensity === "intense"
                    ? "bg-red-500/15 text-red-500 border-red-500/30"
                    : activeStat.intensity === "moderate"
                    ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                    : activeStat.intensity === "light"
                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {activeStat.intensity === "none" ? "Resting" : `${activeStat.intensity} load`}
              </span>
            </div>

            {/* Metrics Trio */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded-xl bg-secondary/40 border border-border/40 p-3 text-center">
                <span className="text-[11px] text-muted-foreground block font-medium">Sets</span>
                <span className="text-xl font-black">{activeStat.sets}</span>
              </div>
              <div className="rounded-xl bg-secondary/40 border border-border/40 p-3 text-center">
                <span className="text-[11px] text-muted-foreground block font-medium">Reps</span>
                <span className="text-xl font-black">{activeStat.reps.toLocaleString()}</span>
              </div>
              <div className="rounded-xl bg-secondary/40 border border-border/40 p-3 text-center">
                <span className="text-[11px] text-muted-foreground block font-medium">Points</span>
                <span className="text-xl font-black text-primary">{activeStat.points.toLocaleString()}</span>
              </div>
            </div>

            {/* Volume Saturation Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Volume Load:</span>
                <span className="font-bold text-foreground">
                  {activeStat.sets === 0 ? "0% (Fully Rested)" : activeStat.sets >= 30 ? "100% (Maximum Volume)" : `${Math.round((activeStat.sets / 30) * 100)}% (Active Growth)`}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(4, (activeStat.sets / 30) * 100))}%`,
                    backgroundColor: getMuscleColor(activeStat.key, false, false),
                  }}
                />
              </div>
            </div>

            {/* Logged Exercises List */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <span className="text-xs font-bold text-muted-foreground block">
                Logged Exercises ({activeStat.exercises.length}):
              </span>
              {activeStat.exercises.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center bg-secondary/20 rounded-xl border border-dashed border-border/60">
                  No recorded workouts yet for this muscle group.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {activeStat.exercises.map((ex) => (
                    <div
                      key={ex.name}
                      className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-secondary/40 hover:bg-secondary/70 border border-border/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Dumbbell className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-semibold truncate">{ex.name}</span>
                      </div>
                      <span className="font-bold text-foreground bg-background/80 px-2 py-0.5 rounded-md border border-border/50 shrink-0">
                        {ex.sets} sets • {ex.reps} reps
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Muscle Selector Pills */}
          <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
            <span className="text-xs font-bold text-muted-foreground block mb-2">
              Tap Any Muscle:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(muscleStats).map((stat) => (
                <button
                  key={stat.key}
                  onClick={() => setSelectedMuscle(stat.key)}
                  className={`text-xs px-2.5 py-1 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedMuscle === stat.key
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                      : "bg-secondary/40 hover:bg-secondary border-border/60 text-foreground"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: getMuscleColor(stat.key, false, false) }}
                  />
                  <span>{stat.name.split(" ")[0]}</span>
                  {stat.sets > 0 && (
                    <span className="text-[10px] font-bold opacity-75">({stat.sets})</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Legend Bar */}
      <div className="pt-3 border-t border-border/60 flex items-center justify-between flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Heatmap Intensity:</span>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#1e293b] border border-border" />
            <span>Resting (0 sets)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: colorScale === "thermal" ? "#10b981" : colorScale === "workout" ? "#d97706" : "#0369a1",
              }}
            />
            <span>Light Load</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: colorScale === "thermal" ? "#f59e0b" : colorScale === "workout" ? "#ea580c" : "#0284c7",
              }}
            />
            <span>Moderate Load</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full shadow-sm"
              style={{
                backgroundColor: colorScale === "thermal" ? "#ef4444" : colorScale === "workout" ? "#dc2626" : "#00f0ff",
              }}
            />
            <span className="font-semibold text-foreground">High Load (30+ sets)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
