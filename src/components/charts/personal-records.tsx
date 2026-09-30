"use client"

import { useMemo } from "react"
import type { Workout } from "@/lib/types"
import { useExercises } from "@/hooks/use-local-data"
import { Trophy } from "lucide-react"

export const formatTime = (sec: number) => {
  if (!sec) return "0s"
  if (sec >= 60) {
    const mins = Math.floor(sec / 60)
    const rem = sec % 60
    return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`
  }
  return `${sec}s`
}

export function PersonalRecords({ workouts }: { workouts: Workout[] }) {
  const { exercises } = useExercises()

  const records = useMemo(() => {
    const timerExerciseNames = new Set(
      (exercises || [])
        .filter((e) => e.type === "timer")
        .map((e) => e.name.toLowerCase())
    )

    const exerciseMap = new Map<
      string,
      {
        name: string
        isTimer: boolean
        maxReps: number
        maxTimeSeconds: number
        maxWeight: number
        prDate: string
      }
    >()

    workouts.forEach((w) => {
      const exName = w.exerciseName || w.name || "Unknown Exercise"
      const lowerName = exName.toLowerCase()
      const isTimer = timerExerciseNames.has(lowerName) || Boolean(w.timeSeconds && w.timeSeconds > 0)

      const existing = exerciseMap.get(exName) || {
        name: exName,
        isTimer,
        maxReps: 0,
        maxTimeSeconds: 0,
        maxWeight: 0,
        prDate: w.date || "",
      }

      if (isTimer) existing.isTimer = true

      const reps = w.reps || 0
      const timeSeconds = w.timeSeconds || (isTimer && reps > 0 ? reps : 0)
      const weight = w.weight || 0

      if (isTimer) {
        if (timeSeconds > existing.maxTimeSeconds) {
          existing.prDate = w.date || existing.prDate
        }
        existing.maxTimeSeconds = Math.max(existing.maxTimeSeconds, timeSeconds)
      } else {
        if (reps > existing.maxReps || (reps === existing.maxReps && weight > existing.maxWeight)) {
          existing.prDate = w.date || existing.prDate
        }
        existing.maxReps = Math.max(existing.maxReps, reps)
        existing.maxWeight = Math.max(existing.maxWeight, weight)
      }

      exerciseMap.set(exName, existing)
    })

    const list = Array.from(exerciseMap.values()).map((r) => {
      let valueDisplay = ""
      if (r.isTimer) {
        valueDisplay = formatTime(r.maxTimeSeconds)
      } else {
        if (r.maxWeight > 0) {
          valueDisplay = `+${r.maxWeight}kg (${r.maxReps}r)`
        } else {
          valueDisplay = `${r.maxReps} reps`
        }
      }

      let dateDisplay = "—"
      if (r.prDate) {
        try {
          const [y, m, d] = r.prDate.slice(0, 10).split("-").map(Number)
          if (y && m && d) {
            dateDisplay = new Date(y, m - 1, d).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          }
        } catch {
          dateDisplay = r.prDate
        }
      }

      return {
        ...r,
        valueDisplay,
        dateDisplay,
      }
    })

    // Sort by recent PR date or reps
    return list.sort((a, b) => b.prDate.localeCompare(a.prDate))
  }, [workouts, exercises])

  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#121216]/90 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.08]">
          <div className="p-2 rounded-xl bg-[#4fa8a0]/10 border border-[#4fa8a0]/25 text-[#4fa8a0]">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight font-display">Personal Records</h2>
            <p className="text-xs text-zinc-400 font-body">Peak milestones across all exercises</p>
          </div>
        </div>
        <p className="text-xs text-zinc-500 py-3 font-body">No personal records logged yet.</p>
      </div>
    )
  }

  const latestPR = records[0]

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#121216]/90 p-4 sm:p-6 shadow-sm space-y-5">
      {/* ─── Section Header (Consistent Icon + Title) ─── */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#4fa8a0]/10 border border-[#4fa8a0]/25 text-[#4fa8a0]">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight font-display">Personal Records</h2>
            <p className="text-xs text-zinc-400 font-body">Peak milestones across all exercises</p>
          </div>
        </div>
      </div>

      {/* ─── Hero Metric: Total PRs Tracked ─── */}
      <div className="pb-1">
        <span className="text-[11px] font-body uppercase tracking-wider text-zinc-400 block mb-1">
          Milestones Reached
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-display tabular-nums">
            {records.length}
          </span>
          <span className="text-sm font-medium text-zinc-400 font-body">personal bests</span>
        </div>
        {latestPR && (
          <p className="text-xs text-zinc-400 font-body mt-1">
            Latest: <strong className="text-zinc-200 font-medium font-body">{latestPR.name}</strong> · <span className="font-display font-bold tabular-nums text-[#6fc4bc]">{latestPR.valueDisplay}</span> on {latestPR.dateDisplay}
          </p>
        )}
      </div>

      {/* ─── Minimal List: Exercise — Value — Date ─── */}
      <div className="divide-y divide-white/[0.06] pt-1">
        {records.map((r) => (
          <div
            key={r.name}
            className="py-3.5 flex items-center justify-between text-xs gap-3 min-h-[48px]"
          >
            <span className="font-medium text-sm text-zinc-100 truncate min-w-0 font-body">
              {r.name}
            </span>
            <div className="flex items-center gap-4 shrink-0 font-display">
              <span className="font-bold text-sm sm:text-base text-[#6fc4bc] tabular-nums">
                {r.valueDisplay}
              </span>
              <span className="text-xs text-zinc-500 min-w-[75px] text-right font-body">
                {r.dateDisplay}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}