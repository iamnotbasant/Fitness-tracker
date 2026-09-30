"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

interface DetailBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  badge?: string
  children: React.ReactNode
}

export function DetailBottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  children,
}: DetailBottomSheetProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  // Prevent background scroll while bottom sheet is open
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Dimmed backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-xs cursor-pointer"
            aria-hidden="true"
          />

          {/* Bottom Sheet Modal Container */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative z-10 w-full max-w-lg mx-auto bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5 sm:p-6 shadow-2xl max-h-[80vh] flex flex-col"
          >
            {/* Grab handle indicator */}
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-3.5 shrink-0" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-800 shrink-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white font-display truncate">
                    {title}
                  </h3>
                  {badge && (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 shrink-0">
                      {badge}
                    </span>
                  )}
                </div>
                {subtitle && (
                  <p className="text-xs text-zinc-400 font-body mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Close Button (min 44px tap target) */}
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="Close detail view"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content area: ONLY essentials, scrollable if needed */}
            <div className="overflow-y-auto pt-3.5 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
