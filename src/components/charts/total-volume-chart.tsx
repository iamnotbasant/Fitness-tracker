"use client"

import { useMemo, useState } from "react"
import { BarChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts"
import type { Workout } from "@/lib/types"
import { Maximize2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

function getDateLabel(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

type FilterType = "weekly" | "monthly" | "yearly"

export function TotalVolumeChart({ workouts }: { workouts: Workout[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [expandedOpen, setExpandedOpen] = useState(false)
  const [expandedFilter, setExpandedFilter] = useState<FilterType>("monthly")

  // Use daily data instead of weekly for better visibility
  const data = useMemo(() => {
    const map = new Map<string, number>()
    workouts.forEach((w) => {
      const existing = map.get(w.date) || 0
      const points = w.points ?? w.total_points ?? 0
      map.set(w.date, existing + points)
    })
    
    // Get unique dates and sort them
    const sortedDates = Array.from(map.keys()).sort()
    
    // Take last 30 days of data
    const recentDates = sortedDates.slice(-30)
    
    return recentDates.map((date, index) => ({ 
      date: getDateLabel(date), 
      rawDate: date,
      points: map.get(date) || 0,
      index 
    }))
  }, [workouts])

  // Calculate linear regression trend line
  const dataWithTrend = useMemo(() => {
    if (data.length < 2) return data

    const n = data.length
    const sumX = data.reduce((sum, _, i) => sum + i, 0)
    const sumY = data.reduce((sum, d) => sum + d.points, 0)
    const sumXY = data.reduce((sum, d, i) => sum + i * d.points, 0)
    const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return data.map((item, i) => ({
      ...item,
      trend: Math.round(slope * i + intercept)
    }))
  }, [data])

  const avgPoints = useMemo(() => {
    if (data.length === 0) return 0
    return Math.round(data.reduce((sum, d) => sum + d.points, 0) / data.length)
  }, [data])

  // Filtered data for expanded modal
  const expandedData = useMemo(() => {
    const now = new Date()
    let filteredWorkouts = workouts

    if (expandedFilter === "weekly") {
      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(now.getDate() - 7)
      filteredWorkouts = workouts.filter(w => new Date(w.date) >= sevenDaysAgo)
    } else if (expandedFilter === "monthly") {
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(now.getDate() - 30)
      filteredWorkouts = workouts.filter(w => new Date(w.date) >= thirtyDaysAgo)
    } else if (expandedFilter === "yearly") {
      const oneYearAgo = new Date(now)
      oneYearAgo.setFullYear(now.getFullYear() - 1)
      filteredWorkouts = workouts.filter(w => new Date(w.date) >= oneYearAgo)
    }

    const map = new Map<string, number>()
    filteredWorkouts.forEach((w) => {
      const existing = map.get(w.date) || 0
      const points = w.points ?? w.total_points ?? 0
      map.set(w.date, existing + points)
    })
    
    const sortedDates = Array.from(map.keys()).sort()
    
    return sortedDates.map((date, index) => ({ 
      date: getDateLabel(date), 
      rawDate: date,
      points: map.get(date) || 0,
      index 
    }))
  }, [workouts, expandedFilter])

  const expandedDataWithTrend = useMemo(() => {
    if (expandedData.length < 2) return expandedData

    const n = expandedData.length
    const sumX = expandedData.reduce((sum, _, i) => sum + i, 0)
    const sumY = expandedData.reduce((sum, d) => sum + d.points, 0)
    const sumXY = expandedData.reduce((sum, d, i) => sum + i * d.points, 0)
    const sumX2 = expandedData.reduce((sum, _, i) => sum + i * i, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return expandedData.map((item, i) => ({
      ...item,
      trend: Math.round(slope * i + intercept)
    }))
  }, [expandedData])

  if (data.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-sm" style={{ color: '#7F8C8D' }}>
        No workout data available. Start tracking to see your progress!
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div 
          className="px-3 py-2" 
          style={{ 
            backgroundColor: '#333333', 
            borderRadius: '4px',
            color: 'white',
            fontSize: '12px'
          }}
        >
          <div className="font-semibold">{payload[0].payload.date}</div>
          <div>Points: {payload[0].value}</div>
        </div>
      )
    }
    return null
  }

  return (
    <>
      <div className="space-y-4 relative">
        {/* Legend and Expand Icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded" style={{ background: 'linear-gradient(to top, #000000, #4A4A4A)' }} />
              <span style={{ color: '#7F8C8D' }}>Points</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-6 border-t-2 border-dashed" style={{ borderColor: '#6B6B6B' }} />
              <span style={{ color: '#7F8C8D' }}>Trend</span>
            </div>
          </div>
          <button
            onClick={() => setExpandedOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Expand chart"
          >
            <Maximize2 className="h-4 w-4" style={{ color: '#7F8C8D' }} />
          </button>
        </div>

        {/* Chart */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={dataWithTrend} 
              margin={{ top: 8, right: 8, left: -20, bottom: 8 }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id="barGradient" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#000000" />
                  <stop offset="100%" stopColor="#4A4A4A" />
                </linearGradient>
                <linearGradient id="barGradientHover" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#1a1a1a" />
                  <stop offset="100%" stopColor="#5a5a5a" />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="#4A4A4A"
                strokeWidth={1}
              />
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={false} 
                fontSize={12}
                stroke="#7F8C8D"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                fontSize={12}
                stroke="#7F8C8D"
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar 
                dataKey="points" 
                radius={[4, 4, 0, 0]}
                onMouseEnter={(_, index) => setHoveredIndex(index)}
              >
                {dataWithTrend.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={hoveredIndex === index ? "url(#barGradientHover)" : "url(#barGradient)"}
                    opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.3}
                    style={{
                      transform: hoveredIndex === index ? 'scale(1.02)' : 'scale(1)',
                      transformOrigin: 'bottom',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  />
                ))}
              </Bar>
              <Line 
                type="monotone" 
                dataKey="trend" 
                stroke="#6B6B6B"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expanded Modal */}
      <Dialog open={expandedOpen} onOpenChange={setExpandedOpen}>
        <DialogContent className="max-w-5xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">
              Total Workout Points
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 h-full">
            {/* Filter Tabs */}
            <Tabs value={expandedFilter} onValueChange={(v) => setExpandedFilter(v as FilterType)}>
              <TabsList>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Chart */}
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={expandedDataWithTrend} 
                  margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id="barGradientExpanded" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#000000" />
                      <stop offset="100%" stopColor="#4A4A4A" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    vertical={false} 
                    stroke="#4A4A4A"
                    strokeWidth={1}
                  />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false} 
                    fontSize={12}
                    stroke="#7F8C8D"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    fontSize={12}
                    stroke="#7F8C8D"
                  />
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                  <Bar 
                    dataKey="points" 
                    fill="url(#barGradientExpanded)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="trend" 
                    stroke="#6B6B6B"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}