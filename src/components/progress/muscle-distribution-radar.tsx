"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import type { Workout, Exercise } from "@/lib/types"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { ChevronDown, Check } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import soundManager from "@/lib/sounds"
import {
  type RadarDataPoint,
  buildRadarChartData,
  calculatePeriodStats,
  formatMonochromeDelta,
  getEqualPeriods,
} from "./muscle-distribution-helpers"

export type PeriodOption = "7d" | "30d" | "90d"

const PERIOD_OPTIONS: { id: PeriodOption; label: string; days: number }[] = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
]

export interface MuscleDistributionRadarProps {
  workouts: Workout[]
  exercises?: Exercise[]
  // Optional overrides for embedding in custom contexts (e.g., Monthly Report)
  customCurrentWorkouts?: Workout[]
  customPreviousWorkouts?: Workout[]
  currentLabel?: string
  previousLabel?: string
  hidePeriodSelector?: boolean
  hideStatCards?: boolean
  title?: string
  subtitle?: string
  className?: string
}

export function MuscleDistributionRadar({
  workouts,
  exercises = [],
  customCurrentWorkouts,
  customPreviousWorkouts,
  currentLabel: customCurrentLabel,
  previousLabel: customPreviousLabel,
  hidePeriodSelector = false,
  hideStatCards = false,
  title = "Muscle distribution",
  subtitle = "Sets per group vs previous period",
  className = "",
}: MuscleDistributionRadarProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("30d")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Filter workouts for current & previous periods
  const { currentWorkouts, previousWorkouts, currentLabel, previousLabel, periodDays } =
    useMemo(() => {
      if (customCurrentWorkouts && customPreviousWorkouts) {
        return {
          currentWorkouts: customCurrentWorkouts,
          previousWorkouts: customPreviousWorkouts,
          currentLabel: customCurrentLabel || "This period",
          previousLabel: customPreviousLabel || "Previous period",
          periodDays: 30,
        }
      }

      const activeOpt = PERIOD_OPTIONS.find((p) => p.id === selectedPeriod) || PERIOD_OPTIONS[1]
      const { currentStart, currentEnd, previousStart, previousEnd } = getEqualPeriods(
        activeOpt.days
      )

      const curr = workouts.filter((w) => {
        const d = (w.date || "").slice(0, 10)
        return d >= currentStart && d <= currentEnd
      })

      const prev = workouts.filter((w) => {
        const d = (w.date || "").slice(0, 10)
        return d >= previousStart && d <= previousEnd
      })

      return {
        currentWorkouts: curr,
        previousWorkouts: prev,
        currentLabel: customCurrentLabel || activeOpt.label,
        previousLabel: customPreviousLabel || `Previous ${activeOpt.days} days`,
        periodDays: activeOpt.days,
      }
    }, [
      workouts,
      selectedPeriod,
      customCurrentWorkouts,
      customPreviousWorkouts,
      customCurrentLabel,
      customPreviousLabel,
    ])

  // Radar chart data & stats
  const { data: radarData, maxSets } = useMemo(
    () => buildRadarChartData(currentWorkouts, previousWorkouts, exercises),
    [currentWorkouts, previousWorkouts, exercises]
  )

  const currentStats = useMemo(() => calculatePeriodStats(currentWorkouts), [currentWorkouts])
  const previousStats = useMemo(() => calculatePeriodStats(previousWorkouts), [previousWorkouts])

  // Honest stat deltas (positive = emerald, negative = rose, 0 = neutral zinc)
  const formatStatDelta = (delta: number, suffix: string = "") => {
    if (delta > 0) {
      return {
        text: `↑ ${delta.toLocaleString()}${suffix}`,
        className: "text-emerald-400",
      }
    }
    if (delta < 0) {
      return {
        text: `↓ ${Math.abs(delta).toLocaleString()}${suffix}`,
        className: "text-rose-400",
      }
    }
    return {
      text: `0${suffix}`,
      className: "text-zinc-500",
    }
  }

  const workoutDelta = formatStatDelta(currentStats.workouts - previousStats.workouts)
  const durationDelta = formatStatDelta(
    currentStats.durationMin - previousStats.durationMin,
    "min"
  )
  const volumeDelta =
    currentStats.volumeKg > 0 || previousStats.volumeKg > 0
      ? formatStatDelta(currentStats.volumeKg - previousStats.volumeKg, " kg")
      : formatStatDelta(currentStats.reps - previousStats.reps, " reps")
  const setsDelta = formatStatDelta(currentStats.sets - previousStats.sets)

  const activePeriodLabel =
    PERIOD_OPTIONS.find((p) => p.id === selectedPeriod)?.label || "Last 30 days"

  return (
    <div
      className={`rounded-3xl border border-zinc-800/90 bg-[#121316] p-5 sm:p-6 shadow-xl space-y-6 ${className}`}
    >
      {/* ─── Header: Title & Period Dropdown ─── */}
      {(title || subtitle || !hidePeriodSelector) && (
        <div className="flex items-center justify-between gap-3 pb-1">
          <div>
            {title && (
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight font-display">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-zinc-400 font-body mt-0.5">{subtitle}</p>
            )}
          </div>

          {!hidePeriodSelector && (
            <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-11 min-h-[44px] px-3.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-850 hover:border-zinc-700 text-xs font-medium text-white flex items-center justify-between gap-2 transition-all shadow-xs cursor-pointer min-w-[130px]"
                >
                  <span>{activePeriodLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={6}
                className="w-44 p-1 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl text-xs z-50"
              >
                <div className="space-y-0.5">
                  {PERIOD_OPTIONS.map((opt) => {
                    const isSelected = selectedPeriod === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          soundManager.play("click", 0.2)
                          setSelectedPeriod(opt.id)
                          setDropdownOpen(false)
                        }}
                        className={`w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer text-xs ${
                          isSelected
                            ? "bg-zinc-800 text-white font-semibold border border-zinc-700 shadow-xs"
                            : "text-zinc-400 hover:text-white hover:bg-zinc-850"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[2.5]" />}
                      </button>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      {/* ─── Legend Indicator (Reference 03) ─── */}
      <div className="flex items-center justify-center gap-6 text-xs text-zinc-400 font-body">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
          <span className="text-white font-medium">{currentLabel}</span>
        </div>
        {previousLabel && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
            <span>{previousLabel}</span>
          </div>
        )}
      </div>

      {/* ─── 6-Axis Radar Chart (Expanded inline sizing) ─── */}
      <div className="w-full h-[300px] sm:h-[360px] lg:h-[400px] flex items-center justify-center py-2">
        {!mounted ? (
          <div className="h-48 flex items-center justify-center text-xs text-zinc-500 font-mono">
            Loading radar chart...
          </div>
        ) : (
          <motion.div
            key={`radar-${currentLabel}-${previousLabel}-${selectedPeriod}`}
            initial={prefersReduced ? false : { opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              prefersReduced
                ? { duration: 0 }
                : {
                    type: "spring",
                    stiffness: 280,
                    damping: 24,
                  }
            }
            className="w-full h-full flex items-center justify-center"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#27272a" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="muscle"
                  tick={{
                    fill: "#a1a1aa",
                    fontSize: 11,
                    fontWeight: 500,
                    fontFamily: "var(--font-body)",
                  }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, maxSets > 0 ? Math.ceil(maxSets * 1.15) : 10]}
                  tick={false}
                  axisLine={false}
                />
                {/* Previous Period: zinc-600 polygon */}
                <Radar
                  name={previousLabel}
                  dataKey="previous"
                  stroke="#71717a"
                  fill="#71717a"
                  fillOpacity={0.12}
                  strokeWidth={1.5}
                  isAnimationActive={!prefersReduced}
                  animationDuration={600}
                  animationEasing="ease-out"
                />
                {/* Current Period: Blue polygon (Reference 03) */}
                <Radar
                  name={currentLabel}
                  dataKey="current"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.28}
                  strokeWidth={2}
                  isAnimationActive={!prefersReduced}
                  animationDuration={600}
                  animationEasing="ease-out"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as RadarDataPoint
                      const diff = d.current - d.previous
                      const diffInfo = formatMonochromeDelta(diff, " sets")
                      return (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl text-xs space-y-1.5 min-w-[140px]">
                          <p className="font-bold text-white font-display text-sm tracking-tight">
                            {d.muscle}
                          </p>
                          <div className="flex items-center justify-between gap-3 text-zinc-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#3b82f6] shrink-0" />
                              {currentLabel}:
                            </span>
                            <span className="font-semibold text-white tabular-nums">
                              {d.current} sets
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-zinc-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
                              {previousLabel}:
                            </span>
                            <span className="font-medium tabular-nums">{d.previous} sets</span>
                          </div>
                          <div className="pt-1.5 border-t border-zinc-800 flex items-center justify-between gap-3 text-[11px]">
                            <span className="text-zinc-500">Difference:</span>
                            <span
                              className={
                                diffInfo.isPositive
                                  ? "text-emerald-400 font-semibold"
                                  : "text-zinc-500 font-medium"
                              }
                            >
                              {diffInfo.text}
                            </span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>

      {/* ─── 4 Stat Cards: Workouts, Duration, Volume, Sets (Honest Deltas) ─── */}
      {!hideStatCards && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-zinc-800/80">
          {[
            {
              title: "Workouts",
              value: currentStats.workouts,
              delta: workoutDelta,
            },
            {
              title: "Duration",
              value: `${currentStats.durationMin}min`,
              delta: durationDelta,
            },
            {
              title: "Volume",
              value:
                currentStats.volumeKg > 0
                  ? `${currentStats.volumeKg.toLocaleString()} kg`
                  : `${currentStats.reps.toLocaleString()} reps`,
              delta: volumeDelta,
            },
            {
              title: "Sets",
              value: currentStats.sets,
              delta: setsDelta,
            },
          ].map((card, idx) => (
            <motion.div
              key={`${card.title}-${currentLabel}`}
              initial={prefersReduced ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                prefersReduced
                  ? { duration: 0 }
                  : {
                      duration: 0.35,
                      delay: idx * 0.08,
                      ease: [0.22, 1, 0.36, 1],
                    }
              }
              className="rounded-2xl border border-zinc-850 bg-zinc-950/80 p-3.5 sm:p-4 flex flex-col justify-between space-y-1 min-w-0"
            >
              <span className="text-xs text-zinc-400 font-medium font-body truncate">
                {card.title}
              </span>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xl sm:text-2xl font-bold text-white font-display tabular-nums block truncate">
                  {card.value}
                </span>
                <span
                  className={`text-[11px] sm:text-xs font-semibold flex items-center gap-0.5 font-mono truncate ${card.delta.className}`}
                >
                  {card.delta.text}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
