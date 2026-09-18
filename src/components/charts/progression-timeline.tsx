"use client"

import { useMemo, useState, useEffect } from "react"
import type { Workout } from "@/lib/types"
import {
  Trophy,
  Zap,
  Plus,
  Dumbbell,
  Target,
  Activity,
  Flame,
  ArrowUp,
  Award,
  Sparkles,
  Medal,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Trash2,
  LayoutGrid,
  ListFilter,
  Clock,
} from "lucide-react"
import { AnimatedFlame, AnimatedTrophy, AnimatedDumbbell } from "@/components/ui/animated-icons"
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
              // PR Improvement!
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
              // PR Improvement!
              let tier: MilestoneTier = "silver"
              if (currentReps >= 25 || currentWeight >= 80) tier = "diamond"
              else if (currentReps >= 15 || currentWeight >= 40) tier = "gold"

              let impText = ""
              if (currentWeight > 0 && weightDelta > 0) {
                impText = `+${weightDelta} kg weight personal record`
              } else if (repDelta > 0) {
                impText = `+${repDelta} reps over previous record`
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
            improvementText: "Cumulative Volume Milestone",
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
          title: `${th} Workout Sessions Completed`,
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
        improvementText: "Personal Achievement",
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

  // Tier styling helpers
  const getTierStyles = (tier: MilestoneTier, category: string) => {
    switch (tier) {
      case "diamond":
        return {
          cardBg: "bg-cyan-950/20 border-cyan-500/40 hover:border-cyan-400/80 shadow-cyan-950/20",
          iconBg: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
          tierBadge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
          tierName: "LEGENDARY PR",
          icon: <Sparkles className="h-4 w-4 text-cyan-400" />,
        }
      case "gold":
        return {
          cardBg: "bg-amber-950/20 border-amber-500/40 hover:border-amber-400/80 shadow-amber-950/20",
          iconBg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          tierBadge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          tierName: "GOLD RECORD",
          icon: <Trophy className="h-4 w-4 text-amber-400" />,
        }
      case "silver":
        return {
          cardBg: "bg-purple-950/20 border-purple-500/40 hover:border-purple-400/80 shadow-purple-950/20",
          iconBg: "bg-purple-500/15 text-purple-400 border-purple-500/30",
          tierBadge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
          tierName: "NEW RECORD",
          icon: <Medal className="h-4 w-4 text-purple-400" />,
        }
      case "custom":
        return {
          cardBg: "bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400/80 shadow-emerald-950/20",
          iconBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          tierBadge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
          tierName: "GOAL ACHIEVED",
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
        }
      case "bronze":
      default:
        return {
          cardBg: "bg-card/70 border-border/70 hover:border-primary/50 shadow-xs",
          iconBg: "bg-primary/10 text-primary border-primary/20",
          tierBadge: "bg-secondary text-muted-foreground border-border/50",
          tierName: "MILESTONE",
          icon: <Award className="h-4 w-4 text-primary" />,
        }
    }
  }

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "push":
        return "text-[#FE1E26] bg-[#FE1E26]/10 border-[#FE1E26]/25"
      case "pull":
        return "text-purple-400 bg-purple-500/10 border-purple-500/25"
      case "legs":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
      case "core":
        return "text-amber-400 bg-amber-500/10 border-amber-500/25"
      case "streak":
        return "text-orange-400 bg-orange-500/10 border-orange-500/25"
      case "volume":
        return "text-cyan-400 bg-cyan-500/10 border-cyan-500/25"
      default:
        return "text-muted-foreground bg-secondary/80 border-border/50"
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        {/* Metric Summary Ribbon */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/40 border border-border/60 text-xs">
            <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="font-bold text-foreground">{summaryStats.totalCount}</span>
            <span className="text-muted-foreground">Milestones Unlocked</span>
          </div>

          {summaryStats.latestPR && (
            <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/25 text-xs">
              <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-muted-foreground">Latest PR:</span>
              <span className="font-bold text-foreground truncate max-w-[150px]">
                {summaryStats.latestPR.exerciseName}
              </span>
              <span className="text-primary font-semibold">({summaryStats.latestPR.metricValue})</span>
            </div>
          )}
        </div>

        {/* Action Controls: View Switcher & Add Milestone */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Layout Toggle: Grid vs Timeline */}
          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border/60">
            <button
              onClick={() => {
                soundManager.play("click", 0.25)
                setViewLayout("grid")
              }}
              title="Cards Grid View"
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewLayout === "grid"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
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
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
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
                className="rounded-xl border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-all text-xs font-semibold h-8 cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Milestone
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-border/80 bg-card shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <AnimatedTrophy className="h-4.5 w-4.5 text-primary" />
                  Add Custom Milestone
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Record a major personal achievement, calisthenics skill unlock, or fitness goal.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3.5 mt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="milestone-title" className="text-xs">Milestone Title</Label>
                  <Input
                    id="milestone-title"
                    placeholder="e.g., 20 Clean Pull-ups or First Pistol Squat"
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="milestone-metric" className="text-xs">Metric / Result (Optional)</Label>
                    <Input
                      id="milestone-metric"
                      placeholder="e.g., 20 Reps or 60s"
                      value={newMilestone.metric}
                      onChange={(e) => setNewMilestone({ ...newMilestone, metric: e.target.value })}
                      className="rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="category" className="text-xs">Category</Label>
                    <Select
                      value={newMilestone.category}
                      onValueChange={(val: any) => setNewMilestone({ ...newMilestone, category: val })}
                    >
                      <SelectTrigger id="category" className="rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
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
                  <Label htmlFor="milestone-date" className="text-xs">Date Achieved</Label>
                  <Input
                    id="milestone-date"
                    type="date"
                    value={newMilestone.date}
                    onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
                <Button onClick={handleAddMilestone} className="w-full rounded-xl font-bold mt-2 text-xs">
                  Save Milestone
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => {
            soundManager.play("click", 0.2)
            setActiveFilter("all")
          }}
          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeFilter === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          All ({summaryStats.totalCount})
        </button>
        <button
          onClick={() => {
            soundManager.play("click", 0.2)
            setActiveFilter("pr")
          }}
          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeFilter === "pr"
              ? "bg-amber-500 text-amber-950 font-bold shadow-xs"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          PR Records ({summaryStats.prCount})
        </button>
        <button
          onClick={() => {
            soundManager.play("click", 0.2)
            setActiveFilter("volume")
          }}
          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeFilter === "volume"
              ? "bg-cyan-500 text-cyan-950 font-bold shadow-xs"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          Volume & Consistency ({summaryStats.volumeCount})
        </button>
        {summaryStats.customCount > 0 && (
          <button
            onClick={() => {
              soundManager.play("click", 0.2)
              setActiveFilter("custom")
            }}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === "custom"
                ? "bg-emerald-500 text-emerald-950 font-bold shadow-xs"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            Custom Goals ({summaryStats.customCount})
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredMilestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center rounded-2xl border border-dashed border-border/70 bg-secondary/10 p-6">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">No Milestones in this category</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Log higher sets and progressive reps in your workouts, or create your first milestone goal!
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="rounded-xl mt-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add First Milestone
          </Button>
        </div>
      ) : viewLayout === "grid" ? (
        /* Modern 2-Column Responsive Cards Grid (Zero wasted space) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <AnimatePresence mode="popLayout">
            {filteredMilestones.map((milestone, idx) => {
              const styles = getTierStyles(milestone.tier, milestone.category)
              const categoryColor = getCategoryColor(milestone.category)

              return (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  className={`rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg relative group ${styles.cardBg}`}
                >
                  {/* Card Header: Category Tag + Tier Pill + Date */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${categoryColor}`}>
                        {milestone.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${styles.tierBadge}`}>
                        {styles.tierName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3 opacity-60" />
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
                  <div className="flex items-start gap-3.5 mt-1">
                    {/* Glowing Tier Badge Icon */}
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs transition-transform group-hover:scale-105 ${styles.iconBg}`}>
                      {styles.icon}
                    </div>

                    {/* Milestone Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-black text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
                        {milestone.title}
                      </h4>

                      <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                        <span className="text-lg font-black text-foreground tracking-tight">
                          {milestone.metricValue}
                        </span>

                        {milestone.improvementText && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            <ArrowUp className="h-2.5 w-2.5" />
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
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* Polished Chronological Timeline View */
        <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
          <AnimatePresence mode="popLayout">
            {filteredMilestones.map((milestone, idx) => {
              const styles = getTierStyles(milestone.tier, milestone.category)
              const categoryColor = getCategoryColor(milestone.category)

              return (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  className="relative group"
                >
                  {/* Glowing Timeline Node */}
                  <div className={`absolute -left-[30px] top-4 h-6 w-6 rounded-full border-2 border-background flex items-center justify-center shadow-xs transition-transform group-hover:scale-125 ${styles.iconBg}`}>
                    <div className="h-2 w-2 rounded-full bg-current" />
                  </div>

                  {/* Card Content */}
                  <div className={`rounded-2xl border p-4 transition-all duration-200 hover:shadow-md ${styles.cardBg}`}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${categoryColor}`}>
                          {milestone.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${styles.tierBadge}`}>
                          {styles.tierName}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(milestone.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{milestone.title}</h4>
                        {milestone.improvementText && (
                          <span className="text-xs text-muted-foreground block mt-0.5">
                            {milestone.improvementText}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-foreground">{milestone.metricValue}</span>
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