"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/workout", label: "Workout" },
  { href: "/exercises", label: "Exercises" },
  { href: "/progress", label: "Progress" },
  { href: "/profile", label: "Profile" },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <ul className="mx-auto flex max-w-xl items-center justify-between px-4 py-2">
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : (pathname === it.href || pathname.startsWith(`${it.href}/`))
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                    e.preventDefault()
                    router.push(it.href)
                  }
                }}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {it.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
