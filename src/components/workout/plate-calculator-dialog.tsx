"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Calculator, Dumbbell, Minus, Plus } from "lucide-react"

type PlateCalculatorProps = {
  open: boolean
  onClose: () => void
  initialWeight?: number
}

const AVAILABLE_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]
const PLATE_COLORS: Record<number, string> = {
  25: "bg-red-600 text-white border-red-700",
  20: "bg-blue-600 text-white border-blue-700",
  15: "bg-yellow-500 text-black border-yellow-600",
  10: "bg-emerald-600 text-white border-emerald-700",
  5: "bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700",
  2.5: "bg-zinc-700 text-white border-zinc-800",
  1.25: "bg-zinc-500 text-white border-zinc-600",
}

export default function PlateCalculatorDialog({ open, onClose, initialWeight = 60 }: PlateCalculatorProps) {
  const [targetWeight, setTargetWeight] = useState<number>(initialWeight || 60)
  const [barWeight, setBarWeight] = useState<number>(20) // 20kg standard Olympic bar

  const { platesPerSide, actualWeight, difference } = useMemo(() => {
    const weightToLoad = Math.max(0, targetWeight - barWeight)
    const weightPerSide = weightToLoad / 2

    let remaining = weightPerSide
    const plates: number[] = []

    for (const plate of AVAILABLE_PLATES) {
      while (remaining >= plate - 0.01) {
        plates.push(plate)
        remaining = Math.round((remaining - plate) * 100) / 100
      }
    }

    const calculatedTotal = barWeight + plates.reduce((sum, p) => sum + p * 2, 0)

    return {
      platesPerSide: plates,
      actualWeight: calculatedTotal,
      difference: Math.round((targetWeight - calculatedTotal) * 100) / 100,
    }
  }, [targetWeight, barWeight])

  const adjustWeight = (amount: number) => {
    setTargetWeight((prev) => Math.max(barWeight, Math.round((prev + amount) * 10) / 10))
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md rounded-2xl border-border bg-card p-6">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Calculator className="h-5 w-5 text-primary" />
            <span>Barbell Plate Calculator</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Calculate exactly which plates to load on each side of the bar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Target Weight Controls */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Target Weight
              </span>
              <div className="flex items-center gap-1">
                {[15, 20].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBarWeight(b)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      barWeight === b
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {b}kg Bar
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => adjustWeight(-5)}
                className="h-11 w-11 rounded-xl border border-border bg-card flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all cursor-pointer"
              >
                <Minus className="h-5 w-5" />
              </button>

              <div className="text-center flex-1">
                <input
                  type="number"
                  step="0.5"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(Math.max(0, Number(e.target.value) || 0))}
                  className="w-28 text-center text-3xl font-black bg-transparent border-b-2 border-primary/40 focus:border-primary focus:outline-none text-foreground font-mono"
                />
                <span className="text-xs font-semibold text-muted-foreground ml-1.5">kg</span>
              </div>

              <button
                onClick={() => adjustWeight(5)}
                className="h-11 w-11 rounded-xl border border-border bg-card flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Increment Chips */}
            <div className="flex items-center justify-center gap-1.5 pt-1 flex-wrap">
              {[-10, -2.5, +2.5, +10].map((inc) => (
                <button
                  key={inc}
                  onClick={() => adjustWeight(inc)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-card border border-border/80 hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  {inc > 0 ? `+${inc}` : inc} kg
                </button>
              ))}
            </div>
          </div>

          {/* Barbell Visual Display */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Each Side Loads:</span>
              <span className="text-foreground font-mono font-bold text-sm">
                {platesPerSide.reduce((s, p) => s + p, 0)} kg / side
              </span>
            </div>

            {/* Visual Barbell Graphic */}
            <div className="h-20 w-full bg-secondary/30 rounded-xl flex items-center justify-center px-4 relative overflow-hidden border border-border/50">
              {/* Bar line */}
              <div className="absolute h-2.5 w-full bg-zinc-400 dark:bg-zinc-600 rounded-full z-0" />
              
              {/* Center collar */}
              <div className="absolute h-8 w-2 bg-zinc-300 dark:bg-zinc-500 rounded-sm z-10" />

              {/* Plates stacked on side */}
              <div className="relative z-10 flex items-center gap-1">
                {platesPerSide.length === 0 ? (
                  <span className="text-xs text-muted-foreground font-medium z-10 bg-background/80 px-2 py-0.5 rounded">
                    Empty Bar ({barWeight} kg)
                  </span>
                ) : (
                  platesPerSide.map((p, idx) => (
                    <div
                      key={idx}
                      className={`h-14 min-w-[22px] px-1 rounded border flex flex-col items-center justify-center font-black text-[10px] shadow-md ${
                        PLATE_COLORS[p] || "bg-zinc-700 text-white"
                      }`}
                      style={{
                        height: `${Math.max(36, Math.min(68, 30 + p * 1.5))}px`,
                      }}
                      title={`${p} kg Plate`}
                    >
                      <span>{p}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Plate Breakdown Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {AVAILABLE_PLATES.map((p) => {
                const count = platesPerSide.filter((x) => x === p).length
                if (count === 0) return null
                return (
                  <span
                    key={p}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                      PLATE_COLORS[p] || "bg-secondary"
                    }`}
                  >
                    <span>{p} kg</span>
                    <span className="opacity-75">× {count}</span>
                  </span>
                )
              })}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
