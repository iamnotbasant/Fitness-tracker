"use client"

import { useMemo, useState } from "react"
import type { Workout } from "@/lib/types"
import { useExercises } from "@/hooks/use-local-data"
import { Trophy } from "lucide-react"
import soundManager from "@/lib/sounds"
import { DetailBottomSheet } from "./detail-bottom-sheet"

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
  const [selectedRecordName, setSelectedRecordName] = useState<string | null>(null)

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

  const selectedPR = selectedRecordName
    ? records.find((r) => r.name === selectedRecordName) || null
    : null

  // Collect history for selected PR (up to 5 recent sessions)
  const prHistory = useMemo(() => {
    if (!selectedPR) return []

    const matching = workouts.filter(
      (w) =>
        (w.exerciseName && w.exerciseName.toLowerCase() === selectedPR.name.toLowerCase()) ||
        (w.name && w.name.toLowerCase() === selectedPR.name.toLowerCase())
    )

    // Group by date
    const byDate = new Map<string, { date: string; maxReps: number; maxWeight: number; maxTime: number; sets: number }>()

    matching.forEach((w) => {
      const d = (w.date || "").slice(0, 10)
      if (!d) return
      const existing = byDate.get(d) || { date: d, maxReps: 0, maxWeight: 0, maxTime: 0, sets: 0 }
      existing.maxReps = Math.max(existing.maxReps, w.reps || 0)
      existing.maxWeight = Math.max(existing.maxWeight, w.weight || 0)
      existing.maxTime = Math.max(existing.maxTime, w.timeSeconds || 0)
      existing.sets += Math.max(1, w.sets || 1)
      byDate.set(d, existing)
    })

    const sorted = Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date))
    return sorted.slice(0, 5).map((s) => {
      let val = ""
      if (selectedPR.isTimer) {
        val = formatTime(s.maxTime)
      } else {
        if (s.maxWeight > 0) {
          val = `+${s.maxWeight}kg (${s.maxReps}r)`
        } else {
          val = `${s.maxReps} reps`
        }
      }

      let dateFormatted = s.date
      try {
        const [y, m, d] = s.date.split("-").map(Number)
        dateFormatted = new Date(y, m - 1, d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      } catch {}

      return {
        dateStr: dateFormatted,
        value: val,
        sets: s.sets,
      }
    })
  }, [selectedPR, workouts])

  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
          <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-white">
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6 shadow-sm space-y-5">
      {/* ─── Section Header (Monochrome Icon + Title) ─── */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-white">
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
            Latest: <strong className="text-zinc-200 font-medium font-body">{latestPR.name}</strong> · <span className="font-display font-bold tabular-nums text-white">{latestPR.valueDisplay}</span> on {latestPR.dateDisplay}
          </p>
        )}
      </div>

      {/* ─── Minimal List: Tap opens Bottom Sheet Modal (No inline clutter) ─── */}
      <div className="divide-y divide-zinc-800/80 pt-1">
        {records.map((r) => (
          <div
            key={r.name}
            onClick={() => {
              soundManager.play("click", 0.25)
              setSelectedRecordName(r.name)
            }}
            className="py-3 px-2 -mx-2 rounded-xl flex items-center justify-between text-xs gap-3 min-h-[48px] cursor-pointer hover:bg-zinc-850 transition-colors"
          >
            <span className="font-medium text-sm text-zinc-100 truncate min-w-0 font-body">
              {r.name}
            </span>
            <div className="flex items-center gap-4 shrink-0 font-display">
              <span className="font-bold text-sm sm:text-base text-white tabular-nums">
                {r.valueDisplay}
              </span>
              <span className="text-xs text-zinc-500 min-w-[75px] text-right font-body">
                {r.dateDisplay}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Bottom-Sheet Modal for PR History Drilldown (Single, Focused) ─── */}
      <DetailBottomSheet
        isOpen={!!selectedPR}
        onClose={() => setSelectedRecordName(null)}
        title={selectedPR?.name || "Record Milestone"}
        badge="Personal Best"
        subtitle={
          selectedPR
            ? `Peak: ${selectedPR.valueDisplay} · Set on ${selectedPR.dateDisplay}`
            : undefined
        }
      >
        {prHistory.length > 0 ? (
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block">
              Recent Performance History
            </span>
            <div className="space-y-1.5">
              {prHistory.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs"
                >
                  <div className="flex flex-col">
                    <span className="text-zinc-200 font-medium font-body">{s.dateStr}</span>
                    <span className="text-[11px] text-zinc-500">{s.sets} {s.sets === 1 ? "set" : "sets"} logged</span>
                  </div>
                  <span className="font-display tabular-nums text-white font-bold text-sm">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 font-body">
            All-time benchmark established. Continue logging this movement to track session trajectories.
          </div>
        )}
      </DetailBottomSheet>
    </div>
  )
}