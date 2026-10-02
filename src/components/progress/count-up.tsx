"use client"

import React, { useEffect, useState, useRef } from "react"
import { useReducedMotion } from "framer-motion"

interface CountUpProps {
  value: number
  duration?: number
  formatter?: (val: number) => string
  className?: string
  resetKey?: string | number
}

export function CountUp({
  value,
  duration = 0.8,
  formatter,
  className = "",
  resetKey,
}: CountUpProps) {
  const prefersReduced = useReducedMotion()
  const [displayValue, setDisplayValue] = useState<number>(() => (prefersReduced ? value : 0))
  const isFirstMount = useRef(true)

  useEffect(() => {
    if (prefersReduced) {
      setDisplayValue(value)
      return
    }

    let startTime: number | null = null
    let animationFrameId: number
    const startVal = 0
    const endVal = value
    const durationMs = duration * 1000

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / durationMs, 1)

      // Ease out cubic: 1 - (1 - t)^3
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startVal + (endVal - startVal) * easeOut)
      setDisplayValue(current)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      }
    }

    animationFrameId = requestAnimationFrame(step)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [value, duration, prefersReduced, resetKey])

  const formatted = formatter ? formatter(displayValue) : displayValue.toLocaleString()

  return <span className={className}>{formatted}</span>
}
