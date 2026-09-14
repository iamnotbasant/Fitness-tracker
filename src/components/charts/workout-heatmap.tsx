"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import type { Workout } from "@/lib/types"
import { Flame, Trophy, Calendar, Zap, ChevronRight } from "lucide-react"
import soundManager from "@/lib/sounds"

interface DayData {
  date: string
  volume: number
  points: number
  workouts: { name: string; sets: number; reps: number; points: number }[]
}

type Palette = "emerald" | "flame" | "cyan"
export type HeatmapRange = "4w" | "12w" | "26w" | "52w" | "all"

export function WorkoutHeatmap({ workouts }: { workouts: Workout[] }) {
  const [palette, setPalette] = useState<Palette>("emerald")
  const [range, setRange] = useState<HeatmapRange>("52w")
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const earliestWorkoutDate = useMemo(() => {
    if (!workouts || workouts.length === 0) return null
    const sorted = [...workouts].filter((w) => w.date).sort((a, b) => a.date.localeCompare(b.date))
    return sorted[0]?.date || null
  }, [workouts])

  const { heatmapData, streakStats } = useMemo(() => {
    const dataByDate = new Map<string, { volume: number; points: number; workouts: { name: string; sets: number; reps: number; points: number }[] }>()

    workouts.forEach((w) => {
      const existing = dataByDate.get(w.date) || { volume: 0, points: 0, workouts: [] }
      const vol = w.volume || (w.sets && w.reps ? w.sets * w.reps : 0) || w.points || 0
      const pts = w.points ?? w.total_points ?? 0
      const exName = w.exerciseName || w.name || "Workout"

      dataByDate.set(w.date, {
        volume: existing.volume + vol,
        points: existing.points + pts,
        workouts: [...existing.workouts, { name: exName, sets: w.sets || 1, reps: w.reps || 0, points: pts }]
      })
    })

    const weeks: DayData[][] = []
    const today = new Date()
    const startDate = new Date(today)

    if (range === "4w") {
      startDate.setDate(today.getDate() - 28)
    } else if (range === "12w") {
      startDate.setDate(today.getDate() - 84)
    } else if (range === "26w") {
      startDate.setDate(today.getDate() - 182)
    } else if (range === "all" && earliestWorkoutDate) {
      const earliest = new Date(earliestWorkoutDate)
      if (!isNaN(earliest.getTime())) {
        startDate.setTime(earliest.getTime())
      } else {
        startDate.setDate(today.getDate() - 364)
      }
    } else {
      // 52w default
      startDate.setDate(today.getDate() - 364)
    }

    // Start from the first Sunday before or on startDate
    const dayOfWeek = startDate.getDay()
    startDate.setDate(startDate.getDate() - dayOfWeek)

    let currentDate = new Date(startDate)
    const allDays: { dateStr: string; hasWorkout: boolean }[] = []

    while (currentDate <= today) {
      const week: DayData[] = []
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const dateStr = currentDate.toISOString().slice(0, 10)
        const data = dataByDate.get(dateStr)
        const hasWorkout = (data?.workouts.length || 0) > 0

        week.push({
          date: dateStr,
          volume: data?.volume || 0,
          points: data?.points || 0,
          workouts: data?.workouts || []
        })

        if (currentDate <= today) {
          allDays.push({ dateStr, hasWorkout })
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      weeks.push(week)
    }

    // Calculate Streaks
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    let activeDays = 0

    // Reverse from today backwards to find current streak
    const todayStr = today.toISOString().slice(0, 10)
    let checkDate = new Date(today)
    
    // Check if today or yesterday has a workout to maintain streak
    const hasToday = dataByDate.has(todayStr)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const hasYesterday = dataByDate.has(yesterday.toISOString().slice(0, 10))

    if (hasToday || hasYesterday) {
      if (!hasToday) {
        checkDate.setDate(checkDate.getDate() - 1)
      }
      while (true) {
        const dStr = checkDate.toISOString().slice(0, 10)
        if (dataByDate.has(dStr)) {
          currentStreak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
    }

    // Calculate longest streak & active days across whole year
    allDays.forEach(({ hasWorkout }) => {
      if (hasWorkout) {
        activeDays++
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
      }
    }
  }, [workouts])

  // Scroll to the latest weeks on load
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth
    }
  }, [heatmapData])

  // Thresholds for color scale
  const levelThresholds = useMemo(() => {
    const volumes = heatmapData.flat().map(d => d.volume).filter(v => v > 0)
    const avg = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 100
    return {
      low: Math.max(1, avg * 0.5),
      medium: avg,
      high: avg * 1.5
    }
  }, [heatmapData])

  const getCellColor = (volume: number) => {
    if (volume === 0) {
      return "bg-secondary/40 border-border/30 hover:border-primary/50"
    }

    if (palette === "emerald") {
      if (volume <= levelThresholds.low) return "bg-[#065f46] border-[#047857]/50"
      if (volume <= levelThresholds.medium) return "bg-[#059669] border-[#10b981]/60"
      if (volume <= levelThresholds.high) return "bg-[#10b981] border-[#34d399]/70"
      return "bg-[#34d399] border-[#6ee7b7]"
    } else if (palette === "flame") {
      if (volume <= levelThresholds.low) return "bg-[#9a3412] border-[#c2410c]/50"
      if (volume <= levelThresholds.medium) return "bg-[#ea580c] border-[#f97316]/60"
      if (volume <= levelThresholds.high) return "bg-[#f97316] border-[#fb923c]/70"
      return "bg-[#fb923c] border-[#fdba74]"
    } else {
      // cyan
      if (volume <= levelThresholds.low) return "bg-[#0369a1] border-[#0284c7]/50"
      if (volume <= levelThresholds.medium) return "bg-[#0284c7] border-[#38bdf8]/60"
      if (volume <= levelThresholds.high) return "bg-[#0284c7] border-[#38bdf8]/70"
      return "bg-[#38bdf8] border-[#7dd3fc]"
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = []
    let lastMonth = -1

    heatmapData.forEach((week, idx) => {
      const firstDay = new Date(week[0].date)
      const currentMonth = firstDay.getMonth()

      if (currentMonth !== lastMonth && idx > 0) {
        labels.push({
          month: firstDay.toLocaleDateString('en-US', { month: 'short' }),
          weekIndex: idx
        })
        lastMonth = currentMonth
      }
    })

    return labels
  }, [heatmapData])

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-5">
      {/* Heatmap Card Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-border/40">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Consistency</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Start Date Box */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-secondary/50 border border-border/60 text-xs">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Started:</span>
            <span className="font-semibold text-foreground">
              {earliestWorkoutDate
                ? new Date(earliestWorkoutDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Today"}
            </span>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
            {streakStats.activeDays} active days
          </span>
        </div>
      </div>

      {/* Range and Palette Selectors */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        {/* Time Span Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Span:</span>
          <div className="flex items-center bg-secondary/70 p-0.5 rounded-lg border border-border/50">
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
                onClick={() => {
                  soundManager.play("click", 0.3)
                  setRange(r.id)
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  range === r.id
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color Palette Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Theme:</span>
          <div className="flex items-center bg-secondary/70 p-0.5 rounded-lg border border-border/50">
            {(
              [
                { id: "emerald", label: "Emerald" },
                { id: "flame", label: "Flame" },
                { id: "cyan", label: "Cyan" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  soundManager.play("click", 0.3)
                  setPalette(p.id)
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  palette === p.id
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap Grid Container with Auto-Scroll to End */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent rounded-xl"
      >
        <div className="inline-flex flex-col gap-1.5 min-w-[760px] py-1">
          {/* Month labels at top */}
          <div className="flex gap-1 pl-9 mb-1 text-[11px] text-muted-foreground font-medium select-none">
            {monthLabels.map(({ month, weekIndex }, idx) => (
              <div
                key={idx}
                style={{
                  marginLeft: idx === 0 ? '0' : `${Math.max(0, (weekIndex - (monthLabels[idx - 1]?.weekIndex || 0) - 1) * 15.5)}px`
                }}
              >
                {month}
              </div>
            ))}
          </div>

          {/* Day labels and heatmap grid */}
          <div className="flex gap-1.5 items-center">
            {/* Day labels on the left */}
            <div className="flex flex-col gap-1 text-[10px] text-muted-foreground font-medium select-none pr-1.5">
              <div className="h-3 leading-3 opacity-0">Sun</div>
              <div className="h-3 leading-3">Mon</div>
              <div className="h-3 leading-3 opacity-0">Tue</div>
              <div className="h-3 leading-3">Wed</div>
              <div className="h-3 leading-3 opacity-0">Thu</div>
              <div className="h-3 leading-3">Fri</div>
              <div className="h-3 leading-3 opacity-0">Sat</div>
            </div>

            {/* Heatmap squares */}
            {heatmapData.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1">
                {week.map((day, dayIdx) => {
                  const hasWorkouts = day.workouts.length > 0
                  return (
                    <div
                      key={`${weekIdx}-${dayIdx}`}
                      className="group/day relative"
                    >
                      <div
                        className={`h-3 w-3 rounded-[3px] border transition-all duration-150 cursor-pointer hover:scale-125 hover:z-20 ${getCellColor(day.volume)}`}
                      />

                      {/* Custom Tooltip */}
                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/day:flex flex-col gap-1 z-30 w-52 p-2.5 rounded-xl bg-popover text-popover-foreground text-xs shadow-2xl border border-border backdrop-blur-md">
                        <div className="flex items-center justify-between border-b border-border/50 pb-1">
                          <span className="font-bold">{formatDate(day.date)}</span>
                          {hasWorkouts && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                              {day.points.toLocaleString()} pts
                            </span>
                          )}
                        </div>
                        {hasWorkouts ? (
                          <div className="space-y-1 pt-0.5">
                            <span className="text-[11px] text-muted-foreground font-medium">
                              Volume: <strong className="text-foreground">{day.volume} reps/load</strong> ({day.workouts.length} exercises)
                            </span>
                            <div className="max-h-24 overflow-y-auto space-y-0.5 pt-1">
                              {day.workouts.map((w, i) => (
                                <div key={i} className="flex items-center justify-between text-[11px] text-muted-foreground truncate">
                                  <span className="truncate">{w.name}</span>
                                  <span className="font-medium text-foreground ml-1.5 shrink-0">{w.sets}×{w.reps}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Rest day / No workout logged</span>
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

      {/* Legend */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground flex-wrap gap-2">
        <span className="font-medium text-foreground">Consistency Grid (365 Days)</span>
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="flex gap-1 items-center">
            <div className="h-3 w-3 rounded-[3px] bg-secondary/40 border border-border/30" />
            <div className={`h-3 w-3 rounded-[3px] ${getCellColor(levelThresholds.low * 0.8)}`} />
            <div className={`h-3 w-3 rounded-[3px] ${getCellColor(levelThresholds.medium * 0.9)}`} />
            <div className={`h-3 w-3 rounded-[3px] ${getCellColor(levelThresholds.high * 0.9)}`} />
            <div className={`h-3 w-3 rounded-[3px] ${getCellColor(levelThresholds.high * 1.5)}`} />
          </div>
          <span>More Intensity</span>
        </div>
      </div>
    </div>
  )
}