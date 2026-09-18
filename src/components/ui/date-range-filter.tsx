"use client"

import React, { useState, useId } from "react"
import { Calendar as CalendarIcon, ChevronDown, Check, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import soundManager from "@/lib/sounds"

export type PresetRange =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "all_time"
  | "custom"

export interface DateFilterValue {
  preset: PresetRange
  startDate?: string // YYYY-MM-DD
  endDate?: string   // YYYY-MM-DD
}

export const toLocalDateString = (d: Date): string => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const getPresetDates = (preset: PresetRange): { start: string; end: string } => {
  const now = new Date()

  switch (preset) {
    case "today": {
      const todayStr = toLocalDateString(now)
      return { start: todayStr, end: todayStr }
    }
    case "yesterday": {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      const yStr = toLocalDateString(y)
      return { start: yStr, end: yStr }
    }
    case "this_week": {
      const day = now.getDay()
      const diffToMonday = day === 0 ? -6 : 1 - day
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday)
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
      return { start: toLocalDateString(monday), end: toLocalDateString(sunday) }
    }
    case "last_week": {
      const day = now.getDay()
      const diffToMonday = day === 0 ? -6 : 1 - day
      const lastMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday - 7)
      const lastSunday = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() + 6)
      return { start: toLocalDateString(lastMonday), end: toLocalDateString(lastSunday) }
    }
    case "this_month": {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { start: toLocalDateString(firstDay), end: toLocalDateString(lastDay) }
    }
    case "last_month": {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start: toLocalDateString(firstDay), end: toLocalDateString(lastDay) }
    }
    case "this_year": {
      const firstDay = new Date(now.getFullYear(), 0, 1)
      const lastDay = new Date(now.getFullYear(), 11, 31)
      return { start: toLocalDateString(firstDay), end: toLocalDateString(lastDay) }
    }
    case "all_time":
    default:
      return { start: "", end: "" }
  }
}

const PRESET_OPTIONS: { id: PresetRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This Week" },
  { id: "last_week", label: "Last Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "this_year", label: "This Year" },
  { id: "all_time", label: "All Time" },
]

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateFilterValue
  onChange: (val: DateFilterValue) => void
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [customStart, setCustomStart] = useState(value.startDate || toLocalDateString(new Date()))
  const [customEnd, setCustomEnd] = useState(value.endDate || toLocalDateString(new Date()))

  const activeLabel =
    value.preset === "custom"
      ? "Custom"
      : PRESET_OPTIONS.find((p) => p.id === value.preset)?.label || "All Time"

  const handleSelectPreset = (preset: PresetRange) => {
    soundManager.play("click", 0.2)
    const dates = getPresetDates(preset)
    onChange({
      preset,
      startDate: dates.start || undefined,
      endDate: dates.end || undefined,
    })
    setDropdownOpen(false)
  }

  const handleApplyCustomRange = () => {
    if (!customStart || !customEnd) return
    soundManager.play("save", 0.3)
    const sorted = customStart <= customEnd ? { s: customStart, e: customEnd } : { s: customEnd, e: customStart }
    onChange({
      preset: "custom",
      startDate: sorted.s,
      endDate: sorted.e,
    })
    setPickerOpen(false)
  }

  const handleClearCustom = (e: React.MouseEvent) => {
    e.stopPropagation()
    soundManager.play("click", 0.2)
    onChange({
      preset: "all_time",
      startDate: undefined,
      endDate: undefined,
    })
  }

  const formatDisplayDate = (dStr?: string) => {
    if (!dStr) return ""
    try {
      const parts = dStr.split("-")
      const year = parts[0]
      const monthIndex = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const d = new Date(parseInt(year, 10), monthIndex, day)
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    } catch {
      return dStr
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 1. Preset Dropdown (Today, Yesterday, This Week, Last Week, etc.) */}
      <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-9 px-3.5 rounded-xl border border-white/[0.1] bg-[#101014] hover:bg-[#15151a] hover:border-white/[0.18] text-xs font-medium text-white flex items-center justify-between gap-2.5 transition-all shadow-xs cursor-pointer min-w-[125px]"
          >
            <span>{activeLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-44 p-1.5 rounded-xl border border-white/[0.1] bg-[#121216] shadow-2xl text-xs"
        >
          <div className="space-y-0.5">
            {PRESET_OPTIONS.map((opt) => {
              const isSelected = value.preset === opt.id

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectPreset(opt.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer text-xs ${
                    isSelected
                      ? "bg-cyan-500 text-white font-semibold shadow-xs"
                      : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                    <span className={isSelected ? "" : "pl-5.5"}>{opt.label}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* 2. Select Date Range Popover Button */}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`h-9 px-3 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
              value.preset === "custom" && value.startDate && value.endDate
                ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200"
                : "border-white/[0.1] bg-[#101014] hover:bg-[#15151a] hover:border-white/[0.18] text-zinc-300 hover:text-white"
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span>
              {value.preset === "custom" && value.startDate && value.endDate
                ? `${formatDisplayDate(value.startDate)} - ${formatDisplayDate(value.endDate)}`
                : "Select date range"}
            </span>
            {value.preset === "custom" && (
              <span
                onClick={handleClearCustom}
                title="Reset to All Time"
                className="ml-1 p-0.5 rounded-md hover:bg-white/20 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-80 p-4 rounded-2xl border border-white/[0.1] bg-[#121216] shadow-2xl text-xs space-y-3.5"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-cyan-400" />
              Custom Date Range
            </span>
            {value.preset === "custom" && (
              <button
                type="button"
                onClick={handleClearCustom}
                className="text-[11px] text-zinc-400 hover:text-white transition-colors"
              >
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400 font-medium">Start Date</Label>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 text-xs bg-white/[0.04] border-white/[0.1] text-white rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400 font-medium">End Date</Label>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 text-xs bg-white/[0.04] border-white/[0.1] text-white rounded-lg"
              />
            </div>
          </div>

          <div className="pt-1 flex items-center gap-2">
            <Button
              type="button"
              onClick={handleApplyCustomRange}
              className="flex-1 h-8 text-xs rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-semibold"
            >
              Apply Range
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPickerOpen(false)}
              className="h-8 text-xs rounded-xl border-white/[0.1] bg-white/[0.04] text-zinc-300 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
