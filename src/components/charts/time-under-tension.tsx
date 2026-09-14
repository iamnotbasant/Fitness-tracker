"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts"
import type { Workout } from "@/lib/types"

export function TimeUnderTension({ workouts }: { workouts: Workout[] }) {
  const data = useMemo(() => {
    const now = new Date()
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const currentMap = new Map<string, { totalTime: number; count: number }>()
    const lastMonthMap = new Map<string, { totalTime: number; count: number }>()

    workouts.forEach((w) => {
      if (!w.timeSeconds) return
      
      const workoutDate = new Date(w.date)
      const targetMap = workoutDate >= currentPeriodStart ? currentMap : 
                       (workoutDate >= lastMonthStart && workoutDate <= lastMonthEnd) ? lastMonthMap : null
      
      if (!targetMap) return
      
      const existing = targetMap.get(w.exerciseName) || { totalTime: 0, count: 0 }
      targetMap.set(w.exerciseName, {
        totalTime: existing.totalTime + w.timeSeconds * w.sets,
        count: existing.count + w.sets,
      })
    })

    const allExercises = new Set([...currentMap.keys(), ...lastMonthMap.keys()])
    
    return Array.from(allExercises)
      .map((name) => {
        const current = currentMap.get(name)
        const lastMonth = lastMonthMap.get(name)
        
        return {
          exercise: name.length > 15 ? name.slice(0, 15) + "..." : name,
          fullName: name,
          current: current ? Math.round(current.totalTime / current.count) : 0,
          lastMonth: lastMonth ? Math.round(lastMonth.totalTime / lastMonth.count) : 0,
          totalVolume: (current?.totalTime || 0) + (lastMonth?.totalTime || 0),
        }
      })
      .filter(d => d.current > 0 || d.lastMonth > 0)
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 7) // Top 7 exercises
  }, [workouts])

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No time-based exercises tracked yet
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#000000' }} />
          <span className="text-muted-foreground">This Month</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#6B6B6B' }} />
          <span className="text-muted-foreground">Last Month</span>
        </div>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="horizontal" margin={{ top: 8, right: 8, left: 80, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#4A4A4A" />
            <XAxis 
              type="number" 
              tickLine={false} 
              axisLine={false} 
              fontSize={12} 
              stroke="hsl(var(--muted-foreground))"
              label={{ value: "Avg TUT per Set (seconds)", position: "insideBottom", offset: -5, fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="exercise"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
              width={70}
            />
            <Tooltip
              cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              contentStyle={{
                backgroundColor: '#333333',
                border: '1px solid #4A4A4A',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                color: '#FFFFFF',
              }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null
                const data = payload[0].payload
                const change = data.current - data.lastMonth
                const changeSign = change > 0 ? '+' : ''
                
                return (
                  <div style={{
                    backgroundColor: '#333333',
                    border: '1px solid #4A4A4A',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    color: '#FFFFFF',
                  }}>
                    <p style={{ fontWeight: 600, marginBottom: '8px', color: '#FFFFFF' }}>
                      {data.fullName}
                    </p>
                    <p style={{ fontSize: '14px', marginBottom: '4px' }}>
                      <strong>This Month:</strong> {data.current}s
                    </p>
                    <p style={{ fontSize: '14px', marginBottom: '4px', color: '#B0B0B0' }}>
                      <strong>Last Month:</strong> {data.lastMonth}s
                    </p>
                    <p style={{ 
                      fontSize: '14px', 
                      fontWeight: 600,
                      color: change > 0 ? '#4CAF50' : change < 0 ? '#F44336' : '#B0B0B0'
                    }}>
                      <strong>Change:</strong> {changeSign}{change}s
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="lastMonth" fill="#6B6B6B" radius={[0, 4, 4, 0]} />
            <Bar dataKey="current" fill="#000000" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-muted-foreground text-center pt-2">
        Optimal TUT: 40-70 seconds per set for muscle hypertrophy
      </div>
    </div>
  )
}