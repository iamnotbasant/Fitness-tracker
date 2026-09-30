"use client"

import React, { useEffect } from "react"
import type { Workout, Exercise } from "@/lib/types"
import { ChevronLeft, HelpCircle, Share2, X } from "lucide-react"
import soundManager from "@/lib/sounds"
import { MuscleDistributionRadar } from "./muscle-distribution-radar"
import { toast } from "sonner"

interface MuscleDistributionModalProps {
  isOpen: boolean
  onClose: () => void
  workouts: Workout[]
  exercises?: Exercise[]
}

export function MuscleDistributionModal({
  isOpen,
  onClose,
  workouts,
  exercises = [],
}: MuscleDistributionModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleShare = async () => {
    soundManager.play("click", 0.2)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Muscle Distribution",
          text: "Check out my muscle distribution balance radar!",
        })
        toast.success("Shared successfully!")
        return
      } catch (err: any) {
        if (err?.name === "AbortError") return
      }
    }
    toast.success("Muscle distribution balance view active")
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex justify-center overflow-y-auto">
      <div className="w-full max-w-lg min-h-screen bg-black text-zinc-100 flex flex-col px-4 pt-3 pb-32 sm:px-6">
        {/* ─── Top Bar: Back, "Muscle distribution", ?, Share (Reference 03) ─── */}
        <div className="sticky top-0 z-40 -mx-4 px-4 py-3 bg-black/95 backdrop-blur-md border-b border-zinc-900 flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              onClose()
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <span className="text-base font-semibold text-white font-display">
            Muscle distribution
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                soundManager.play("click", 0.2)
                toast.info("6-zone radar shows balanced volume distribution across push, pull, legs and core.")
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
              aria-label="Info"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Radar Chart & 4 Stat Cards (Reference 03) ─── */}
        <div className="bg-black text-white space-y-4">
          <MuscleDistributionRadar
            workouts={workouts}
            exercises={exercises}
            className="border-none bg-transparent p-0 shadow-none"
          />
        </div>
      </div>
    </div>
  )
}
