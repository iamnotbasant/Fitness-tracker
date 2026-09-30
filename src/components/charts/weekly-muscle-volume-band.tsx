"use client"

import { useMemo } from "react"
import type { Workout, Exercise } from "@/lib/types"
import { BarChart3, Info, CheckCircle2 } from "lucide-react"

interface WeeklyMuscleVolumeBandProps {
  workouts: Workout[]
  exercises: Exercise[]
  dateRangeDays?: number
}

interface MuscleVolumeEntry {
  key: string
  name: string
  totalSets: number
  weeklySets: number
  status: "low" | "optimal" | "high"
  statusLabel: string
  color: string
}

const MUSCLE_GROUPS = [
  { key: "chest", name: "Chest", color: "#f43f5e" },
  { key: "back", name: "Back / Lats", color: "#8b5cf6" },
  { key: "shoulders", name: "Shoulders", color: "#0ea5e9" },
  { key: "arms", name: "Arms (Bi/Tri)", color: "#f59e0b" },
  { key: "core", name: "Core & Abs", color: "#14b8a6" },
  { key: "legs", name: "Legs", color: "#10b981" },
]

export function WeeklyMuscleVolumeBand({
  workouts,
  exercises,
  dateRangeDays = 28,
}: WeeklyMuscleVolumeBandProps) {
  const { entries, totalVolumeSets, weeksCount } = useMemo(() => {
    const exIdMap = new Map<string, Exercise>()
    const exNameMap = new Map<string, Exercise>()
    exercises.forEach((e) => {
      exIdMap.set(String(e.id), e)
      if (e.name) exNameMap.set(e.name.toLowerCase().trim(), e)
    })

    const setsByGroup: Record<string, number> = {
      chest: 0,
      back: 0,
      shoulders: 0,
      arms: 0,
      core: 0,
      legs: 0,
    }

    let allSets = 0

    workouts.forEach((w) => {
      const ex =
        exIdMap.get(String(w.exerciseId)) ||
        (w.exerciseName ? exNameMap.get(w.exerciseName.toLowerCase().trim()) : undefined)
      const name = (w.exerciseName || ex?.name || "").toLowerCase()
      const split = (ex?.split || "").toLowerCase()
      const bodyParts = (ex?.bodyParts || []).map((bp) => bp.toLowerCase()).join(" ")
      const sets = Math.max(1, w.sets || 1)
      allSets += sets

      // Attribute to muscle group
      if (/push[- ]?up|bench|chest|pec|dip/i.test(name) || split === "chest" || bodyParts.includes("chest") || bodyParts.includes("pec")) {
        setsByGroup.chest += sets
      } else if (/pull[- ]?up|chin[- ]?up|row|lat|back|trap/i.test(name) || split === "back" || bodyParts.includes("lat") || bodyParts.includes("back")) {
        setsByGroup.back += sets
      } else if (/overhead|shoulder|delt|pike|handstand|lateral raise/i.test(name) || split === "shoulders" || bodyParts.includes("shoulder") || bodyParts.includes("delt")) {
        setsByGroup.shoulders += sets
      } else if (/curl|tricep|bicep|skull crusher/i.test(name) || split === "arms" || bodyParts.includes("bicep") || bodyParts.includes("tricep")) {
        setsByGroup.arms += sets
      } else if (/plank|crunch|core|ab|sit[- ]?up|hollow|leg raise/i.test(name) || split === "core" || bodyParts.includes("core") || bodyParts.includes("ab")) {
        setsByGroup.core += sets
      } else if (/squat|lunge|leg|calf|glute|hamstring|quad/i.test(name) || split === "legs" || bodyParts.includes("leg") || bodyParts.includes("quad") || bodyParts.includes("glute")) {
        setsByGroup.legs += sets
      } else {
        // Fallback: check split
        if (split === "push") setsByGroup.chest += sets
        else if (split === "pull") setsByGroup.back += sets
        else setsByGroup.core += sets
      }
    })

    // Weeks calculation based on window
    const weeks = Math.max(1, Number((dateRangeDays / 7).toFixed(1)))

    const results: MuscleVolumeEntry[] = MUSCLE_GROUPS.map((g) => {
      const sets = setsByGroup[g.key] || 0
      const weekly = Number((sets / weeks).toFixed(1))

      let status: "low" | "optimal" | "high" = "low"
      let statusLabel = "<10 (Low)"

      if (weekly >= 10 && weekly <= 20) {
        status = "optimal"
        statusLabel = "10–20 (Optimal)"
      } else if (weekly > 20) {
        status = "high"
        statusLabel = ">20 (High)"
      }

      return {
        key: g.key,
        name: g.name,
        totalSets: sets,
        weeklySets: weekly,
        status,
        statusLabel,
        color: g.color,
      }
    }).sort((a, b) => b.weeklySets - a.weeklySets)

    return {
      entries: results,
      totalVolumeSets: allSets,
      weeksCount: weeks,
    }
  }, [workouts, exercises, dateRangeDays])

  const maxWeeklyScale = 25 // 0 to 25 sets/week scale

  return (
    <div className="rounded-2xl border border-border/60 bg-[#121318] p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Sets vs. 10–20 Guideline Band</h3>
            <p className="text-[11px] text-muted-foreground">Evidence-based weekly volume targets for hypertrophy and strength</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/40 font-mono">
            Normalized across {weeksCount} {weeksCount === 1 ? "week" : "weeks"}
          </span>
        </div>
      </div>

      {/* Target Band Guide Legend */}
      <div className="flex items-center justify-between text-[11px] px-1 text-muted-foreground bg-secondary/30 p-2.5 rounded-xl border border-border/30">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-xs bg-muted-foreground/40" />
          &lt;10 sets: Maintenance
        </span>
        <span className="flex items-center gap-1.5 font-bold text-emerald-400">
          <span className="h-2 w-2 rounded-xs bg-emerald-500/80" />
          10–20 sets: Optimal Hypertrophy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-xs bg-amber-500/80" />
          &gt;20 sets: Max Recoverable
        </span>
      </div>

      {/* Bars Container */}
      <div className="space-y-3.5 pt-1">
        {entries.map((entry) => {
          const barWidthPercent = Math.min(100, (entry.weeklySets / maxWeeklyScale) * 100)
          const isOptimal = entry.status === "optimal"

          return (
            <div key={entry.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="font-semibold text-foreground truncate">{entry.name}</span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 font-mono">
                  <span className="text-muted-foreground text-[11px]">
                    {entry.totalSets} total sets
                  </span>
                  <span className="text-foreground font-bold text-xs min-w-[50px] text-right">
                    {entry.weeklySets} <span className="text-[10px] text-muted-foreground font-normal">/wk</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                      entry.status === "optimal"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : entry.status === "high"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-secondary text-muted-foreground border border-border/40"
                    }`}
                  >
                    {entry.status === "optimal" ? "Optimal" : entry.status === "high" ? "High" : "Low"}
                  </span>
                </div>
              </div>

              {/* Progress Track with 10–20 Band Overlay */}
              <div className="relative h-2.5 sm:h-3 w-full bg-[#1b1d24] rounded-full overflow-hidden">
                {/* Shaded 10–20 Guideline Band (from 40% to 80% on 0-25 scale) */}
                <div
                  className="absolute top-0 bottom-0 bg-emerald-500/12 border-x border-emerald-500/30"
                  style={{
                    left: `${(10 / maxWeeklyScale) * 100}%`,
                    width: `${((20 - 10) / maxWeeklyScale) * 100}%`,
                  }}
                  title="Target Guideline: 10 to 20 sets per week"
                />

                {/* Actual Volume Fill Bar */}
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOptimal ? "bg-emerald-500" : entry.status === "high" ? "bg-amber-500" : "bg-zinc-500"
                  }`}
                  style={{ width: `${barWidthPercent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {totalVolumeSets === 0 && (
        <div className="text-center py-4 text-xs text-muted-foreground">
          No workout sets logged in this date range.
        </div>
      )}
    </div>
  )
}
