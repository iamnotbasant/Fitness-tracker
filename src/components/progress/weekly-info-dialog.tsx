"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import soundManager from "@/lib/sounds"

interface WeeklyInfoDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function WeeklyInfoDialog({ isOpen, onClose }: WeeklyInfoDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        soundManager.play("click", 0.2)
        onClose()
      }
    }}>
      <DialogContent className="max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-5 sm:p-6 shadow-2xl">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-base sm:text-lg font-bold text-white font-display">
            Weekly Muscle Map Guide
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 font-body">
            How weekly workout sets are visualized on the anatomical map
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-3 pb-1 font-body text-xs">
          {/* Primary Muscles */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900 border border-zinc-800/80">
            <div className="w-3.5 h-3.5 rounded-full bg-white shrink-0 mt-0.5 shadow-sm" />
            <div className="space-y-0.5">
              <span className="font-semibold text-white block">Primary Muscles</span>
              <p className="text-zinc-300 leading-relaxed">
                Bright white: primary muscles trained — brighter = more sets
              </p>
            </div>
          </div>

          {/* Secondary Muscles */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900 border border-zinc-800/80">
            <div className="w-3.5 h-3.5 rounded-full bg-zinc-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-white block">Secondary Muscles</span>
              <p className="text-zinc-300 leading-relaxed">
                Dim grey: secondary muscles worked
              </p>
            </div>
          </div>

          {/* Volume Brightness Scale */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900 border border-zinc-800/80">
            <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-zinc-500 to-white shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-white block">Brightness Scale</span>
              <p className="text-zinc-300 leading-relaxed">
                Brightness: brighter color = more sets for that muscle vs others
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              onClose()
            }}
            className="w-full h-11 min-h-[44px] rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 active:scale-98 transition-all cursor-pointer shadow-xs"
          >
            Got it
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
