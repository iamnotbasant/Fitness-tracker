"use client"

import { useMemo, useState, useEffect } from "react"
import type { Workout } from "@/lib/types"
import { Trophy, Zap, Plus, Dumbbell, Target, Activity, Flame, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type CustomMilestone = {
  id: string
  date: string
  title: string
  category: "push" | "pull" | "core" | "skill"
}

type MilestoneEvent = {
  date: string
  title: string
  exercise?: string
  type: "pr" | "volume" | "custom"
  category?: "push" | "pull" | "core" | "skill"
}

export function ProgressionTimeline({ workouts }: { workouts: Workout[] }) {
  const [customMilestones, setCustomMilestones] = useState<CustomMilestone[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newMilestone, setNewMilestone] = useState({
    date: new Date().toISOString().slice(0, 10),
    title: "",
    category: "push" as const,
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

  const allMilestones = useMemo(() => {
    const events: MilestoneEvent[] = []
    const formatTime = (sec: number) => {
      if (!sec) return "0s"
      if (sec >= 60) {
        const mins = Math.floor(sec / 60)
        const rem = sec % 60
        return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`
      }
      return `${sec}s`
    }

    const exerciseMaxMap = new Map<string, { maxReps: number; maxTime: number; date: string }>()

    // Sort workouts by date
    const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date))

    sorted.forEach((w) => {
      const exName = w.exerciseName || w.name || "Workout"
      const existing = exerciseMaxMap.get(exName) || { maxReps: 0, maxTime: 0, date: w.date }
      const isTimer = Boolean(w.timeSeconds && w.timeSeconds > 0)
      
      const currentVal = isTimer ? (w.timeSeconds || 0) : (w.reps || 0)
      const prevVal = isTimer ? existing.maxTime : existing.maxReps

      // Check for PR
      if (!exerciseMaxMap.has(exName) || currentVal > prevVal) {
        exerciseMaxMap.set(exName, {
          maxReps: isTimer ? existing.maxReps : Math.max(existing.maxReps, currentVal),
          maxTime: isTimer ? Math.max(existing.maxTime, currentVal) : existing.maxTime,
          date: w.date
        })
        
        // Determine category based on exercise name
        let category: "push" | "pull" | "core" | "skill" = "skill"
        const exerciseLower = exName.toLowerCase()
        if (exerciseLower.includes("push") || exerciseLower.includes("dip") || exerciseLower.includes("press")) {
          category = "push"
        } else if (exerciseLower.includes("pull") || exerciseLower.includes("row") || exerciseLower.includes("chin")) {
          category = "pull"
        } else if (exerciseLower.includes("plank") || exerciseLower.includes("crunch") || exerciseLower.includes("leg raise") || exerciseLower.includes("hang") || exerciseLower.includes("sit")) {
          category = "core"
        }
        
        const metricDisplay = isTimer ? formatTime(currentVal) : `${currentVal} reps`
        events.push({
          date: w.date,
          title: `Achieved ${metricDisplay} ${exName}`,
          exercise: exName,
          type: "pr",
          category,
        })
      }

      // Check for volume milestones (every 500 volume)
      if (w.volume && w.volume >= 500 && w.volume % 500 === 0) {
        events.push({
          date: w.date,
          title: `${w.volume} Total Volume`,
          exercise: w.exerciseName,
          type: "volume",
        })
      }
    })

    // Add custom milestones
    customMilestones.forEach((m) => {
      events.push({
        date: m.date,
        title: m.title,
        type: "custom",
        category: m.category,
      })
    })

    // Sort by date (most recent first) and limit to 15
    return events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15)
  }, [workouts, customMilestones])

  const handleAddMilestone = () => {
    if (!newMilestone.title.trim()) return

    const milestone: CustomMilestone = {
      id: `milestone-${Date.now()}`,
      date: newMilestone.date,
      title: newMilestone.title,
      category: newMilestone.category,
    }

    const updated = [...customMilestones, milestone]
    setCustomMilestones(updated)
    localStorage.setItem("progression-milestones", JSON.stringify(updated))

    // Reset form
    setNewMilestone({
      date: new Date().toISOString().slice(0, 10),
      title: "",
      category: "push",
    })
    setIsDialogOpen(false)
  }

  const getIcon = (milestone: MilestoneEvent) => {
    if (milestone.type === "pr") return <Trophy className="h-4 w-4" />
    if (milestone.type === "volume") return <Flame className="h-4 w-4" />
    if (milestone.category === "push") return <ArrowUp className="h-4 w-4" />
    if (milestone.category === "pull") return <Target className="h-4 w-4" />
    if (milestone.category === "core") return <Activity className="h-4 w-4" />
    if (milestone.category === "skill") return <Dumbbell className="h-4 w-4" />
    return <Activity className="h-4 w-4" />
  }

  const getIconBgColor = (milestone: MilestoneEvent) => {
    if (milestone.type === "pr") return "bg-[#4A90E2] text-white"
    if (milestone.type === "volume") return "bg-[#F39C12] text-white"
    if (milestone.category === "push") return "bg-[#E74C3C] text-white"
    if (milestone.category === "pull") return "bg-[#27AE60] text-white"
    if (milestone.category === "core") return "bg-[#8E44AD] text-white"
    if (milestone.category === "skill") return "bg-[#3498DB] text-white"
    return "bg-muted text-muted-foreground"
  }

  if (allMilestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <p className="text-sm" style={{ color: '#7F8C8D' }}>
          No milestones yet. Start training or add your achievements manually!
        </p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              style={{ color: '#4A90E2', borderColor: '#4A90E2' }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Milestone</DialogTitle>
              <DialogDescription>
                Track your calisthenics journey by recording skill-based achievements
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="milestone-date">Date</Label>
                <Input
                  id="milestone-date"
                  type="date"
                  value={newMilestone.date}
                  onChange={(e) =>
                    setNewMilestone({ ...newMilestone, date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="milestone-title">Achievement / Milestone</Label>
                <Input
                  id="milestone-title"
                  placeholder="e.g., Achieved 10 Diamond Push-ups"
                  value={newMilestone.title}
                  onChange={(e) =>
                    setNewMilestone({ ...newMilestone, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newMilestone.category}
                  onValueChange={(value: any) =>
                    setNewMilestone({ ...newMilestone, category: value })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="push">Push</SelectItem>
                    <SelectItem value="pull">Pull</SelectItem>
                    <SelectItem value="core">Core</SelectItem>
                    <SelectItem value="skill">Skill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddMilestone} className="w-full">
                Add Milestone
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              style={{ color: '#4A90E2', borderColor: '#4A90E2' }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Milestone</DialogTitle>
              <DialogDescription>
                Track your calisthenics journey by recording skill-based achievements
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="milestone-date">Date</Label>
                <Input
                  id="milestone-date"
                  type="date"
                  value={newMilestone.date}
                  onChange={(e) =>
                    setNewMilestone({ ...newMilestone, date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="milestone-title">Achievement / Milestone</Label>
                <Input
                  id="milestone-title"
                  placeholder="e.g., Achieved 10 Diamond Push-ups"
                  value={newMilestone.title}
                  onChange={(e) =>
                    setNewMilestone({ ...newMilestone, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newMilestone.category}
                  onValueChange={(value: any) =>
                    setNewMilestone({ ...newMilestone, category: value })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="push">Push</SelectItem>
                    <SelectItem value="pull">Pull</SelectItem>
                    <SelectItem value="core">Core</SelectItem>
                    <SelectItem value="skill">Skill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddMilestone} className="w-full">
                Add Milestone
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {allMilestones.map((milestone, idx) => (
          <div 
            key={idx} 
            className="flex gap-4 group cursor-pointer transition-all duration-200 hover:scale-[1.02]"
          >
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110 ${getIconBgColor(
                  milestone
                )}`}
              >
                {getIcon(milestone)}
              </div>
              {idx < allMilestones.length - 1 && (
                <div className="h-full w-0.5 flex-1 mt-2 bg-border" />
              )}
            </div>
            <div 
              className="flex-1 pb-4 rounded-lg px-4 py-3 -ml-2 transition-colors duration-200 group-hover:bg-muted/50"
            >
              <div className="font-bold text-base text-foreground">
                {milestone.title}
              </div>
              {milestone.exercise && (
                <div className="text-sm mt-0.5 text-muted-foreground">
                  {milestone.exercise}
                </div>
              )}
              <div className="mt-1 text-xs text-muted-foreground/80">
                {new Date(milestone.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}