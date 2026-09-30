"use client"

import { useMemo } from "react"
import type { Workout, Exercise } from "@/lib/types"
import { Scale, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react"

interface PushPullBalanceProps {
  workouts: Workout[]
  exercises: Exercise[]
}

// Exercise categorization helpers for Calisthenics
function isPush(name: string, split?: string, bodyParts?: string[]): boolean {
  const n = name.toLowerCase()
  const s = (split || "").toLowerCase()
  const bp = (bodyParts || []).map((p) => p.toLowerCase()).join(" ")

  if (/push[- ]?up|dip|press|handstand|pike|chest|tricep|front delt|lateral raise/i.test(n)) return true
  if (s === "push" || s === "chest" || s === "shoulders") return true
  if (bp.includes("chest") || bp.includes("tricep") || bp.includes("shoulder") || bp.includes("pec")) return true
  return false
}

function isPull(name: string, split?: string, bodyParts?: string[]): boolean {
  const n = name.toLowerCase()
  const s = (split || "").toLowerCase()
  const bp = (bodyParts || []).map((p) => p.toLowerCase()).join(" ")

  if (/pull[- ]?up|chin[- ]?up|row|curl|hang|lat |pulldown|rear delt|trap|face pull/i.test(n)) return true
  if (s === "pull" || s === "back" || s === "arms") return true
  if (bp.includes("lat") || bp.includes("back") || bp.includes("bicep") || bp.includes("trap")) return true
  return false
}

export function PushPullBalance({ workouts, exercises }: PushPullBalanceProps) {
  const stats = useMemo(() => {
    const exIdMap = new Map<string, Exercise>()
    const exNameMap = new Map<string, Exercise>()
    exercises.forEach((e) => {
      exIdMap.set(String(e.id), e)
      if (e.name) exNameMap.set(e.name.toLowerCase().trim(), e)
    })

    let pushSets = 0
    let pullSets = 0
    let pushReps = 0
    let pullReps = 0

    workouts.forEach((w) => {
      const ex =
        exIdMap.get(String(w.exerciseId)) ||
        (w.exerciseName ? exNameMap.get(w.exerciseName.toLowerCase().trim()) : undefined)
      const name = w.exerciseName || ex?.name || "Exercise"
      const sets = Math.max(1, w.sets || 1)
      const reps = w.reps || 0
      const split = ex?.split
      const bodyParts = ex?.bodyParts

      const pushMatch = isPush(name, split, bodyParts)
      const pullMatch = isPull(name, split, bodyParts)

      if (pushMatch && !pullMatch) {
        pushSets += sets
        pushReps += reps * sets || reps
      } else if (pullMatch && !pushMatch) {
        pullSets += sets
        pullReps += reps * sets || reps
      } else if (pushMatch && pullMatch) {
        // Compound split equally
        const halfSets = sets / 2
        pushSets += halfSets
        pullSets += halfSets
        pushReps += (reps * sets || reps) / 2
        pullReps += (reps * sets || reps) / 2
      }
    })

    const total = pushSets + pullSets
    if (total === 0) {
      return {
        hasData: false,
        pushSets: 0,
        pullSets: 0,
        pushPercent: 50,
        pullPercent: 50,
        ratio: 1.0,
        status: "neutral",
        label: "No Push/Pull data logged yet",
        description: "Log push-ups, pull-ups, or dips to analyze your upper-body balance.",
      }
    }

    const pushPct = Math.round((pushSets / total) * 100)
    const pullPct = 100 - pushPct
    const ratioVal = pullSets > 0 ? Number((pushSets / pullSets).toFixed(2)) : 2.0

    let status: "optimal" | "push_heavy" | "pull_heavy" = "optimal"
    let label = "Optimal Balance"
    let description = "1:1 push/pull balance protects rotator cuffs and scapular health."

    if (ratioVal > 1.15 || pushPct > 57) {
      status = "push_heavy"
      label = "Push Dominant"
      description = `Pushing volume exceeds pulling by ${(pushPct - pullPct)}%. Add more pull-ups or rows to maintain posture.`
    } else if (ratioVal < 0.85 || pullPct > 57) {
      status = "pull_heavy"
      label = "Pull Dominant"
      description = `Pulling volume exceeds pushing by ${(pullPct - pushPct)}%. Add more dips or push-ups to balance pressing strength.`
    }

    return {
      hasData: true,
      pushSets: Math.round(pushSets),
      pullSets: Math.round(pullSets),
      pushPercent: pushPct,
      pullPercent: pullPct,
      ratio: ratioVal,
      status,
      label,
      description,
    }
  }, [workouts, exercises])

  return (
    <div className="rounded-2xl border border-border/60 bg-[#121318] p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Push / Pull Balance</h3>
            <p className="text-[11px] text-muted-foreground">Highest-value ratio for calisthenics posture & shoulder health</p>
          </div>
        </div>

        {/* Status Chip */}
        <div className="shrink-0">
          {stats.status === "optimal" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" />
              {stats.label}
            </span>
          ) : stats.hasData ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-3 w-3" />
              {stats.label}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground font-medium">Benchmark: 1:1</span>
          )}
        </div>
      </div>

      {/* Visual Meter */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline text-xs">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-foreground">Push:</span>
            <span className="font-mono text-base font-extrabold text-foreground">{stats.pushPercent}%</span>
            <span className="text-[11px] text-muted-foreground">({stats.pushSets} sets)</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
            <span>Ratio</span>
            <strong className="text-foreground text-xs">{stats.ratio}:1</strong>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] text-muted-foreground">({stats.pullSets} sets)</span>
            <span className="font-mono text-base font-extrabold text-foreground">{stats.pullPercent}%</span>
            <span className="font-bold text-foreground">Pull</span>
          </div>
        </div>

        {/* Segmented Dual Bar */}
        <div className="relative h-3 w-full rounded-full bg-[#1b1d24] overflow-hidden flex">
          {/* Push segment */}
          <div
            className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-500"
            style={{ width: `${stats.pushPercent}%` }}
          />
          {/* Pull segment */}
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${stats.pullPercent}%` }}
          />

          {/* 50/50 Center Target Notch */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/70 shadow-xs pointer-events-none"
            style={{ left: "50%" }}
            title="Ideal 50/50 balance"
          />
        </div>

        <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
          <span>Chest · Shoulders · Triceps</span>
          <span className="font-medium text-muted-foreground/80">▲ Ideal Target 50%</span>
          <span>Lats · Biceps · Traps</span>
        </div>
      </div>

      {/* Actionable Insight Footer */}
      <div className="pt-1 text-xs text-muted-foreground leading-relaxed flex items-start gap-2 border-t border-border/30">
        <span className="text-primary font-bold text-[11px] shrink-0 mt-0.5">Insight:</span>
        <span className="text-[11px] text-muted-foreground">{stats.description}</span>
      </div>
    </div>
  )
}
