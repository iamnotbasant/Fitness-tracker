"use client"

import { useMemo } from "react"
import type { Workout, Exercise } from "@/lib/types"
import { BarChart2 } from "lucide-react"

export interface MuscleGroupStat {
  name: "Chest" | "Back" | "Shoulders" | "Arms" | "Legs" | "Core"
  sets: number
  percentage: number
  colorClass: string
  bgClass: string
  dotClass: string
}

const MUSCLE_CONFIG: Record<
  MuscleGroupStat["name"],
  { colorClass: string; bgClass: string; dotClass: string }
> = {
  Chest: {
    colorClass: "text-rose-400",
    bgClass: "bg-rose-500",
    dotClass: "bg-rose-500",
  },
  Back: {
    colorClass: "text-violet-400",
    bgClass: "bg-violet-500",
    dotClass: "bg-violet-500",
  },
  Shoulders: {
    colorClass: "text-sky-400",
    bgClass: "bg-sky-500",
    dotClass: "bg-sky-500",
  },
  Arms: {
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500",
    dotClass: "bg-amber-500",
  },
  Legs: {
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500",
    dotClass: "bg-emerald-500",
  },
  Core: {
    colorClass: "text-teal-400",
    bgClass: "bg-teal-500",
    dotClass: "bg-teal-500",
  },
}

export function categorizeExercise(
  ex?: Exercise,
  rawName?: string
): MuscleGroupStat["name"] {
  const name = (rawName || ex?.name || "").toLowerCase()
  const bodyParts = (ex?.bodyParts || []).map((bp) => bp.toLowerCase())
  const split = (ex?.split || "").toLowerCase()

  // High-precision keyword matching on exercise name
  if (/mountain climber|plank|crunch|hollow|v-up|leg raise|sit-up|situp|ab /i.test(name)) {
    return "Core"
  }
  if (/pike|handstand|overhead press|military press|lateral raise|front raise|rear delt|arnold|pseudo planche/i.test(name)) {
    return "Shoulders"
  }
  if (/pull up|pull-up|pullup|chin up|chin-up|chinup|lat pulldown|row|bar hang/i.test(name)) {
    return "Back"
  }
  if (/curl|chair dip|skull crusher|tricep kick/i.test(name)) {
    return "Arms"
  }
  if (/squat|lunge|split squat|calf|glute|hamstring/i.test(name)) {
    return "Legs"
  }
  if (
    /bench press|chest press|chest fly|incline press|decline press|archer push|clapping push|push up|push-up|pushup|dips|dip/i.test(
      name
    )
  ) {
    return "Chest"
  }

  // Check split attribute
  if (split === "core") return "Core"
  if (split === "legs" || split === "lower") return "Legs"

  // Check primary targeted body part
  if (bodyParts[0]?.includes("shoulder") || bodyParts[0]?.includes("delt")) return "Shoulders"
  if (bodyParts[0]?.includes("bicep") || bodyParts[0]?.includes("tricep") || bodyParts[0]?.includes("forearm")) return "Arms"
  if (bodyParts[0]?.includes("chest") || bodyParts[0]?.includes("pec")) return "Chest"
  if (bodyParts[0]?.includes("lat") || bodyParts[0]?.includes("back") || bodyParts[0]?.includes("trap")) return "Back"
  if (bodyParts[0]?.includes("core") || bodyParts[0]?.includes("abs")) return "Core"
  if (bodyParts[0]?.includes("quad") || bodyParts[0]?.includes("glute") || bodyParts[0]?.includes("hamstring") || bodyParts[0]?.includes("calv")) return "Legs"

  // Secondary splits
  if (split === "push") return "Chest"
  if (split === "pull") return "Back"
  if (split === "arms") return "Arms"
  if (split === "shoulders") return "Shoulders"

  return "Core"
}

interface MuscleSplitBreakdownProps {
  workouts: Workout[]
  exercises: Exercise[]
}

export function MuscleSplitBreakdown({ workouts, exercises }: MuscleSplitBreakdownProps) {
  const { groups, totalSets } = useMemo(() => {
    const counts: Record<MuscleGroupStat["name"], number> = {
      Chest: 0,
      Back: 0,
      Shoulders: 0,
      Arms: 0,
      Legs: 0,
      Core: 0,
    }

    const exById = new Map<string, Exercise>()
    const exByName = new Map<string, Exercise>()
    exercises.forEach((e) => {
      exById.set(String(e.id), e)
      if (e.name) exByName.set(e.name.toLowerCase().trim(), e)
    })

    workouts.forEach((w) => {
      const ex =
        exById.get(String(w.exerciseId)) ||
        (w.exerciseName ? exByName.get(w.exerciseName.toLowerCase().trim()) : undefined)
      const sets = Math.max(1, w.sets || 1)
      const targetGroup = categorizeExercise(ex, w.exerciseName || w.name)
      counts[targetGroup] = (counts[targetGroup] || 0) + sets
    })

    const total = Object.values(counts).reduce((sum, v) => sum + v, 0)

    if (total === 0) {
      const emptyGroups: MuscleGroupStat[] = (
        ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"] as MuscleGroupStat["name"][]
      ).map((name) => ({
        name,
        sets: 0,
        percentage: 0,
        ...MUSCLE_CONFIG[name],
      }))
      return { groups: emptyGroups, totalSets: 0 }
    }

    // Largest Remainder Method (Hare-Niemeyer) for 100% exact sum
    const items = (Object.keys(counts) as MuscleGroupStat["name"][]).map((name) => {
      const sets = counts[name]
      const raw = (sets / total) * 100
      const floor = Math.floor(raw)
      const remainder = raw - floor
      return { name, sets, floor, remainder }
    })

    const sumFloor = items.reduce((acc, x) => acc + x.floor, 0)
    const diff = 100 - sumFloor

    const bonusRecipients = new Set(
      [...items]
        .filter((x) => x.sets > 0)
        .sort((a, b) => b.remainder - a.remainder)
        .slice(0, diff)
        .map((x) => x.name)
    )

    const finalGroups: MuscleGroupStat[] = items
      .map((item) => {
        const percentage = item.floor + (bonusRecipients.has(item.name) ? 1 : 0)
        return {
          name: item.name,
          sets: item.sets,
          percentage,
          ...MUSCLE_CONFIG[item.name],
        }
      })
      .sort((a, b) => b.sets - a.sets || b.percentage - a.percentage)

    return { groups: finalGroups, totalSets: total }
  }, [workouts, exercises])

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BarChart2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Muscle Group Breakdown</h2>
            <p className="text-[11px] text-muted-foreground">Percentage of total sets completed</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-secondary/70 border border-border/60 text-xs font-semibold text-foreground">
            {totalSets} {totalSets === 1 ? "set" : "sets"} total
          </span>
        </div>
      </div>

      {/* Muscle Bars */}
      <div className="space-y-3.5 pt-1">
        {groups.map((group) => {
          return (
            <div key={group.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${group.dotClass}`} />
                  <span className="font-semibold text-foreground truncate">{group.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground font-medium">
                    {group.sets} {group.sets === 1 ? "set" : "sets"}
                  </span>
                  <span className="font-bold text-foreground min-w-[36px] text-right">
                    {group.percentage}%
                  </span>
                </div>
              </div>

              {/* Progress bar container */}
              <div className="h-2 sm:h-2.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${group.bgClass}`}
                  style={{ width: `${group.percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {totalSets === 0 && (
        <p className="text-xs text-center text-muted-foreground pt-2">
          No workout sets logged in this date range.
        </p>
      )}
    </div>
  )
}
