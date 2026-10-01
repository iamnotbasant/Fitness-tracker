"use client"

import React, { useMemo, useState, useRef, useEffect } from "react"
import type { Workout } from "@/lib/types"
import soundManager from "@/lib/sounds"

export type HeatmapPeriod = "today" | "week" | "month" | "year" | "all"

interface WorkoutHeatmapProps {
  workouts: Workout[]
  period?: HeatmapPeriod
  startDate?: string
  endDate?: string
  className?: string
}

interface DayCell {
  dateStr: string // YYYY-MM-DD
  dateObj: Date
  dayOfWeek: number // 0 = Sun, 6 = Sat
  isVisible: boolean // Falls inside period range
  isToday: boolean
  isSelectedDate?: boolean
  count: number
  totalSets: number
  totalReps: number
  workouts: { name: string; sets: number; reps: number; weight?: number }[]
}

const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dt = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dt}`
}

const formatTooltipDate = (d: Date): string => {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// GitHub Dark-Mode 5-step color scale
const GITHUB_COLORS = {
  empty: "#161b22",
  level1: "#0e4429",
  level2: "#006d32",
  level3: "#26a641",
  level4: "#39d353",
} as const

export function WorkoutHeatmap({
  workouts = [],
  period = "year",
  startDate: propStartDate,
  endDate: propEndDate,
  className = "",
}: WorkoutHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Tooltip & Info state
  const [hoveredDay, setHoveredDay] = useState<DayCell | null>(null)
  const [clickedDay, setClickedDay] = useState<DayCell | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const [showLearnPopover, setShowLearnPopover] = useState(false)

  // Map workouts by date YYYY-MM-DD
  const dataByDate = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number
        totalSets: number
        totalReps: number
        workouts: { name: string; sets: number; reps: number; weight?: number }[]
      }
    >()

    workouts.forEach((w) => {
      const dateStr = (w.date || "").slice(0, 10)
      if (!dateStr) return

      const existing = map.get(dateStr) || { count: 0, totalSets: 0, totalReps: 0, workouts: [] }
      const sets = Math.max(1, w.sets || 1)
      const reps = w.reps || 0
      const exName = w.exerciseName || w.name || "Workout"

      existing.count += 1
      existing.totalSets += sets
      existing.totalReps += reps * sets
      existing.workouts.push({
        name: exName,
        sets,
        reps,
        weight: w.weight,
      })

      map.set(dateStr, existing)
    })

    return map
  }, [workouts])

  // Determine grid boundaries based on period and props
  const { gridStartDate, gridEndDate, periodLabel, isDayVisible, selectedTargetDateStr } = useMemo(() => {
    const now = new Date()
    const todayStr = toLocalDateStr(now)

    let start: Date
    let end: Date
    let label = ""
    let checkVisible: (d: Date, dateStr: string) => boolean
    let targetDateStr: string | undefined = undefined

    if (period === "year") {
      const targetYear = propStartDate
        ? parseInt(propStartDate.slice(0, 4), 10) || now.getFullYear()
        : now.getFullYear()

      // Full Jan 1 - Dec 31
      start = new Date(targetYear, 0, 1)
      end = new Date(targetYear, 11, 31)
      label = `${targetYear}`

      checkVisible = (d) => d.getFullYear() === targetYear
    } else if (period === "month") {
      let targetYear = now.getFullYear()
      let targetMonth = now.getMonth()

      if (propStartDate) {
        const parts = propStartDate.slice(0, 10).split("-").map(Number)
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          targetYear = parts[0]
          targetMonth = parts[1] - 1
        }
      }

      start = new Date(targetYear, targetMonth, 1)
      end = new Date(targetYear, targetMonth + 1, 0)
      const monthName = start.toLocaleDateString("en-US", { month: "long" })
      label = `${monthName} ${targetYear}`

      checkVisible = (d) => d.getFullYear() === targetYear && d.getMonth() === targetMonth
    } else if (period === "week") {
      // 12 weeks ending on the Saturday of the navigated week
      const targetEnd = propEndDate ? new Date(propEndDate + "T12:00:00") : new Date(now)
      end = new Date(targetEnd)
      end.setDate(end.getDate() + (6 - end.getDay()))

      start = new Date(end)
      start.setDate(start.getDate() - (12 * 7 - 1))

      const navStart = propStartDate || toLocalDateStr(start)
      const navEnd = propEndDate || toLocalDateStr(end)

      if (propStartDate && propEndDate) {
        const sD = new Date(propStartDate + "T12:00:00")
        const eD = new Date(propEndDate + "T12:00:00")
        const sM = sD.toLocaleDateString("en-US", { month: "short" })
        const eM = eD.toLocaleDateString("en-US", { month: "short" })
        const y = eD.getFullYear()
        label = sM === eM ? `${sM} ${sD.getDate()} - ${eD.getDate()}, ${y}` : `${sM} ${sD.getDate()} - ${eM} ${eD.getDate()}, ${y}`
      } else {
        label = "this week"
      }

      checkVisible = (d, dStr) => dStr >= navStart && dStr <= navEnd
    } else if (period === "today") {
      targetDateStr = propStartDate || todayStr
      const targetDate = propStartDate ? new Date(propStartDate + "T12:00:00") : new Date(now)

      end = new Date(targetDate)
      end.setDate(end.getDate() + (6 - end.getDay()))

      start = new Date(end)
      start.setDate(start.getDate() - (12 * 7 - 1))

      if (targetDateStr === todayStr) {
        label = "today"
      } else {
        label = targetDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      }

      checkVisible = (_, dStr) => dStr === targetDateStr
    } else {
      // period === "all"
      if (propStartDate && propEndDate && propStartDate !== "1970-01-01") {
        start = new Date(propStartDate + "T00:00:00")
        end = new Date(propEndDate + "T23:59:59")
        label = `${propStartDate} - ${propEndDate}`
        checkVisible = (_, dStr) => dStr >= propStartDate && dStr <= propEndDate
      } else {
        // Find earliest workout date
        const allDates = Array.from(dataByDate.keys()).sort()
        const firstWorkoutDateStr = allDates.length > 0 ? allDates[0] : todayStr

        const firstDateParts = firstWorkoutDateStr.split("-").map(Number)
        start = new Date(firstDateParts[0], firstDateParts[1] - 1, firstDateParts[2])
        end = new Date(now)
        label = "all time"
        checkVisible = (_, dStr) => dStr >= firstWorkoutDateStr && dStr <= todayStr
      }
    }

    // Align start to the Sunday of that starting week
    const alignedStart = new Date(start)
    alignedStart.setDate(alignedStart.getDate() - alignedStart.getDay())
    alignedStart.setHours(0, 0, 0, 0)

    // Align end to the Saturday of that ending week
    const alignedEnd = new Date(end)
    alignedEnd.setDate(alignedEnd.getDate() + (6 - alignedEnd.getDay()))
    alignedEnd.setHours(23, 59, 59, 999)

    return {
      gridStartDate: alignedStart,
      gridEndDate: alignedEnd,
      periodLabel: label,
      isDayVisible: checkVisible,
      selectedTargetDateStr: targetDateStr,
    }
  }, [period, propStartDate, propEndDate, dataByDate])

  // Build weekly columns (each column = 7 days Sun..Sat)
  const { weeks, visibleWorkoutsCount, activeSetsList } = useMemo(() => {
    const cols: DayCell[][] = []
    const now = new Date()
    const todayStr = toLocalDateStr(now)
    let totalWorkouts = 0
    const setsList: number[] = []

    const cur = new Date(gridStartDate)
    // Guard against excessive range
    let weekCount = 0

    while (cur <= gridEndDate && weekCount < 70) {
      const week: DayCell[] = []

      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const dateStr = toLocalDateStr(cur)
        const dayDate = new Date(cur)
        const isVis = isDayVisible(dayDate, dateStr)
        const dayData = dataByDate.get(dateStr)

        const count = dayData?.count || 0
        const totalSets = dayData?.totalSets || 0
        const totalReps = dayData?.totalReps || 0
        const dayWorkouts = dayData?.workouts || []

        if (isVis && count > 0) {
          totalWorkouts += count
          setsList.push(totalSets)
        }

        week.push({
          dateStr,
          dateObj: dayDate,
          dayOfWeek,
          isVisible: isVis,
          isToday: dateStr === todayStr,
          isSelectedDate: selectedTargetDateStr ? dateStr === selectedTargetDateStr : undefined,
          count,
          totalSets,
          totalReps,
          workouts: dayWorkouts,
        })

        cur.setDate(cur.getDate() + 1)
      }

      cols.push(week)
      weekCount++
    }

    return {
      weeks: cols,
      visibleWorkoutsCount: totalWorkouts,
      activeSetsList: setsList.sort((a, b) => a - b),
    }
  }, [gridStartDate, gridEndDate, isDayVisible, dataByDate, selectedTargetDateStr])

  // Intensity thresholds computed from visible active days' total sets
  const intensityThresholds = useMemo(() => {
    if (activeSetsList.length === 0) {
      return { t2: 4, t3: 8, t4: 12 }
    }
    const len = activeSetsList.length
    const p25 = activeSetsList[Math.floor(len * 0.25)] || 1
    const p50 = activeSetsList[Math.floor(len * 0.5)] || 2
    const p75 = activeSetsList[Math.floor(len * 0.75)] || 3

    const t2 = Math.max(2, p25)
    const t3 = Math.max(t2 + 1, p50)
    const t4 = Math.max(t3 + 1, p75)

    return { t2, t3, t4 }
  }, [activeSetsList])

  // Get GitHub green level for a day
  const getCellBgColor = (day: DayCell) => {
    if (!day.isVisible || day.count === 0 || day.totalSets === 0) {
      return GITHUB_COLORS.empty
    }
    if (day.totalSets < intensityThresholds.t2) {
      return GITHUB_COLORS.level1
    }
    if (day.totalSets < intensityThresholds.t3) {
      return GITHUB_COLORS.level2
    }
    if (day.totalSets < intensityThresholds.t4) {
      return GITHUB_COLORS.level3
    }
    return GITHUB_COLORS.level4
  }

  // Month labels across top
  const monthLabels = useMemo(() => {
    const labels: { label: string; colIndex: number }[] = []
    let lastMonth = -1
    let lastCol = -4

    weeks.forEach((week, colIdx) => {
      // Find first visible day in this column, or use middle day
      const visibleDay = week.find((d) => d.isVisible) || week[0]
      const m = visibleDay.dateObj.getMonth()

      if (m !== lastMonth && colIdx - lastCol >= 2) {
        labels.push({
          label: visibleDay.dateObj.toLocaleDateString("en-US", { month: "short" }),
          colIndex: colIdx,
        })
        lastMonth = m
        lastCol = colIdx
      }
    })

    return labels
  }, [weeks])

  // Header Title
  const headerTitle = useMemo(() => {
    if (visibleWorkoutsCount === 0) {
      return `No workouts in ${periodLabel}`
    }
    if (visibleWorkoutsCount === 1) {
      return `1 workout in ${periodLabel}`
    }
    return `${visibleWorkoutsCount} workouts in ${periodLabel}`
  }, [visibleWorkoutsCount, periodLabel])

  // Scroll to latest week when rendered or range changed
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [weeks.length, period, propStartDate])

  // Close active tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setClickedDay(null)
        setShowLearnPopover(false)
      }
    }
    document.addEventListener("pointerdown", handleClickOutside)
    return () => document.removeEventListener("pointerdown", handleClickOutside)
  }, [])

  const activeTooltip = clickedDay || hoveredDay

  const handleCellInteraction = (day: DayCell, e: React.MouseEvent<HTMLDivElement>, isClick = false) => {
    if (!day.isVisible) return

    if (containerRef.current) {
      const cardRect = containerRef.current.getBoundingClientRect()
      const cellRect = e.currentTarget.getBoundingClientRect()
      const x = cellRect.left - cardRect.left + cellRect.width / 2
      const y = cellRect.top - cardRect.top
      setTooltipPos({ x, y })
    }

    if (isClick) {
      soundManager.play("click", 0.1)
      if (clickedDay?.dateStr === day.dateStr) {
        setClickedDay(null)
      } else {
        setClickedDay(day)
      }
    } else {
      setHoveredDay(day)
    }
  }

  // Column width 10px + gap 3px = 13px step
  const CELL_SIZE_PX = 10
  const CELL_GAP_PX = 3
  const STEP_PX = CELL_SIZE_PX + CELL_GAP_PX

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* ─── GitHub-exact Header (outside bordered container) ─── */}
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-base sm:text-lg font-semibold text-white font-display tracking-tight">
          {headerTitle}
        </h2>
      </div>

      {/* ─── Bordered Contribution Graph Container ─── */}
      <div
        ref={containerRef}
        className="relative rounded-md border border-[#30363d] bg-[#0d1117] p-4 sm:p-5 shadow-sm select-none"
      >
        {/* Floating Tooltip */}
        {activeTooltip && tooltipPos && (
          <div
            className="pointer-events-none absolute z-50 transform -translate-x-1/2 -translate-y-full mb-2 w-64 max-w-[90vw] p-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-white shadow-2xl transition-all duration-100"
            style={{
              left: `${Math.max(130, Math.min(tooltipPos.x, (containerRef.current?.clientWidth || 360) - 130))}px`,
              top: `${tooltipPos.y - 6}px`,
            }}
          >
            <div className="text-xs font-semibold text-white font-display flex items-center justify-between border-b border-[#30363d] pb-1.5 mb-1.5">
              <span>{formatTooltipDate(activeTooltip.dateObj)}</span>
              {activeTooltip.totalSets > 0 && (
                <span className="text-[10px] font-mono text-[#39d353] px-1.5 py-0.2 rounded bg-[#0e4429]/60 border border-[#006d32]">
                  {activeTooltip.totalSets} {activeTooltip.totalSets === 1 ? "set" : "sets"}
                </span>
              )}
            </div>

            {activeTooltip.count > 0 ? (
              <div className="space-y-1">
                <p className="text-[11px] text-zinc-300 font-body">
                  <strong className="text-white font-semibold">
                    {activeTooltip.count} {activeTooltip.count === 1 ? "workout" : "workouts"}
                  </strong>
                  {activeTooltip.totalReps > 0 && ` · ${activeTooltip.totalReps} total reps`}
                </p>
                <div className="max-h-24 overflow-y-auto space-y-0.5 pt-1 text-[11px] text-zinc-400">
                  {activeTooltip.workouts.map((w, idx) => (
                    <div key={idx} className="flex items-center justify-between truncate">
                      <span className="truncate">{w.name}</span>
                      <span className="font-mono text-zinc-200 ml-1.5 shrink-0">
                        {w.sets}×{w.reps}
                        {w.weight ? ` @${w.weight}kg` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[#7d8590] font-body">No workouts logged on this day</p>
            )}
          </div>
        )}

        {/* ─── Scrollable Grid Wrapper (Only graph scrolls horizontally on mobile) ─── */}
        <div
          ref={scrollRef}
          className="overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
        >
          <div className="inline-flex flex-col">
            {/* Top Row: Month Labels Aligned Over Columns */}
            <div
              className="relative h-[16px] mb-1.5 text-[10px] text-[#7d8590] font-sans font-normal"
              style={{
                marginLeft: "30px", // Align right past the day label column
                width: `${weeks.length * STEP_PX}px`,
              }}
            >
              {monthLabels.map(({ label, colIndex }, idx) => (
                <span
                  key={idx}
                  className="absolute"
                  style={{ left: `${colIndex * STEP_PX}px` }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Main Area: Day Labels on Left + Columns of Cells */}
            <div className="flex items-start">
              {/* Day of Week Labels: Mon, Wed, Fri */}
              <div
                className="flex flex-col select-none pr-2 text-[9px] text-[#7d8590] font-sans"
                style={{ gap: `${CELL_GAP_PX}px`, width: "30px" }}
              >
                {/* Sun (row 0) */}
                <div className="h-[10px] leading-[10px] opacity-0" aria-hidden="true">
                  Sun
                </div>
                {/* Mon (row 1) */}
                <div className="h-[10px] leading-[10px]">Mon</div>
                {/* Tue (row 2) */}
                <div className="h-[10px] leading-[10px] opacity-0" aria-hidden="true">
                  Tue
                </div>
                {/* Wed (row 3) */}
                <div className="h-[10px] leading-[10px]">Wed</div>
                {/* Thu (row 4) */}
                <div className="h-[10px] leading-[10px] opacity-0" aria-hidden="true">
                  Thu
                </div>
                {/* Fri (row 5) */}
                <div className="h-[10px] leading-[10px]">Fri</div>
                {/* Sat (row 6) */}
                <div className="h-[10px] leading-[10px] opacity-0" aria-hidden="true">
                  Sat
                </div>
              </div>

              {/* Grid Columns */}
              <div className="flex" style={{ gap: `${CELL_GAP_PX}px` }}>
                {weeks.map((week, colIdx) => (
                  <div
                    key={colIdx}
                    className="flex flex-col"
                    style={{ gap: `${CELL_GAP_PX}px` }}
                  >
                    {week.map((day, rowIdx) => {
                      if (!day.isVisible) {
                        // Days outside the range rendered as invisible placeholders to keep grid aligned
                        return (
                          <div
                            key={rowIdx}
                            className="w-[10px] h-[10px] opacity-0 pointer-events-none"
                            aria-hidden="true"
                          />
                        )
                      }

                      const bgColor = getCellBgColor(day)
                      const isHighlighted = day.isToday || day.isSelectedDate

                      return (
                        <div
                          key={rowIdx}
                          onMouseEnter={(e) => handleCellInteraction(day, e, false)}
                          onMouseLeave={() => setHoveredDay(null)}
                          onClick={(e) => handleCellInteraction(day, e, true)}
                          className={`w-[10px] h-[10px] rounded-[2px] cursor-pointer transition-all duration-100 ${
                            isHighlighted ? "ring-1 ring-white/70" : ""
                          }`}
                          style={{
                            backgroundColor: bgColor,
                            border: `1px solid ${
                              day.count === 0 ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.08)"
                            }`,
                          }}
                          aria-label={`${day.count} workouts on ${day.dateStr}`}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Bottom Legend & Info ─── */}
        <div className="flex items-center justify-between pt-4 mt-3 border-t border-[#30363d] text-xs text-[#7d8590] flex-wrap gap-2">
          {/* Bottom-left: "Learn how we count contributions" */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                soundManager.play("click", 0.1)
                setShowLearnPopover((prev) => !prev)
              }}
              className="text-[11px] text-[#7d8590] hover:text-zinc-200 transition-colors cursor-pointer underline-offset-2 hover:underline"
            >
              Learn how we count contributions
            </button>

            {showLearnPopover && (
              <div className="absolute left-0 bottom-full mb-2 z-40 w-64 p-3 rounded-lg bg-[#161b22] border border-[#30363d] text-zinc-300 text-xs shadow-xl space-y-1">
                <p className="font-semibold text-white font-display">Contribution Intensity</p>
                <p className="text-[11px] leading-relaxed text-zinc-400 font-body">
                  Heatmap color scales with your total completed sets each day. More sets = brighter green intensity.
                </p>
              </div>
            )}
          </div>

          {/* Bottom-right: "Less" + 5 squares + "More" */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#7d8590] font-sans">
            <span>Less</span>
            <div className="flex items-center gap-[3px]">
              <div
                className="w-[10px] h-[10px] rounded-[2px]"
                style={{
                  backgroundColor: GITHUB_COLORS.empty,
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                }}
                title="0 sets"
              />
              <div
                className="w-[10px] h-[10px] rounded-[2px]"
                style={{
                  backgroundColor: GITHUB_COLORS.level1,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
                title="Low volume"
              />
              <div
                className="w-[10px] h-[10px] rounded-[2px]"
                style={{
                  backgroundColor: GITHUB_COLORS.level2,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
                title="Moderate volume"
              />
              <div
                className="w-[10px] h-[10px] rounded-[2px]"
                style={{
                  backgroundColor: GITHUB_COLORS.level3,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
                title="High volume"
              />
              <div
                className="w-[10px] h-[10px] rounded-[2px]"
                style={{
                  backgroundColor: GITHUB_COLORS.level4,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
                title="Peak volume"
              />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  )
}