"use client"

import React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface TabItem {
  id: string
  label: React.ReactNode
  icon?: React.ReactNode
}

interface AnimatedTabsProps {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
  layoutId?: string
  className?: string
  tabClassName?: string
  size?: "sm" | "default"
}

export function AnimatedTabs({
  items,
  activeId,
  onChange,
  layoutId = "active-tab-indicator",
  className = "",
  tabClassName = "",
  size = "default",
}: AnimatedTabsProps) {
  const prefersReduced = useReducedMotion()

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center rounded-full border border-border/80 bg-muted/60 p-1 backdrop-blur-xs select-none",
        className
      )}
    >
      {items.map((item) => {
        const isActive = activeId === item.id

        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors cursor-pointer whitespace-nowrap active:scale-[0.97]",
              size === "sm"
                ? "px-3 py-1 text-xs"
                : "px-3.5 py-1.5 text-xs sm:text-sm",
              isActive
                ? "text-background dark:text-zinc-950 font-bold"
                : "text-muted-foreground hover:text-foreground",
              tabClassName
            )}
          >
            {isActive && !prefersReduced ? (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 z-[-1] rounded-full bg-foreground shadow-xs"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            ) : isActive && prefersReduced ? (
              <div className="absolute inset-0 z-[-1] rounded-full bg-foreground shadow-xs" />
            ) : null}

            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
