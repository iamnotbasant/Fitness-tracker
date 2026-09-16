"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type React from "react"

type Item = {
  href: string
  label: string
  icon: React.ReactNode
}

export function SegmentedNav({
  items,
  className = "",
  minimal = true,
}: {
  items: Item[]
  className?: string
  minimal?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav
      aria-label="Top navigation"
      className={`flex items-center justify-center ${className}`}
    >
      <ul
        className={[
          "flex items-center gap-1 sm:gap-1.5 px-2 py-1.5",
          minimal
            ? "rounded-none border-0 bg-transparent shadow-none md:rounded-full md:border md:bg-muted/50 md:px-2 md:py-1.5 md:shadow-sm"
            : "rounded-full border border-border/70 bg-muted/40 backdrop-blur-md px-2 py-1.5 shadow-sm",
        ].join(" ")}
      >
        {items.map((it) => {
          const active = it.href === "/" 
            ? pathname === "/" 
            : (pathname === it.href || pathname.startsWith(`${it.href}/`))

          return (
            <li key={it.href}>
              <Link
                href={it.href}
                prefetch={true}
                className={[
                  "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150 cursor-pointer select-none",
                  active 
                    ? "bg-foreground text-background shadow-xs font-semibold" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                <span
                  aria-hidden
                  className="grid h-4 w-4 place-items-center shrink-0"
                >
                  {it.icon}
                </span>
                <span className="whitespace-nowrap">{it.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// Minimal line icons to match the reference vibe
export function FlameIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3s-2 3-2 5a4 4 0 1 0 8 0c0-3-3-5-3-5s1 3-1 4-2-2-2-4Z" />
      <path d="M16 13a4 4 0 1 1-8 0c0-1.5.8-2.6 1.5-3.4" />
    </svg>
  )
}
export function ScaleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <circle cx="12" cy="9" r="3" />
    </svg>
  )
}
export function DropletIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z" />
    </svg>
  )
}
export function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
    </svg>
  )
}
export function StepsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 20h4v-4H7v4Zm6-2h4v-6h-4v6ZM5 22h18" />
    </svg>
  )
}
export function DumbbellIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10h3v4H3zM6 11h3v2H6zM9 10h3v4H9zM12 11h3v2h-3zM15 10h3v4h-3zM18 11h3v2h-3z" />
    </svg>
  )
}