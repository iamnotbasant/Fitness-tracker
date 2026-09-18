"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useTheme } from "next-themes"
import { SegmentedNav } from "@/components/nav-segmented"
import { AuthButton } from "@/components/auth-button"
import { Menu, Sun, Moon, WifiOff, Play, User } from "lucide-react"
import { AnimatedFlame, AnimatedDumbbell, AnimatedActivity } from "@/components/ui/animated-icons"
import { useOfflineStatus } from "@/hooks/use-local-data"

export function AppNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { isOnline, pendingCount, syncNow } = useOfflineStatus()
  
  const navItems = [
    { href: "/", label: "Dashboard", icon: <AnimatedFlame size={16} className="text-current" /> },
    { href: "/workout", label: "Workout", icon: <Play size={16} className="text-current" /> },
    { href: "/exercises", label: "Exercises", icon: <AnimatedDumbbell size={16} className="text-current" /> },
    { href: "/progress", label: "Progress", icon: <AnimatedActivity size={16} className="text-current" /> },
    { href: "/profile", label: "Profile", icon: <User size={16} className="text-current" /> },
  ]

  return (
    <>
      {/* Desktop Navigation */}
      <header className="sticky top-0 z-40 w-full bg-background/80 px-4 lg:px-8 py-3.5 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Title - Far Left */}
          <div className="flex items-center gap-2.5">
            <Link href="/" className="text-lg font-semibold tracking-tight whitespace-nowrap hover:opacity-90 transition-opacity">
              Fitness Tracker
            </Link>
            {!isOnline && (
              <button
                onClick={syncNow}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] font-semibold transition-all hover:bg-amber-500/20 cursor-pointer"
                title="Working offline. Click to sync."
              >
                <WifiOff className="h-3 w-3" />
                <span>Offline {pendingCount > 0 ? `(${pendingCount})` : ""}</span>
              </button>
            )}
          </div>
          
          {/* Desktop Navigation - Center (Fits 5 tabs cleanly without overflow or scrollbars) */}
          <div className="hidden md:flex flex-1 justify-center max-w-xl mx-auto">
            <SegmentedNav items={navItems} minimal={false} />
          </div>
          
          {/* Right side: theme toggle + auth */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
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
              className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
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
              <Menu className="h-5 w-5" />
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t px-2 py-1.5 shadow-lg">
        <div className="flex items-center justify-around gap-1">
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      </nav>
    </>
  )
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const active = href === "/" ? pathname === "/" : (pathname === href || pathname.startsWith(`${href}/`))
  
  return (
    <Link
      href={href}
      prefetch={true}
      className={`flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-xl transition-all min-w-0 flex-1 cursor-pointer select-none ${
        active 
          ? "text-white font-semibold bg-white/10 shadow-xs" 
          : "text-zinc-400 hover:text-white"
      }`}
    >
      <div className={`h-4 w-4 flex items-center justify-center shrink-0 ${active ? "text-white" : "text-white/80"}`}>{icon}</div>
      <span className="text-[11px] font-medium truncate w-full text-center leading-none">{label}</span>
    </Link>
  )
}