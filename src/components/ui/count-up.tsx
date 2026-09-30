"use client"

import { useEffect, useState, useRef } from "react"
import { useReducedMotion } from "framer-motion"

interface CountUpProps {
  value: number
  duration?: number // ms, max 300ms
  formatter?: (val: number) => string
  className?: string
}

export function CountUp({
  value,
  duration = 280,
  formatter = (v) => v.toLocaleString(),
  className = "",
}: CountUpProps) {
  const prefersReduced = useReducedMotion()
  const [displayValue, setDisplayValue] = useState<number>(() => prefersReduced ? value : 0)
  const prevValueRef = useRef<number>(prefersReduced ? value : 0)

  useEffect(() => {
    if (prefersReduced) {
      setDisplayValue(value)
      prevValueRef.current = value
      return
    }

    const startVal = prevValueRef.current
    const targetVal = value
    const delta = targetVal - startVal

    if (delta === 0) {
      setDisplayValue(targetVal)
      return
    }

    const startTime = performance.now()
    let frameId: number

    const update = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startVal + delta * ease)
      setDisplayValue(current)

      if (progress < 1) {
        frameId = requestAnimationFrame(update)
      } else {
        setDisplayValue(targetVal)
        prevValueRef.current = targetVal
      }
    }

    frameId = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [value, duration, prefersReduced])

  return <span className={className}>{formatter(displayValue)}</span>
}
