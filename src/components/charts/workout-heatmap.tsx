"use client"

import React, { useMemo, useState, useRef, useEffect } from "react"
import type { Workout } from "@/lib/types"
import soundManager from "@/lib/sounds"
import { Calendar as CalendarIcon } from "lucide-react"

interface DayData {
  date: string // YYYY-MM-DD
  count: number
  volume: number
  points: number
  workouts: { name: string; sets: number; reps: number; timeSeconds?: number; points: number }[]
  isFuture: boolean
  isPeriodBoundary?: boolean
}

export type HeatmapPeriod = "today" | "week" | "month" | "year" | "all"

interface WorkoutHeatmapProps {
  workouts: Workout[]
  period?: HeatmapPeriod
  startDate?: string
  endDate?: string
  className?: string
}

const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dt = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dt}`
}

export function WorkoutHeatmap({
  workouts = [],
  period = "year",
  startDate: propStartDate,
  endDate: propEndDate,
  className = "",
}: WorkoutHeatmapProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [, setSelectedDay] = useState<DayData | null>(null)

  // Map workouts by date
  const dataByDate = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number
        volume: number
        points: number
        workouts: { name: string; sets: number; reps: number; timeSeconds?: number; points: number }[]
      }
    >()

    workouts.forEach((w) => {
      const dateStr = (w.date || "").slice(0, 10)
      if (!dateStr) return

      const existing = map.get(dateStr) || { count: 0, volume: 0, points: 0, workouts: [] }
      const vol = w.volume || (w.sets && w.reps ? w.sets * w.reps : 0) || w.points || 0
      const pts = w.points ?? w.total_points ?? 0
      const exName = w.exerciseName || w.name || "Workout"

      existing.count += 1
      existing.volume += vol
      existing.points += pts
      existing.workouts.push({
        name: exName,
        sets: w.sets || 1,
        reps: w.reps || 0,
        timeSeconds: w.timeSeconds,
        points: pts,
      })

      map.set(dateStr, existing)
    })

    return map
  }, [workouts])

  // Determine grid start and end dates
  const { gridStartDate, gridEndDate, totalWeeks, activeDaysCount, totalWorkoutsCount } = useMemo(() => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    let start: Date
    let end: Date

    if (period === "year") {
      const y = propStartDate ? parseInt(propStartDate.slice(0, 4), 10) : today.getFullYear()
      start = new Date(y, 0, 1)
      end = new Date(y, 11, 31)
    } else if (period === "month") {
      if (propStartDate) {
        const parts = propStartDate.slice(0, 10).split("-").map(Number)
        start = new Date(parts[0], parts[1] - 1, 1)
        end = new Date(parts[0], parts[1], 0)
      } else {
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      }
    } else if (period === "week" || period === "today") {
      // Show 12 weeks ending on the navigated week/day's Sunday (or Saturday)
      const targetEnd = propEndDate ? new Date(propEndDate + "T23:59:59") : new Date(today)
      // align end to Saturday of that week
      const endDay = targetEnd.getDay()
      targetEnd.setDate(targetEnd.getDate() + (6 - endDay))
      end = new Date(targetEnd)

      start = new Date(end)
      start.setDate(start.getDate() - 12 * 7 + 1)
    } else {
      // period === "all"
      if (propStartDate && propEndDate && propStartDate !== "1970-01-01") {
        start = new Date(propStartDate + "T00:00:00")
        end = new Date(propEndDate + "T23:59:59")
      } else {
        // Find earliest workout
        const dates = Array.from(dataByDate.keys()).sort()
        if (dates.length > 0) {
          start = new Date(dates[0] + "T00:00:00")
        } else {
          start = new Date(today)
          start.setDate(today.getDate() - 52 * 7)
        }
        end = new Date(today)
      }
    }

    // Align start to the Sunday on or before start
    const startDayOfWeek = start.getDay() // 0 = Sunday
    start.setDate(start.getDate() - startDayOfWeek)
    start.setHours(0, 0, 0, 0)

    // Align end to Saturday on or after end
    const endDayOfWeek = end.getDay()
    if (endDayOfWeek !== 6) {
      end.setDate(end.getDate() + (6 - endDayOfWeek))
    }
    end.setHours(23, 59, 59, 999)

    // Count active days in the range
    let activeDays = 0
    let totalWorkouts = 0
    const checkCur = new Date(start)
    while (checkCur <= end) {
      const dStr = toLocalDateStr(checkCur)
      const data = dataByDate.get(dStr)
      if (data && data.count > 0) {
        activeDays++
        totalWorkouts += data.count
      }
      checkCur.setDate(checkCur.getDate() + 1)
    }

    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const weeks = Math.max(1, Math.ceil(diffDays / 7))

    return {
      gridStartDate: start,
      gridEndDate: end,
      totalWeeks: weeks,
      activeDaysCount: activeDays,
      totalWorkoutsCount: totalWorkouts,
    }
  }, [period, propStartDate, propEndDate, dataByDate])

  // Build heatmap columns (weeks)
  const heatmapData = useMemo(() => {
    const weeks: DayData[][] = []
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const cur = new Date(gridStartDate)
    while (cur <= gridEndDate) {
      const week: DayData[] = []
      for (let d = 0; d < 7; d++) {
        const dateStr = toLocalDateStr(cur)
        const data = dataByDate.get(dateStr)
        const isFuture = cur > today

        week.push({
          date: dateStr,
          count: data?.count || 0,
          volume: data?.volume || 0,
          points: data?.points || 0,
          workouts: data?.workouts || [],
          isFuture,
        })
        cur.setDate(cur.getDate() + 1)
      }
      weeks.push(week)
      if (weeks.length >= 65) break
    }

    return weeks
  }, [gridStartDate, gridEndDate, dataByDate])

  // Intensity levels
  const levelThresholds = useMemo(() => {
    const volumes = heatmapData.flat().map((d) => d.volume).filter((v) => v > 0)
    if (volumes.length === 0) return { low: 10, mid: 30, high: 60 }
    volumes.sort((a, b) => a - b)
    const p25 = volumes[Math.floor(volumes.length * 0.25)] || 1
    const p50 = volumes[Math.floor(volumes.length * 0.5)] || 2
    const p75 = volumes[Math.floor(volumes.length * 0.75)] || 3
    return { low: p25, mid: p50, high: p75 }
  }, [heatmapData])

  const getCellColor = (day: DayData) => {
    if (day.isFuture) {
      return "bg-zinc-900/30 border-zinc-800/30 border-dashed opacity-30 cursor-default"
    }
    if (day.count === 0) {
      return "bg-zinc-900 border-zinc-800/80 hover:border-zinc-600"
    }
    if (day.volume <= levelThresholds.low || day.count === 1) {
      return "bg-emerald-950 border-emerald-800/70 hover:border-emerald-600"
    }
    if (day.volume <= levelThresholds.mid || day.count === 2) {
      return "bg-emerald-800 border-emerald-700/80 hover:border-emerald-500"
    }
    if (day.volume <= levelThresholds.high || day.count === 3) {
      return "bg-emerald-600 border-emerald-500 hover:border-emerald-400"
    }
    return "bg-emerald-400 border-emerald-300 hover:border-emerald-200"
  }

  // Month labels
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

  // Grid styling config based on number of weeks
  const gridConfig = useMemo(() => {
    if (totalWeeks <= 6) {
      return {
        boxClass: "h-7 w-7 sm:h-8 sm:w-8 rounded-lg",
        dayLabelClass: "h-7 sm:h-8 leading-7 sm:leading-8 text-xs",
        gapColClass: "gap-2 sm:gap-2.5",
        gapRowClass: "gap-2 sm:gap-2.5",
        minWidthClass: "min-w-0 w-full justify-start",
        colWidthPx: 36,
      }
    }
    if (totalWeeks <= 14) {
      return {
        boxClass: "h-5 w-5 sm:h-6 sm:w-6 rounded-md",
        dayLabelClass: "h-5 sm:h-6 leading-5 sm:leading-6 text-[11px]",
        gapColClass: "gap-1.5 sm:gap-2",
        gapRowClass: "gap-1.5 sm:gap-2",
        minWidthClass: "min-w-[420px]",
        colWidthPx: 26,
      }
    }
    return {
      boxClass: "h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-[4px]",
      dayLabelClass: "h-3.5 sm:h-4 leading-3.5 sm:leading-4 text-[10px]",
      gapColClass: "gap-1.5",
      gapRowClass: "gap-1.5",
      minWidthClass: "min-w-[680px]",
      colWidthPx: 18,
    }
  }, [totalWeeks])

  // Scroll to latest week when range changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      if (totalWeeks > 14) {
        scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth
      } else {
        scrollContainerRef.current.scrollLeft = 0
      }
    }
  }, [totalWeeks, period, propStartDate])

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className={`rounded-3xl border border-zinc-800/90 bg-[#121316] p-5 sm:p-6 shadow-xl space-y-4 ${className}`}>
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-emerald-400">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white font-display">
              Workout Activity
            </h2>
            <p className="text-xs text-zinc-400 font-body">
              Contribution graph · Daily exercise frequency
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs sm:text-sm font-bold text-white font-display tabular-nums block">
            {activeDaysCount} {activeDaysCount === 1 ? "day" : "days"}
          </span>
          <span className="text-[11px] text-zinc-500 font-body">
            {totalWorkoutsCount} {totalWorkoutsCount === 1 ? "workout" : "workouts"}
          </span>
        </div>
      </div>

      {/* ─── Heatmap Grid Scroll Container ─── */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent rounded-xl"
      >
        <div className={`inline-flex flex-col gap-1.5 ${gridConfig.minWidthClass} py-1`}>
          {/* Month labels at top */}
          <div className="flex gap-1 pl-8 sm:pl-9 mb-1 text-[11px] text-zinc-500 font-mono font-medium select-none">
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

          {/* Day labels and squares */}
          <div className={`flex ${gridConfig.gapColClass} items-center`}>
            {/* Day of week labels on left: Sun, Mon, Tue, Wed, Thu, Fri, Sat */}
            <div className={`flex flex-col ${gridConfig.gapRowClass} text-zinc-500 font-mono font-medium select-none pr-1.5`}>
              <div className={`${gridConfig.dayLabelClass} opacity-0`}>Sun</div>
              <div className={`${gridConfig.dayLabelClass}`}>Mon</div>
              <div className={`${gridConfig.dayLabelClass} opacity-0`}>Tue</div>
              <div className={`${gridConfig.dayLabelClass}`}>Wed</div>
              <div className={`${gridConfig.dayLabelClass} opacity-0`}>Thu</div>
              <div className={`${gridConfig.dayLabelClass}`}>Fri</div>
              <div className={`${gridConfig.dayLabelClass} opacity-0`}>Sat</div>
            </div>

            {/* Weeks */}
            {heatmapData.map((week, weekIdx) => (
              <div key={weekIdx} className={`flex flex-col ${gridConfig.gapRowClass}`}>
                {week.map((day, dayIdx) => {
                  const hasWorkouts = day.count > 0

                  return (
                    <div
                      key={`${weekIdx}-${dayIdx}`}
                      className="group/day relative"
                      onClick={() => {
                        soundManager.play("click", 0.1)
                        setSelectedDay(day)
                      }}
                    >
                      <div
                        className={`${gridConfig.boxClass} border transition-all duration-150 cursor-pointer hover:scale-115 hover:z-20 ${getCellColor(
                          day
                        )}`}
                      />

                      {/* Tooltip on hover */}
                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/day:flex flex-col gap-1 z-30 w-52 p-2.5 rounded-xl bg-zinc-950 text-white text-xs shadow-2xl border border-zinc-800">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
                          <span className="font-semibold text-white font-body">{formatDate(day.date)}</span>
                          {hasWorkouts && (
                            <span className="text-[10px] font-display font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700 tabular-nums">
                              {day.points.toLocaleString()} pts
                            </span>
                          )}
                        </div>
                        {day.isFuture ? (
                          <span className="text-[11px] text-zinc-500 italic font-body">Upcoming</span>
                        ) : hasWorkouts ? (
                          <div className="space-y-1 pt-0.5">
                            <span className="text-[11px] text-zinc-300 font-body">
                              <strong className="text-white font-display tabular-nums">
                                {day.count} {day.count === 1 ? "workout" : "workouts"}
                              </strong>
                              {day.volume > 0 && ` · ${day.volume} reps`}
                            </span>
                            <div className="max-h-24 overflow-y-auto space-y-0.5 pt-1">
                              {day.workouts.map((w, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between text-[11px] text-zinc-400 truncate"
                                >
                                  <span className="truncate font-body">{w.name}</span>
                                  <span className="font-display tabular-nums text-zinc-200 ml-1.5 shrink-0">
                                    {w.sets}×{w.timeSeconds ? `${w.timeSeconds}s` : w.reps}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-500 font-body">No workouts logged</span>
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

      {/* ─── Legend & Empty State Note ─── */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs text-zinc-400 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-body">
          {activeDaysCount === 0 ? (
            <span className="text-zinc-500 italic">No workouts logged in this period</span>
          ) : (
            <span>Tap or hover a day to view details</span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500 font-body">Less</span>
          <div className="flex gap-1 items-center">
            <div className="h-3 w-3 rounded-[3px] bg-zinc-900 border border-zinc-800/80" title="No workouts" />
            <div className="h-3 w-3 rounded-[3px] bg-emerald-950 border border-emerald-800/70" title="Low activity" />
            <div className="h-3 w-3 rounded-[3px] bg-emerald-800 border border-emerald-700/80" title="Medium activity" />
            <div className="h-3 w-3 rounded-[3px] bg-emerald-600 border border-emerald-500" title="High activity" />
            <div className="h-3 w-3 rounded-[3px] bg-emerald-400 border border-emerald-300" title="Peak activity" />
          </div>
          <span className="text-[11px] text-zinc-500 font-body">More</span>
        </div>
      </div>
    </div>
  )
}