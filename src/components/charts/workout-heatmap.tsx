"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import type { Workout } from "@/lib/types"
import soundManager from "@/lib/sounds"
import { Flame } from "lucide-react"

interface DayData {
  date: string
  volume: number
  points: number
  workouts: { name: string; sets: number; reps: number; timeSeconds?: number; points: number }[]
  isFuture?: boolean
}

export type HeatmapRange = "4w" | "12w" | "26w" | "52w" | "all"

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dt = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dt}`
}

export function WorkoutHeatmap({ workouts }: { workouts: Workout[] }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const earliestWorkoutDate = useMemo(() => {
    if (!workouts || workouts.length === 0) return null
    const sorted = [...workouts].filter((w) => w.date).sort((a, b) => a.date.localeCompare(b.date))
    return sorted[0]?.date || null
  }, [workouts])

  // Default to "all" for recently started accounts
  const defaultRange: HeatmapRange = useMemo(() => {
    if (!earliestWorkoutDate) return "all"
    const earliest = new Date(earliestWorkoutDate).getTime()
    const daysSinceStart = (Date.now() - earliest) / (1000 * 60 * 60 * 24)
    if (daysSinceStart <= 45) return "all"
    return "52w"
  }, [earliestWorkoutDate])

  const [range, setRange] = useState<HeatmapRange>("all")
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    if (!hasInitializedRef.current && earliestWorkoutDate) {
      hasInitializedRef.current = true
      setRange(defaultRange)
    }
  }, [defaultRange, earliestWorkoutDate])

  const { heatmapData, streakStats } = useMemo(() => {
    const dataByDate = new Map<
      string,
      {
        volume: number
        points: number
        workouts: { name: string; sets: number; reps: number; timeSeconds?: number; points: number }[]
      }
    >()

    workouts.forEach((w) => {
      const existing = dataByDate.get(w.date) || { volume: 0, points: 0, workouts: [] }
      const vol = w.volume || (w.sets && w.reps ? w.sets * w.reps : 0) || w.points || 0
      const pts = w.points ?? w.total_points ?? 0
      const exName = w.exerciseName || w.name || "Workout"

      dataByDate.set(w.date, {
        volume: existing.volume + vol,
        points: existing.points + pts,
        workouts: [
          ...existing.workouts,
          { name: exName, sets: w.sets || 1, reps: w.reps || 0, timeSeconds: w.timeSeconds, points: pts },
        ],
      })
    })

    const weeks: DayData[][] = []
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const startDate = new Date(today)

    if (range === "4w") {
      startDate.setDate(today.getDate() - 28)
    } else if (range === "12w") {
      startDate.setDate(today.getDate() - 84)
    } else if (range === "26w") {
      startDate.setDate(today.getDate() - 182)
    } else if (range === "all") {
      if (earliestWorkoutDate) {
        const earliest = new Date(earliestWorkoutDate)
        if (!isNaN(earliest.getTime())) {
          startDate.setTime(earliest.getTime())
        } else {
          startDate.setDate(today.getDate() - 28)
        }
      } else {
        startDate.setDate(today.getDate() - 28)
      }
    } else {
      startDate.setDate(today.getDate() - 364)
    }

    // Start from the first Sunday before or on startDate
    const dayOfWeek = startDate.getDay()
    startDate.setDate(startDate.getDate() - dayOfWeek)
    startDate.setHours(0, 0, 0, 0)

    const minWeeks = range === "4w" || range === "all" ? 4 : range === "12w" ? 12 : range === "26w" ? 26 : 52

    let currentDate = new Date(startDate)
    const allDays: { dateStr: string; hasWorkout: boolean; isSunday: boolean }[] = []

    while (currentDate <= today || weeks.length < minWeeks) {
      const week: DayData[] = []
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const dateStr = toLocalDateStr(currentDate)
        const data = dataByDate.get(dateStr)
        const hasWorkout = (data?.workouts.length || 0) > 0
        const isFuture = currentDate > today

        week.push({
          date: dateStr,
          volume: data?.volume || 0,
          points: data?.points || 0,
          workouts: data?.workouts || [],
          isFuture,
        })

        if (!isFuture) {
          allDays.push({ dateStr, hasWorkout, isSunday: currentDate.getDay() === 0 })
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      weeks.push(week)
      if (weeks.length >= 60) break
    }

    // Streaks with Sunday-skipping strictly preserved (commit f3bcae6)
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    let activeDays = 0

    const todayStr = toLocalDateStr(today)
    const hasToday = dataByDate.has(todayStr)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (yesterday.getDay() === 0 && !dataByDate.has(toLocalDateStr(yesterday))) {
      yesterday.setDate(yesterday.getDate() - 1)
    }
    const yesterdayStr = toLocalDateStr(yesterday)
    const hasYesterday = dataByDate.has(yesterdayStr)

    if (hasToday || hasYesterday) {
      let checkDate = new Date(hasToday ? today : yesterday)
      while (true) {
        if (checkDate.getDay() === 0) {
          checkDate.setDate(checkDate.getDate() - 1)
          continue
        }
        const dStr = toLocalDateStr(checkDate)
        if (dataByDate.has(dStr)) {
          currentStreak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
    }

    allDays.forEach(({ hasWorkout, isSunday }) => {
      if (hasWorkout) {
        activeDays++
      }
      if (isSunday) {
        // Sundays are ignored in streak math (neither increment nor break streak)
        return
      }
      if (hasWorkout) {
        tempStreak++
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak
        }
      } else {
        tempStreak = 0
      }
    })

    return {
      heatmapData: weeks,
      streakStats: {
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
        activeDays,
        totalWorkouts: workouts.length,
      },
    }
  }, [workouts, range, earliestWorkoutDate])

  // Grid configuration
  const gridConfig = useMemo(() => {
    const numWeeks = heatmapData.length
    if (range === "4w" || (range === "all" && numWeeks <= 6)) {
      return {
        boxClass: "h-8 w-8 sm:h-9 sm:w-9 rounded-lg",
        dayLabelClass: "h-8 sm:h-9 leading-8 sm:leading-9 text-xs",
        gapColClass: "gap-2 sm:gap-2.5",
        gapRowClass: "gap-2 sm:gap-2.5",
        minWidthClass: "min-w-0 w-full justify-start",
        colWidthPx: 38,
        spanLabel: range === "all" ? `All (${numWeeks * 7}d)` : "28 Days",
      }
    }
    if (range === "12w" || (range === "all" && numWeeks <= 14)) {
      return {
        boxClass: "h-5.5 w-5.5 sm:h-6 sm:w-6 rounded-md",
        dayLabelClass: "h-5.5 sm:h-6 leading-5.5 sm:leading-6 text-[11px]",
        gapColClass: "gap-1.5 sm:gap-2",
        gapRowClass: "gap-1.5 sm:gap-2",
        minWidthClass: "min-w-[420px]",
        colWidthPx: 26,
        spanLabel: range === "all" ? `All (${numWeeks * 7}d)` : "84 Days",
      }
    }
    if (range === "26w" || (range === "all" && numWeeks <= 28)) {
      return {
        boxClass: "h-4 w-4 sm:h-4.5 sm:w-4.5 rounded-[4px]",
        dayLabelClass: "h-4 sm:h-4.5 leading-4 sm:leading-4.5 text-[10px]",
        gapColClass: "gap-1.5",
        gapRowClass: "gap-1.5",
        minWidthClass: "min-w-[560px]",
        colWidthPx: 19,
        spanLabel: range === "all" ? `All (${numWeeks * 7}d)` : "182 Days",
      }
    }
    return {
      boxClass: "h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-[3px]",
      dayLabelClass: "h-3 sm:h-3.5 leading-3 sm:leading-3.5 text-[10px]",
      gapColClass: "gap-1",
      gapRowClass: "gap-1",
      minWidthClass: "min-w-[760px]",
      colWidthPx: 16,
      spanLabel: range === "all" ? `All (${numWeeks * 7}d)` : "365 Days",
    }
  }, [range, heatmapData.length])

  useEffect(() => {
    if (scrollContainerRef.current) {
      if (heatmapData.length > 20) {
        scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth
      } else {
        scrollContainerRef.current.scrollLeft = 0
      }
    }
  }, [heatmapData.length, range])

  // Intensity thresholds
  const levelThresholds = useMemo(() => {
    const volumes = heatmapData.flat().map((d) => d.volume).filter((v) => v > 0)
    const avg = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 100
    return {
      low: Math.max(1, avg * 0.5),
      medium: avg,
      high: avg * 1.5,
    }
  }, [heatmapData])

  // STRICT MONOCHROME HEATMAP CELL COLORS (Zinc to Pure White)
  const getCellColor = (volume: number, isFuture = false) => {
    if (isFuture) {
      return "bg-zinc-900/30 border-zinc-800/30 border-dashed cursor-default opacity-30"
    }
    if (volume === 0) {
      return "bg-zinc-900 border-zinc-800/70 hover:border-zinc-600"
    }
    if (volume <= levelThresholds.low) return "bg-zinc-800 border-zinc-700/70"
    if (volume <= levelThresholds.medium) return "bg-zinc-600 border-zinc-500/70"
    if (volume <= levelThresholds.high) return "bg-zinc-400 border-zinc-300/80"
    return "bg-white border-white"
  }

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
  }

  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = []
    let lastMonth = -1

    heatmapData.forEach((week, idx) => {
      const [y, m, d] = week[0].date.split("-").map(Number)
      const firstDay = new Date(y, m - 1, d)
      const currentMonth = firstDay.getMonth()

      if (currentMonth !== lastMonth) {
        labels.push({
          month: firstDay.toLocaleDateString("en-US", { month: "short" }),
          weekIndex: idx,
        })
        lastMonth = currentMonth
      }
    })

    return labels
  }, [heatmapData])

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6 shadow-sm space-y-5">
      {/* ─── Section Header (Monochrome Icon + Title) & Time Span Selector ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-white">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight font-display">Consistency</h2>
            <p className="text-xs text-zinc-400 font-body">Daily workout frequency & active streak</p>
          </div>
        </div>

        {/* Time Span Filter (Tap >= 44px) */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto min-h-[44px]">
          {(
            [
              { id: "4w", label: "1 Mo" },
              { id: "12w", label: "3 Mo" },
              { id: "26w", label: "6 Mo" },
              { id: "52w", label: "1 Yr" },
              { id: "all", label: "All" },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                soundManager.play("click", 0.3)
                setRange(r.id)
              }}
              className={`h-9 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center ${
                range === r.id
                  ? "bg-white text-zinc-950 font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Hero Metric: Current Streak ─── */}
      <div className="pb-1">
        <span className="text-[11px] font-body uppercase tracking-wider text-zinc-400 block mb-1">
          Current Streak
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl sm:text-5xl font-black tracking-tight text-white font-display tabular-nums">
            {streakStats.currentStreak}
          </span>
          <span className="text-sm font-medium text-zinc-400 font-body">days</span>
        </div>
        <p className="text-xs text-zinc-400 font-body mt-1">
          Sundays excluded · Best: <span className="font-display font-semibold tabular-nums text-zinc-300">{streakStats.longestStreak}d</span> · <span className="font-display font-semibold tabular-nums text-zinc-300">{streakStats.activeDays}</span> active days
        </p>
      </div>

      {/* ─── Heatmap Grid Container ─── */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent rounded-xl"
      >
        <div className={`inline-flex flex-col gap-1.5 ${gridConfig.minWidthClass} py-1`}>
          {/* Month labels at top */}
          <div className="flex gap-1 pl-9 mb-1 text-[11px] text-zinc-500 font-mono font-medium select-none">
            {monthLabels.map(({ month, weekIndex }, idx) => (
              <div
                key={idx}
                style={{
                  marginLeft:
                    idx === 0
                      ? "0"
                      : `${Math.max(0, (weekIndex - (monthLabels[idx - 1]?.weekIndex || 0) - 1) * gridConfig.colWidthPx)}px`,
                }}
              >
                {month}
              </div>
            ))}
          </div>

          {/* Day labels and heatmap grid */}
          <div className={`flex ${gridConfig.gapColClass} items-center`}>
            {/* Day labels on the left */}
            <div className={`flex flex-col ${gridConfig.gapRowClass} text-zinc-500 font-mono font-medium select-none pr-1.5`}>
              <div className={`${gridConfig.dayLabelClass} opacity-0`}>Sun</div>
              <div className={`${gridConfig.dayLabelClass}`}>Mon</div>
              <div className={`${gridConfig.dayLabelClass} opacity-0`}>Tue</div>
              <div className={`${gridConfig.dayLabelClass}`}>Wed</div>
              <div className={`${gridConfig.dayLabelClass} opacity-0`}>Thu</div>
              <div className={`${gridConfig.dayLabelClass}`}>Fri</div>
              <div className={`${gridConfig.dayLabelClass} opacity-0`}>Sat</div>
            </div>

            {/* Heatmap squares */}
            {heatmapData.map((week, weekIdx) => (
              <div key={weekIdx} className={`flex flex-col ${gridConfig.gapRowClass}`}>
                {week.map((day, dayIdx) => {
                  const hasWorkouts = day.workouts.length > 0
                  return (
                    <div key={`${weekIdx}-${dayIdx}`} className="group/day relative">
                      <div
                        className={`${gridConfig.boxClass} border transition-all duration-150 cursor-pointer hover:scale-110 hover:z-20 ${getCellColor(
                          day.volume,
                          day.isFuture
                        )}`}
                      />

                      {/* Tooltip */}
                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/day:flex flex-col gap-1 z-30 w-52 p-2.5 rounded-xl bg-zinc-950 text-white text-xs shadow-2xl border border-zinc-800">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
                          <span className="font-semibold text-white font-body">{formatDate(day.date)}</span>
                          {hasWorkouts && (
                            <span className="text-[10px] font-display font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 tabular-nums">
                              {day.points.toLocaleString()} pts
                            </span>
                          )}
                        </div>
                        {day.isFuture ? (
                          <span className="text-[11px] text-zinc-500 italic font-body">Upcoming</span>
                        ) : hasWorkouts ? (
                          <div className="space-y-1 pt-0.5">
                            <span className="text-[11px] text-zinc-400 font-body">
                              Volume: <strong className="text-white font-display tabular-nums">{day.volume} reps</strong> ({day.workouts.length} exercises)
                            </span>
                            <div className="max-h-24 overflow-y-auto space-y-0.5 pt-1">
                              {day.workouts.map((w, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between text-[11px] text-zinc-400 truncate"
                                >
                                  <span className="truncate font-body">{w.name}</span>
                                  <span className="font-display tabular-nums text-white ml-1.5 shrink-0">
                                    {w.sets}×{w.timeSeconds ? `${w.timeSeconds}s` : w.reps}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-500 font-body">Rest day / No workout</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Legend: Strict 5-tier Monochrome ─── */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-400 flex-wrap gap-2">
        <span className="text-zinc-500 text-[11px] font-body">Consistency Grid ({gridConfig.spanLabel})</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500 font-body">Less</span>
          <div className="flex gap-1 items-center">
            <div className="h-3 w-3 rounded-[3px] bg-zinc-900 border border-zinc-800/70" />
            <div className="h-3 w-3 rounded-[3px] bg-zinc-800 border border-zinc-700/70" />
            <div className="h-3 w-3 rounded-[3px] bg-zinc-600 border border-zinc-500/70" />
            <div className="h-3 w-3 rounded-[3px] bg-zinc-400 border border-zinc-300/80" />
            <div className="h-3 w-3 rounded-[3px] bg-white border border-white" />
          </div>
          <span className="text-[11px] text-zinc-500 font-body">More</span>
        </div>
      </div>
    </div>
  )
}