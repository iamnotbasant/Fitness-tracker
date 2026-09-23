"use client"

import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-200">
      {/* Sleek top glowing loader line */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30 overflow-hidden">
        <div className="h-full w-1/3 bg-primary animate-[shimmer_1.5s_infinite_linear] rounded-full" />
      </div>

      <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-card/90 border border-border/60 shadow-lg">
        <div className="relative flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Loading...</p>
          <p className="text-xs text-muted-foreground mt-0.5">Please wait a moment</p>
        </div>
      </div>
    </div>
  )
}
