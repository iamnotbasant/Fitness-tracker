"use client"

import { useMemo, useState, useEffect } from "react"
import type { Workout } from "@/lib/types"
import {
  LayoutGrid,
  Clock,
} from "lucide-react"
import {
  EvilTrophy,
  EvilStar,
  EvilChart,
  EvilCheck,
  EvilCalendar,
  EvilArrowUp,
  EvilPlus,
  EvilTrash,
} from "@/components/ui/evil-icons"
import soundManager from "@/lib/sounds"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type MilestoneTier = "diamond" | "gold" | "silver" | "bronze" | "custom"

export interface MilestoneItem {
  id: string
  date: string
  title: string
  exerciseName: string
  category: "push" | "pull" | "legs" | "core" | "streak" | "volume" | "skill"
  type: "pr" | "volume" | "streak" | "benchmark" | "custom"
  tier: MilestoneTier
  metricValue: string
  improvementText?: string
  isCustom?: boolean
}

type CustomMilestone = {
  id: string
  date: string
  title: string
  metric?: string
  category: "push" | "pull" | "legs" | "core" | "skill"
}

export function ProgressionTimeline({ workouts }: { workouts: Workout[] }) {
  const [customMilestones, setCustomMilestones] = useState<CustomMilestone[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | "pr" | "volume" | "custom">("all")
  const [viewLayout, setViewLayout] = useState<"grid" | "timeline">("grid")
  const [newMilestone, setNewMilestone] = useState({
    date: new Date().toISOString().slice(0, 10),
    title: "",
    metric: "",
    category: "legs" as const,
  })

  // Load custom milestones from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("progression-milestones")
    if (stored) {
      try {
        setCustomMilestones(JSON.parse(stored))
      } catch (e) {
        console.error("Failed to load milestones", e)
      }
    }
  }, [])

  // Helper for human-readable timer formatting
  const formatTime = (sec: number) => {
    if (!sec) return "0s"
    if (sec >= 60) {
      const mins = Math.floor(sec / 60)
      const rem = sec % 60
      return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`
    }
    return `${sec}s`
  }

  // Helper to infer muscle category
  const getExerciseCategory = (name: string): "push" | "pull" | "legs" | "core" | "skill" => {
    const lower = name.toLowerCase()
    if (
      lower.includes("squat") ||
      lower.includes("lunge") ||
      lower.includes("leg") ||
      lower.includes("calf") ||
      lower.includes("calves") ||
      lower.includes("glute") ||
      lower.includes("hamstring") ||
      lower.includes("quad")
    ) {
      return "legs"
    }
    if (
      lower.includes("push") ||
      lower.includes("bench") ||
      lower.includes("press") ||
      lower.includes("dip") ||
      lower.includes("tricep")
    ) {
      return "push"
    }
    if (
      lower.includes("pull") ||
      lower.includes("row") ||
      lower.includes("chin") ||
      lower.includes("lat") ||
      lower.includes("curl") ||
      lower.includes("bicep") ||
      lower.includes("shrug") ||
      lower.includes("hang")
    ) {
      return "pull"
    }
    if (
      lower.includes("plank") ||
      lower.includes("crunch") ||
      lower.includes("ab") ||
      lower.includes("sit") ||
      lower.includes("twist")
    ) {
      return "core"
    }
    return "skill"
  }

  // Generate intelligent, non-redundant athletic milestones
  const allMilestones = useMemo(() => {
    const events: MilestoneItem[] = []

    // Group workouts by exercise name
    const exerciseWorkoutsMap = new Map<string, Workout[]>()
    workouts.forEach((w) => {
      const name = (w.exerciseName || w.name || "Workout").trim()
      if (!exerciseWorkoutsMap.has(name)) {
        exerciseWorkoutsMap.set(name, [])
      }
      exerciseWorkoutsMap.get(name)!.push(w)
    })

    // 1. Process Personal Records & Meaningful Benchmarks per exercise
    exerciseWorkoutsMap.forEach((wList, exName) => {
      // Sort chronologically
      const sorted = [...wList].sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      let bestReps = 0
      let bestTime = 0
      let bestWeight = 0

      sorted.forEach((w, index) => {
        const isTimer = Boolean(w.timeSeconds && w.timeSeconds > 0)
        const currentReps = w.reps || 0
        const currentTime = w.timeSeconds || 0
        const currentWeight = w.weight || 0
        const category = getExerciseCategory(exName)

        if (isTimer) {
          if (currentTime > bestTime) {
            const isFirst = bestTime === 0
            const delta = currentTime - bestTime
            bestTime = currentTime

            // If first time: only count as milestone if held for at least 15s
            if (isFirst) {
              if (currentTime >= 15) {
                events.push({
                  id: `first-${exName}-${w.date}-${index}`,
                  date: w.date,
                  title: `${exName} Benchmark`,
                  exerciseName: exName,
                  category,
                  type: "benchmark",
                  tier: currentTime >= 60 ? "gold" : "bronze",
                  metricValue: formatTime(currentTime),
                  improvementText: "First Benchmark Logged",
                })
              }
            } else {
              // PR Improvement
              const tier: MilestoneTier = currentTime >= 90 ? "diamond" : currentTime >= 45 ? "gold" : "silver"
              events.push({
                id: `pr-${exName}-${w.date}-${index}`,
                date: w.date,
                title: `${exName} PR`,
                exerciseName: exName,
                category,
                type: "pr",
                tier,
                metricValue: formatTime(currentTime),
                improvementText: `+${formatTime(delta)} hold improvement`,
              })
            }
          }
        } else {
          // Reps / Weighted progression
          if (currentReps > bestReps || currentWeight > bestWeight) {
            const isFirst = bestReps === 0 && bestWeight === 0
            const repDelta = currentReps - bestReps
            const weightDelta = currentWeight - bestWeight

            bestReps = Math.max(bestReps, currentReps)
            bestWeight = Math.max(bestWeight, currentWeight)

            // Only record as milestone if it meets real benchmark criteria (e.g. >= 5 reps or weighted)
            if (isFirst) {
              if (currentReps >= 5 || currentWeight >= 15) {
                events.push({
                  id: `first-${exName}-${w.date}-${index}`,
                  date: w.date,
                  title: `${exName} Benchmark`,
                  exerciseName: exName,
                  category,
                  type: "benchmark",
                  tier: currentReps >= 20 ? "gold" : "bronze",
                  metricValue: currentWeight > 0 ? `${currentWeight} kg × ${currentReps}` : `${currentReps} reps`,
                  improvementText: "First Milestone Established",
                })
              }
            } else {
              // PR Improvement
              let tier: MilestoneTier = "silver"
              if (currentReps >= 25 || currentWeight >= 80) tier = "diamond"
              else if (currentReps >= 15 || currentWeight >= 40) tier = "gold"

              let impText = ""
              if (currentWeight > 0 && weightDelta > 0) {
                impText = `+${weightDelta} kg weight record`
              } else if (repDelta > 0) {
                impText = `+${repDelta} reps over record`
              } else {
                impText = "New Personal Best"
              }

              events.push({
                id: `pr-${exName}-${w.date}-${index}`,
                date: w.date,
                title: `${exName} PR`,
                exerciseName: exName,
                category,
                type: "pr",
                tier,
                metricValue: currentWeight > 0 ? `${currentWeight} kg × ${currentReps}` : `${currentReps} reps`,
                improvementText: impText,
              })
            }
          }
        }
      })
    })

    // 2. Process Cumulative Volume & Workout Count Milestones
    const sortedWorkouts = [...workouts].sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    let cumulativeReps = 0
    const repMilestonesReached = new Set<number>()

    sortedWorkouts.forEach((w) => {
      cumulativeReps += w.reps || 0
      const thresholds = [100, 250, 500, 1000, 2500, 5000]
      thresholds.forEach((th) => {
        if (cumulativeReps >= th && !repMilestonesReached.has(th)) {
          repMilestonesReached.add(th)
          events.push({
            id: `volume-${th}-${w.date}`,
            date: w.date,
            title: `${th}+ Total Reps Club`,
            exerciseName: "Volume Progression",
            category: "volume",
            type: "volume",
            tier: th >= 1000 ? "diamond" : th >= 500 ? "gold" : "silver",
            metricValue: `${th} Reps`,
            improvementText: "Cumulative Volume",
          })
        }
      })
    })

    // Workout Count Milestones
    const uniqueDates = Array.from(new Set(workouts.map((w) => w.date))).sort()
    const workoutCountThresholds = [5, 10, 25, 50, 100]
    workoutCountThresholds.forEach((th) => {
      if (uniqueDates.length >= th) {
        const unlockDate = uniqueDates[th - 1]
        events.push({
          id: `streak-count-${th}`,
          date: unlockDate,
          title: `${th} Sessions Completed`,
          exerciseName: "Consistency Club",
          category: "streak",
          type: "streak",
          tier: th >= 25 ? "gold" : "bronze",
          metricValue: `${th} Workouts`,
          improvementText: "Consistency Milestone",
        })
      }
    })

    // 3. Add Custom Milestones
    customMilestones.forEach((m) => {
      events.push({
        id: m.id,
        date: m.date,
        title: m.title,
        exerciseName: m.category.toUpperCase(),
        category: m.category,
        type: "custom",
        tier: "custom",
        metricValue: m.metric || "Goal Reached",
        improvementText: "Personal Goal",
        isCustom: true,
      })
    })

    // Sort by date descending (most recent first)
    return events.sort((a, b) => b.date.localeCompare(a.date))
  }, [workouts, customMilestones])

  // Filtered milestones based on active filter tab
  const filteredMilestones = useMemo(() => {
    if (activeFilter === "all") return allMilestones
    if (activeFilter === "pr") return allMilestones.filter((m) => m.type === "pr" || m.type === "benchmark")
    if (activeFilter === "volume") return allMilestones.filter((m) => m.type === "volume" || m.type === "streak")
    if (activeFilter === "custom") return allMilestones.filter((m) => m.type === "custom")
    return allMilestones
  }, [allMilestones, activeFilter])

  // Summary counts
  const summaryStats = useMemo(() => {
    const totalCount = allMilestones.length
    const prCount = allMilestones.filter((m) => m.type === "pr" || m.type === "benchmark").length
    const volumeCount = allMilestones.filter((m) => m.type === "volume" || m.type === "streak").length
    const customCount = allMilestones.filter((m) => m.type === "custom").length
    const latestPR = allMilestones.find((m) => m.type === "pr")

    return { totalCount, prCount, volumeCount, customCount, latestPR }
  }, [allMilestones])

  const handleAddMilestone = () => {
    if (!newMilestone.title.trim()) return

    soundManager.play("save", 0.4)
    const milestone: CustomMilestone = {
      id: `milestone-${Date.now()}`,
      date: newMilestone.date,
      title: newMilestone.title.trim(),
      metric: newMilestone.metric.trim() || undefined,
      category: newMilestone.category,
    }

    const updated = [milestone, ...customMilestones]
    setCustomMilestones(updated)
    localStorage.setItem("progression-milestones", JSON.stringify(updated))

    setNewMilestone({
      date: new Date().toISOString().slice(0, 10),
      title: "",
      metric: "",
      category: "legs",
    })
    setIsDialogOpen(false)
  }

  const handleDeleteCustom = (id: string) => {
    soundManager.play("click", 0.3)
    const updated = customMilestones.filter((m) => m.id !== id)
    setCustomMilestones(updated)
    localStorage.setItem("progression-milestones", JSON.stringify(updated))
  }

  // Clean, high-end monochrome styling & Evil Icons
  const getTierConfig = (tier: MilestoneTier, type: MilestoneItem["type"]) => {
    if (type === "benchmark") {
      return {
        badgeText: "BENCHMARK",
        badgeClass: "text-zinc-400 bg-white/[0.03] border-white/[0.06]",
        icon: <EvilChart className="w-5 h-5 fill-current text-zinc-400 group-hover:text-zinc-200 transition-colors" />,
      }
    }

    switch (tier) {
      case "diamond":
        return {
          badgeText: "LEGENDARY PR",
          badgeClass: "text-white bg-white/[0.12] border-white/[0.2] font-semibold",
          icon: <EvilStar className="w-5 h-5 fill-current text-zinc-100 group-hover:text-white transition-colors" />,
        }
      case "gold":
        return {
          badgeText: "GOLD RECORD",
          badgeClass: "text-zinc-100 bg-white/[0.09] border-white/[0.16] font-semibold",
          icon: <EvilTrophy className="w-5 h-5 fill-current text-zinc-200 group-hover:text-white transition-colors" />,
        }
      case "silver":
        return {
          badgeText: "NEW RECORD",
          badgeClass: "text-zinc-200 bg-white/[0.07] border-white/[0.14] font-medium",
          icon: <EvilTrophy className="w-5 h-5 fill-current text-zinc-300 group-hover:text-white transition-colors" />,
        }
      case "custom":
        return {
          badgeText: "CUSTOM GOAL",
          badgeClass: "text-zinc-300 bg-white/[0.05] border-white/[0.1]",
          icon: <EvilCheck className="w-5 h-5 fill-current text-zinc-300 group-hover:text-zinc-100 transition-colors" />,
        }
      case "bronze":
      default:
        if (type === "volume" || type === "streak") {
          return {
            badgeText: type === "streak" ? "STREAK" : "VOLUME",
            badgeClass: "text-zinc-300 bg-white/[0.06] border-white/[0.12]",
            icon: <EvilCheck className="w-5 h-5 fill-current text-zinc-300 group-hover:text-white transition-colors" />,
          }
        }
        return {
          badgeText: "MILESTONE",
          badgeClass: "text-zinc-400 bg-white/[0.04] border-white/[0.08]",
          icon: <EvilChart className="w-5 h-5 fill-current text-zinc-400 group-hover:text-zinc-200 transition-colors" />,
        }
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Banner & Minimal Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
        {/* Metric Summary Ribbon */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-xs">
            <EvilTrophy className="w-3.5 h-3.5 fill-current text-zinc-300 shrink-0" />
            <span className="font-semibold text-white">{summaryStats.totalCount}</span>
            <span className="text-zinc-400">Milestones Unlocked</span>
          </div>

          {summaryStats.latestPR && (
            <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
              <EvilStar className="w-3.5 h-3.5 fill-current text-zinc-300 shrink-0" />
              <span className="text-zinc-400">Latest PR:</span>
              <span className="font-semibold text-white truncate max-w-[150px]">
                {summaryStats.latestPR.exerciseName}
              </span>
              <span className="text-zinc-300 font-mono">({summaryStats.latestPR.metricValue})</span>
            </div>
          )}
        </div>

        {/* Action Controls: View Switcher & Add Milestone */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Layout Toggle: Grid vs Timeline */}
          <div className="flex items-center gap-1 bg-[#101014] p-1 rounded-xl border border-white/[0.08]">
            <button
              onClick={() => {
                soundManager.play("click", 0.25)
                setViewLayout("grid")
              }}
              title="Cards Grid View"
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewLayout === "grid"
                  ? "bg-white text-zinc-950 shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                soundManager.play("click", 0.25)
                setViewLayout("timeline")
              }}
              title="Vertical Timeline View"
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewLayout === "timeline"
                  ? "bg-white text-zinc-950 shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Add Milestone Dialog Button */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => soundManager.play("click", 0.3)}
                className="rounded-xl border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-100 hover:text-white transition-all text-xs font-medium h-8 px-3 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <EvilPlus className="w-3.5 h-3.5 fill-current" />
                Add Milestone
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-white/[0.1] bg-[#101014] shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <EvilTrophy className="w-5 h-5 fill-current text-white" />
                  Add Custom Milestone
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  Record a major personal achievement, calisthenics skill unlock, or fitness goal.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3.5 mt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="milestone-title" className="text-xs text-zinc-300">Milestone Title</Label>
                  <Input
                    id="milestone-title"
                    placeholder="e.g., 20 Clean Pull-ups or First Pistol Squat"
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    className="rounded-xl text-xs bg-white/[0.04] border-white/[0.1] text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="milestone-metric" className="text-xs text-zinc-300">Metric / Result (Optional)</Label>
                    <Input
                      id="milestone-metric"
                      placeholder="e.g., 20 Reps or 60s"
                      value={newMilestone.metric}
                      onChange={(e) => setNewMilestone({ ...newMilestone, metric: e.target.value })}
                      className="rounded-xl text-xs bg-white/[0.04] border-white/[0.1] text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="category" className="text-xs text-zinc-300">Category</Label>
                    <Select
                      value={newMilestone.category}
                      onValueChange={(val: any) => setNewMilestone({ ...newMilestone, category: val })}
                    >
                      <SelectTrigger id="category" className="rounded-xl text-xs bg-white/[0.04] border-white/[0.1] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-[#141418] border-white/[0.1] text-white">
                        <SelectItem value="legs">Legs</SelectItem>
                        <SelectItem value="push">Push</SelectItem>
                        <SelectItem value="pull">Pull</SelectItem>
                        <SelectItem value="core">Core</SelectItem>
                        <SelectItem value="skill">Skill / Mobility</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="milestone-date" className="text-xs text-zinc-300">Date Achieved</Label>
                  <Input
                    id="milestone-date"
                    type="date"
                    value={newMilestone.date}
                    onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                    className="rounded-xl text-xs bg-white/[0.04] border-white/[0.1] text-white"
                  />
                </div>
                <Button onClick={handleAddMilestone} className="w-full rounded-xl font-semibold mt-2 text-xs bg-white text-zinc-950 hover:bg-zinc-200">
                  Save Milestone
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Modern Segmented Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => {
            soundManager.play("click", 0.2)
            setActiveFilter("all")
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center ${
            activeFilter === "all"
              ? "bg-white text-zinc-950 font-semibold shadow-xs"
              : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
          }`}
        >
          All
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ml-1.5 ${
            activeFilter === "all" ? "bg-zinc-200 text-zinc-950 font-bold" : "bg-zinc-800 text-zinc-400"
          }`}>
            {summaryStats.totalCount}
          </span>
        </button>
        <button
          onClick={() => {
            soundManager.play("click", 0.2)
            setActiveFilter("pr")
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center ${
            activeFilter === "pr"
              ? "bg-white text-zinc-950 font-semibold shadow-xs"
              : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
          }`}
        >
          PR Records
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ml-1.5 ${
            activeFilter === "pr" ? "bg-zinc-200 text-zinc-950 font-bold" : "bg-zinc-800 text-zinc-400"
          }`}>
            {summaryStats.prCount}
          </span>
        </button>
        <button
          onClick={() => {
            soundManager.play("click", 0.2)
            setActiveFilter("volume")
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center ${
            activeFilter === "volume"
              ? "bg-white text-zinc-950 font-semibold shadow-xs"
              : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
          }`}
        >
          Volume & Consistency
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ml-1.5 ${
            activeFilter === "volume" ? "bg-zinc-200 text-zinc-950 font-bold" : "bg-zinc-800 text-zinc-400"
          }`}>
            {summaryStats.volumeCount}
          </span>
        </button>
        {summaryStats.customCount > 0 && (
          <button
            onClick={() => {
              soundManager.play("click", 0.2)
              setActiveFilter("custom")
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center ${
              activeFilter === "custom"
                ? "bg-white text-zinc-950 font-semibold shadow-xs"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            Custom Goals
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ml-1.5 ${
              activeFilter === "custom" ? "bg-zinc-200 text-zinc-950 font-bold" : "bg-zinc-800 text-zinc-400"
            }`}>
              {summaryStats.customCount}
            </span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredMilestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] p-6">
          <div className="h-12 w-12 rounded-2xl bg-white/[0.05] border border-white/[0.1] text-zinc-300 flex items-center justify-center">
            <EvilTrophy className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">No Milestones in this category</h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">
              Log higher sets and progressive reps in your workouts, or create your first milestone goal.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="rounded-xl mt-2 text-xs border-white/[0.12] bg-white/[0.05] text-zinc-200 hover:text-white"
          >
            <EvilPlus className="w-3.5 h-3.5 fill-current mr-1" />
            Add First Milestone
          </Button>
        </div>
      ) : viewLayout === "grid" ? (
        /* High-Definition 2-Column Monochrome Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <AnimatePresence mode="popLayout">
            {filteredMilestones.map((milestone, idx) => {
              const tierConfig = getTierConfig(milestone.tier, milestone.type)

              return (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className="rounded-2xl border border-white/[0.07] bg-[#0e0e11] hover:bg-[#131317] hover:border-white/[0.15] p-4 sm:p-4.5 transition-all duration-200 relative group shadow-sm"
                >
                  {/* Card Header: Category Tag + Tier Pill + Date */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 bg-white/[0.04] border border-white/[0.07]">
                        {milestone.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${tierConfig.badgeClass}`}>
                        {tierConfig.badgeText}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                      <EvilCalendar className="w-3.5 h-3.5 fill-current text-zinc-500 shrink-0" />
                      <span>
                        {new Date(milestone.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Main Card Content */}
                  <div className="flex items-start gap-3.5">
                    {/* Minimalist Icon Squircle with Evil Icons */}
                    <div className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center shrink-0 group-hover:bg-white/[0.07] group-hover:border-white/[0.14] transition-all">
                      {tierConfig.icon}
                    </div>

                    {/* Milestone Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base font-semibold text-zinc-100 group-hover:text-white tracking-tight truncate transition-colors">
                        {milestone.title}
                      </h4>

                      <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
                        <span className="text-lg sm:text-xl font-bold text-white tracking-tight">
                          {milestone.metricValue}
                        </span>

                        {milestone.improvementText && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-300 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
                            <EvilArrowUp className="w-3 h-3 fill-current text-zinc-400 shrink-0" />
                            {milestone.improvementText}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete button for custom milestones */}
                    {milestone.isCustom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCustom(milestone.id)
                        }}
                        title="Delete Milestone"
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                      >
                        <EvilTrash className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* Minimalist Chronological Timeline View */
        <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-white/[0.08]">
          <AnimatePresence mode="popLayout">
            {filteredMilestones.map((milestone, idx) => {
              const tierConfig = getTierConfig(milestone.tier, milestone.type)

              return (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className="relative group"
                >
                  {/* Minimalist Timeline Node */}
                  <div className="absolute -left-[30px] top-4 h-6 w-6 rounded-full border border-white/[0.12] bg-[#0e0e11] flex items-center justify-center shadow-xs transition-transform group-hover:scale-110">
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                  </div>

                  {/* Card Content */}
                  <div className="rounded-2xl border border-white/[0.07] bg-[#0e0e11] hover:bg-[#131317] hover:border-white/[0.15] p-4 transition-all duration-200">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 bg-white/[0.04] border border-white/[0.07]">
                          {milestone.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${tierConfig.badgeClass}`}>
                          {tierConfig.badgeText}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 font-medium">
                        {new Date(milestone.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-100">{milestone.title}</h4>
                        {milestone.improvementText && (
                          <span className="text-xs text-zinc-400 block mt-0.5">
                            {milestone.improvementText}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-bold text-white tracking-tight">{milestone.metricValue}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}