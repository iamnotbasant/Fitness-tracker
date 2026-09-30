"use client"

import React, { useState, useMemo } from "react"
import type { Workout, Exercise } from "@/lib/types"
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Dumbbell,
  HelpCircle,
  Activity,
  Calendar,
  RotateCcw,
} from "lucide-react"
import soundManager from "@/lib/sounds"
import {
  MALE_FRONT_PARTS,
  MALE_BACK_PARTS,
  MALE_FRONT_VIEWBOX,
  MALE_BACK_VIEWBOX,
  type BodyPartPaths,
} from "@/components/charts/muscle-map-data"
import { DetailBottomSheet } from "@/components/charts/detail-bottom-sheet"
import {
  getWeekInfo,
  computeWeeklyMuscleStats,
  getMuscleColors,
  slugToMuscleKey,
  type WeeklyMuscleGroupStat,
} from "./weekly-muscle-helpers"
import { WeeklyInfoDialog } from "./weekly-info-dialog"
import {
  groupWorkoutsIntoSessions,
  calculateCurrentStreak,
  formatDateDisplay,
  formatTimeDisplay,
} from "./workout-helpers"

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

interface WeeklyOverviewProps {
  workouts: Workout[]
  exercises: Exercise[]
  onBack: () => void
  initialWeekOffset?: number
}

export function WeeklyOverview({
  workouts,
  exercises,
  onBack,
  initialWeekOffset = 0,
}: WeeklyOverviewProps) {
  // Navigation: week offset relative to current week (0 = current week, -1 = last week, etc.)
  const [weekOffset, setWeekOffset] = useState<number>(initialWeekOffset)
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null)
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [selectedDayDateStr, setSelectedDayDateStr] = useState<string | null>(null)

  // Week info calculation (Sun–Sat, with week number & year e.g. "Week 40 2026")
  const weekInfo = useMemo(() => getWeekInfo(weekOffset), [weekOffset])

  // Filter workouts for this week
  const weekWorkouts = useMemo(() => {
    return workouts.filter((w) => {
      const d = (w.date || "").slice(0, 10)
      if (!d) return false
      return d >= weekInfo.startDateStr && d <= weekInfo.endDateStr
    })
  }, [workouts, weekInfo])

  // Workouts for selected day (if a day is tapped), otherwise for the whole week
  const displayedWorkouts = useMemo(() => {
    if (!selectedDayDateStr) return weekWorkouts
    return weekWorkouts.filter((w) => (w.date || "").slice(0, 10) === selectedDayDateStr)
  }, [weekWorkouts, selectedDayDateStr])

  // Sessions grouped for display
  const weekSessions = useMemo(() => groupWorkoutsIntoSessions(displayedWorkouts), [displayedWorkouts])

  // Set of dates in this week with workouts
  const workoutDatesSet = useMemo(() => {
    return new Set(weekWorkouts.map((w) => (w.date || "").slice(0, 10)).filter(Boolean))
  }, [weekWorkouts])

  // Muscle stats with primary vs secondary derivation & monochrome intensity
  const muscleStats = useMemo(() => {
    return computeWeeklyMuscleStats(weekWorkouts, exercises)
  }, [weekWorkouts, exercises])

  // Front and Back SVG parts
  const frontParts = useMemo(
    () => MALE_FRONT_PARTS.filter((p) => !SUBGROUP_SLUGS.has(p.slug)),
    []
  )
  const backParts = useMemo(
    () => MALE_BACK_PARTS.filter((p) => !SUBGROUP_SLUGS.has(p.slug)),
    []
  )

  // Current streak (using accurate Sunday-skipping streak logic from commit f3bcae6)
  const currentStreak = useMemo(() => {
    return calculateCurrentStreak(workouts.map((w) => w.date))
  }, [workouts])

  // Summary counts for this week
  const summary = useMemo(() => {
    const primaryMuscles = Object.values(muscleStats).filter((m) => m.role === "primary")
    const secondaryMuscles = Object.values(muscleStats).filter((m) => m.role === "secondary")
    const totalSetsSum = weekWorkouts.reduce((acc, w) => acc + (w.sets || 0), 0)
    const workoutDaysCount = weekInfo.days.filter((d) => workoutDatesSet.has(d.dateStr)).length

    return {
      primaryCount: primaryMuscles.length,
      secondaryCount: secondaryMuscles.length,
      totalSetsSum,
      workoutDaysCount,
    }
  }, [muscleStats, weekInfo.days, workoutDatesSet, weekWorkouts])

  // Active muscle for detail bottom sheet
  const activeMuscleModal = selectedMuscle ? muscleStats[selectedMuscle] : null

  // Week navigation handlers
  const handlePrevWeek = () => {
    soundManager.play("click", 0.2)
    setWeekOffset((prev) => prev - 1)
    setSelectedDayDateStr(null)
    setSelectedMuscle(null)
  }

  const handleNextWeek = () => {
    if (weekInfo.isFutureWeek) return
    soundManager.play("click", 0.2)
    setWeekOffset((prev) => prev + 1)
    setSelectedDayDateStr(null)
    setSelectedMuscle(null)
  }

  const handleResetToCurrentWeek = () => {
    soundManager.play("click", 0.2)
    setWeekOffset(0)
    setSelectedDayDateStr(null)
    setSelectedMuscle(null)
  }

  // Render SVG anatomy part
  const renderPart = (part: BodyPartPaths, index: number, view: "front" | "back") => {
    const isNeutral = NEUTRAL_SLUGS.has(part.slug)
    const muscleKey = slugToMuscleKey(part.slug, view)
    const stat = muscleKey ? muscleStats[muscleKey] : null

    const isSelected = !!muscleKey && selectedMuscle === muscleKey
    const isHovered = !!muscleKey && hoveredMuscle === muscleKey

    const { fill, stroke, strokeWidth } = isNeutral
      ? { fill: "#09090b", stroke: "#18181b", strokeWidth: 0.8 }
      : getMuscleColors(stat, isHovered, isSelected)

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
          />
        ))}
      </g>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* ─── Top Bar: Back to Progress + View Badge ─── */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={() => {
            soundManager.play("click", 0.2)
            onBack()
          }}
          className="h-11 min-h-[44px] px-3 -ml-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 flex items-center gap-2 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span>Back to Progress</span>
        </button>

        {!weekInfo.isCurrentWeek && (
          <button
            type="button"
            onClick={handleResetToCurrentWeek}
            className="h-9 min-h-[44px] px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-medium text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <RotateCcw className="h-3 w-3 text-zinc-400" />
            <span>This Week</span>
          </button>
        )}
      </div>

      {/* ─── Main Card: Week Navigation + 7-Day Dots + Muscle Figures + Legend ─── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6 shadow-xs space-y-5">
        {/* 1. WEEK NAVIGATION HEADER (< Week 40 2026 >) */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <button
            type="button"
            onClick={handlePrevWeek}
            aria-label="Previous week"
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-950 hover:bg-zinc-850 active:scale-95 border border-zinc-800 flex items-center justify-center text-white transition-all cursor-pointer shadow-xs"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center px-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-0.5">
              Weekly Overview
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight font-display">
              {weekInfo.weekLabel}
            </h2>
            <p className="text-xs text-zinc-400 font-body">
              {weekInfo.dateRangeLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={handleNextWeek}
            disabled={weekInfo.isFutureWeek}
            aria-label="Next week"
            className={`h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center transition-all shadow-xs ${
              weekInfo.isFutureWeek
                ? "opacity-30 cursor-not-allowed text-zinc-600"
                : "hover:bg-zinc-850 active:scale-95 text-white cursor-pointer"
            }`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* 2. 7-DAY DOTS ROW (Sun–Sat) with Workout / Rest Indicators */}
        <div className="space-y-2 py-1">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 justify-items-center">
            {weekInfo.days.map((day) => {
              const hasWorkout = workoutDatesSet.has(day.dateStr)
              const isSelectedDay = selectedDayDateStr === day.dateStr

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => {
                    soundManager.play("click", 0.2)
                    setSelectedDayDateStr((prev) => (prev === day.dateStr ? null : day.dateStr))
                  }}
                  className={`min-h-[44px] min-w-[40px] flex flex-col items-center justify-center p-1 rounded-xl transition-all cursor-pointer group ${
                    isSelectedDay
                      ? "bg-zinc-800/80 ring-1 ring-zinc-700"
                      : "hover:bg-zinc-850/50"
                  }`}
                  aria-label={`${day.dayName}, ${day.dayNumber} ${hasWorkout ? "workout day" : "rest day"}${day.isToday ? " (today)" : ""}`}
                >
                  {/* Day Label (S M T W T F S) */}
                  <span
                    className={`text-[11px] font-medium font-body leading-none mb-1 ${
                      day.isToday
                        ? "text-white font-bold"
                        : hasWorkout
                        ? "text-zinc-300"
                        : "text-zinc-500"
                    }`}
                  >
                    {day.dayAbbr}
                  </span>

                  {/* Date Number */}
                  <span
                    className={`text-[11px] font-display tabular-nums leading-none mb-1.5 ${
                      day.isToday
                        ? "text-white font-bold"
                        : isSelectedDay
                        ? "text-white font-semibold"
                        : "text-zinc-400"
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {/* Indicator Dot / Circle:
                      - Workout day: filled white circle with dark dumbbell icon
                      - Rest day: dim dot
                      - Today: marked with distinctive ring */}
                  <div className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center">
                    {hasWorkout ? (
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-md transition-all ${
                          day.isToday
                            ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900"
                            : ""
                        }`}
                      >
                        <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.3]" />
                      </div>
                    ) : (
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                          day.isToday
                            ? "ring-1.5 ring-zinc-400/80 bg-zinc-950/70"
                            : ""
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            day.isToday ? "bg-zinc-300" : "bg-zinc-700/80"
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Today micro marker */}
                  {day.isToday && (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mt-1">
                      Today
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Filter Status Feedback */}
          {selectedDayDateStr && (
            <div className="flex items-center justify-between px-2 pt-1 text-xs">
              <span className="text-zinc-400 font-body">
                Filtering by: <span className="text-white font-semibold">{formatDateDisplay(selectedDayDateStr)}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedDayDateStr(null)}
                className="text-[11px] text-zinc-400 hover:text-white underline font-body cursor-pointer"
              >
                Show entire week
              </button>
            </div>
          )}
        </div>

        {/* 3. FRONT + BACK MUSCLE FIGURES (Colored by Primary vs Secondary) */}
        <div className="w-full pt-1 pb-2">
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            {/* Front Figure */}
            <div className="flex-1 max-w-[155px] sm:max-w-[195px] flex flex-col items-center">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
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
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
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
        </div>

        {/* 4. LEGEND AT BOTTOM: White dot "Primary", Grey dot "Secondary" + "?" button */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Primary Legend */}
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
              <span className="text-xs text-zinc-200 font-medium font-body">Primary</span>
            </div>

            {/* Secondary Legend */}
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
              <span className="text-xs text-zinc-400 font-medium font-body">Secondary</span>
            </div>
          </div>

          {/* "?" Info Dialog Button (min 44px tap target) */}
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              setInfoDialogOpen(true)
            }}
            aria-label="Muscle map information"
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-950 hover:bg-zinc-850 active:scale-95 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer shadow-xs"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── 5. WEEK METRICS SUMMARY ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Workout Days */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 space-y-1">
          <span className="text-[11px] text-zinc-400 font-body block">
            Workout Days
          </span>
          <span className="text-xl sm:text-2xl font-bold text-white font-display tabular-nums">
            {summary.workoutDaysCount}{" "}
            <span className="text-xs text-zinc-500 font-normal">/ 7</span>
          </span>
        </div>

        {/* Total Sets */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 space-y-1">
          <span className="text-[11px] text-zinc-400 font-body block">
            Sets Logged
          </span>
          <span className="text-xl sm:text-2xl font-bold text-white font-display tabular-nums">
            {summary.totalSetsSum}
          </span>
        </div>

        {/* Primary Muscles */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 space-y-1">
          <span className="text-[11px] text-zinc-400 font-body block">
            Primary Groups
          </span>
          <span className="text-xl sm:text-2xl font-bold text-white font-display tabular-nums">
            {summary.primaryCount}
          </span>
        </div>

        {/* Current Streak (Sunday-skipping logic f3bcae6) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 space-y-1">
          <span className="text-[11px] text-zinc-400 font-body block">
            Current Streak
          </span>
          <span className="text-xl sm:text-2xl font-bold text-white font-display tabular-nums">
            {currentStreak}{" "}
            <span className="text-xs text-zinc-500 font-normal">days</span>
          </span>
        </div>
      </div>

      {/* ─── 6. SESSIONS FOR THIS WEEK ─── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-1">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white font-display">
              {selectedDayDateStr
                ? `Workouts on ${formatDateDisplay(selectedDayDateStr)}`
                : `Workouts in ${weekInfo.weekLabel}`}
            </h3>
            <p className="text-xs text-zinc-400 font-body">
              {weekSessions.length === 1
                ? "1 session recorded"
                : `${weekSessions.length} sessions recorded`}
            </p>
          </div>
        </div>

        {weekSessions.length > 0 ? (
          <div className="space-y-2">
            {weekSessions.map((session) => (
              <div
                key={session.id}
                className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white font-body">
                      {session.name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 font-body mt-0.5">
                      {session.time ? `${formatDateDisplay(session.date)} · ${formatTimeDisplay(session.time)}` : formatDateDisplay(session.date)}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/60 text-white font-mono text-[10px] font-semibold shrink-0">
                    {session.durationMin} min
                  </span>
                </div>

                {/* Exercises in session */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {session.exercises.map((ex, exIdx) => (
                    <span
                      key={exIdx}
                      className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 font-body"
                    >
                      {ex.name} ({ex.sets}s)
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-zinc-400 font-body">
              No workouts logged for this period.
            </p>
            {!weekInfo.isCurrentWeek && (
              <button
                type="button"
                onClick={handleResetToCurrentWeek}
                className="h-10 min-h-[44px] px-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-xs font-medium text-white inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <span>Jump to Current Week</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── 7. DETAIL BOTTOM SHEET FOR TAPPED MUSCLE ─── */}
      <DetailBottomSheet
        isOpen={!!activeMuscleModal}
        onClose={() => setSelectedMuscle(null)}
        title={activeMuscleModal?.name || "Muscle Detail"}
        badge={
          activeMuscleModal?.role === "primary"
            ? "PRIMARY MUSCLE"
            : activeMuscleModal?.role === "secondary"
            ? "SECONDARY MUSCLE"
            : "RESTED"
        }
        subtitle={
          activeMuscleModal
            ? `${activeMuscleModal.primarySets} primary sets · ${activeMuscleModal.secondarySets} secondary sets`
            : undefined
        }
      >
        {activeMuscleModal && activeMuscleModal.exercises.length > 0 ? (
          <div className="space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
              Logged Movements ({weekInfo.weekLabel})
            </span>
            <div className="space-y-1.5">
              {activeMuscleModal.exercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs"
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        ex.isPrimary ? "bg-white" : "bg-zinc-500"
                      }`}
                    />
                    <span className="text-zinc-200 font-medium font-body truncate">
                      {ex.name}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-zinc-500 shrink-0">
                      {ex.isPrimary ? "Primary" : "Secondary"}
                    </span>
                  </div>
                  <span className="font-display tabular-nums text-white font-semibold shrink-0">
                    {ex.sets} {ex.sets === 1 ? "set" : "sets"} · {ex.reps} reps
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-1 font-body text-xs text-zinc-400">
            <p>No workout sets logged for this muscle in {weekInfo.weekLabel}.</p>
            {activeMuscleModal && (
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                  Suggested Target Exercises
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

      {/* ─── 8. INFO DIALOG (?) ─── */}
      <WeeklyInfoDialog
        isOpen={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
      />
    </div>
  )
}
