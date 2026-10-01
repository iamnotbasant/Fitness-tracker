"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useTheme } from "next-themes"
import { SegmentedNav } from "@/components/nav-segmented"
import { AuthButton } from "@/components/auth-button"
import { Menu, X, Sun, Moon, WifiOff, Play, User, RefreshCw } from "lucide-react"
import { AnimatedFlame, AnimatedDumbbell, AnimatedActivity } from "@/components/ui/animated-icons"
import { useOfflineStatus } from "@/hooks/use-local-data"

import { cn } from "@/lib/utils"

export function AppNavigation() {
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineStatus()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu on Escape key or outside click
  useEffect(() => {
    if (!mobileMenuOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false)
      }
    }

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [mobileMenuOpen])
  
  const navItems = [
    { href: "/", label: "Dashboard", icon: <AnimatedFlame size={16} className="text-current" /> },
    { href: "/workout", label: "Workout", icon: <Play size={16} className="text-current" /> },
    { href: "/exercises", label: "Exercises", icon: <AnimatedDumbbell size={16} className="text-current" /> },
    { href: "/progress", label: "Progress", icon: <AnimatedActivity size={16} className="text-current" /> },
    { href: "/profile", label: "Profile", icon: <User size={16} className="text-current" /> },
  ]

  // Bottom nav excludes Profile (accessible via hamburger menu)
  const bottomNavItems = navItems.filter((it) => it.href !== "/profile")

  return (
    <>
      {/* Desktop Navigation */}
      <header ref={headerRef} className="sticky top-0 z-40 w-full bg-background/80 px-4 lg:px-8 py-3.5 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Title - Far Left */}
          <div className="flex items-center gap-2.5">
            <Link href="/" className="text-lg font-semibold tracking-tight whitespace-nowrap hover:opacity-90 transition-opacity">
              Fitness Tracker
            </Link>
            {mounted && (!isOnline ? (
              <button
                onClick={syncNow}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] font-semibold transition-all hover:bg-amber-500/20 cursor-pointer"
                title="Working offline. Click to sync."
              >
                <WifiOff className="h-3 w-3" />
                <span>Offline {pendingCount > 0 ? `(${pendingCount})` : ""}</span>
              </button>
            ) : pendingCount > 0 ? (
              <button
                onClick={syncNow}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/40 text-primary text-[11px] font-semibold transition-all hover:bg-primary/25 cursor-pointer"
                title="Pending offline workouts. Click to sync now."
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Syncing..." : `Sync (${pendingCount})`}</span>
              </button>
            ) : null)}
          </div>
          
          {/* Desktop Navigation - Center (Fits 5 tabs cleanly without overflow or scrollbars) */}
          <div className="hidden md:flex flex-1 justify-center max-w-xl mx-auto">
            <SegmentedNav items={navItems} minimal={false} />
          </div>
          
          {/* Right side: theme toggle + auth */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer min-w-9 min-h-9 flex items-center justify-center"
              aria-label="Toggle theme"
            >
              {!mounted ? (
                <div className="h-4 w-4" />
              ) : theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <AuthButton />
          </div>

          {/* Mobile right: theme toggle + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground cursor-pointer min-w-9 min-h-9 flex items-center justify-center"
              aria-label="Toggle theme"
            >
              {!mounted ? (
                <div className="h-5 w-5" />
              ) : theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-secondary rounded-lg cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pb-3 border-t pt-3">
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2">
                {navItems.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/60 text-xs font-medium hover:bg-secondary transition-colors"
                  >
                    {it.icon}
                    <span>{it.label}</span>
                  </Link>
                ))}
              </div>
              <div className="pt-2 border-t">
                <AuthButton />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation (5 core tabs) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-lg border-t border-border/80 px-1 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-lg">
        <div className="flex items-center justify-around">
          {bottomNavItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      </nav>
    </>
  )
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const pathname = usePathname()
  const active = href === "/" ? pathname === "/" : (pathname === href || pathname.startsWith(`${href}/`))
  
  return (
    <Link
      href={href}
      prefetch={true}
      className="group flex flex-col items-center justify-center min-h-[48px] py-1 flex-1 min-w-0 transition-colors cursor-pointer select-none"
    >
      <div
        className={cn(
          "w-12 h-7 rounded-full flex items-center justify-center transition-all duration-200",
          active
            ? "bg-zinc-900 text-white dark:bg-white/15 dark:text-white shadow-xs"
            : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white group-hover:bg-zinc-200/50 dark:group-hover:bg-white/5"
        )}
      >
        <div className="h-4 w-4 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
      <span
        className={cn(
          "mt-1 text-[10px] tracking-tight leading-none text-center select-none whitespace-nowrap transition-colors",
          active
            ? "font-semibold text-zinc-900 dark:text-white"
            : "font-medium text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200"
        )}
      >
        {label}
      </span>
    </Link>
  )
}