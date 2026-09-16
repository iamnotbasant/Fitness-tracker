"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useTheme } from "next-themes"
import { SegmentedNav } from "@/components/nav-segmented"
import { AuthButton } from "@/components/auth-button"
import { Download, Menu, Sun, Moon, WifiOff, Play, User } from "lucide-react"
import { AnimatedFlame, AnimatedDumbbell, AnimatedActivity } from "@/components/ui/animated-icons"
import { useOfflineStatus } from "@/hooks/use-local-data"

export function AppNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { isOnline, pendingCount, syncNow } = useOfflineStatus()
  
  const navItems = [
    { href: "/", label: "Dashboard", icon: <AnimatedFlame size={16} className="text-amber-500" /> },
    { href: "/workout", label: "Workout", icon: <Play size={16} className="text-emerald-500" /> },
    { href: "/exercises", label: "Exercises", icon: <AnimatedDumbbell size={16} className="text-primary" /> },
    { href: "/progress", label: "Progress", icon: <AnimatedActivity size={16} className="text-rose-500" /> },
    { href: "/profile", label: "Profile", icon: <User size={16} className="text-sky-500" /> },
    { href: "/export", label: "Export", icon: <Download className="h-4 w-4" /> },
  ]

  return (
    <>
      {/* Desktop Navigation */}
      <header className="sticky top-0 z-40 w-full bg-background/80 px-4 lg:px-8 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Title - Far Left */}
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold whitespace-nowrap">Fitness Tracker</h1>
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
          
          {/* Desktop Navigation - Center */}
          <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-auto">
            <SegmentedNav items={navItems} minimal={false} />
          </div>
          
          {/* Right side: theme toggle + auth */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
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
              className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground"
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
              className="p-2 hover:bg-secondary rounded-lg"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t pt-4">
            <div className="flex flex-col gap-3">
              <AuthButton />
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t px-1 py-1.5">
        <div className="flex items-center justify-around gap-0.5">
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
  const active = pathname === href
  
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg transition-colors min-w-0 flex-1 ${
        active ? "text-primary font-semibold bg-secondary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <div className="h-4 w-4 flex items-center justify-center">{icon}</div>
      <span className="text-[10px] sm:text-xs font-medium truncate w-full text-center">{label}</span>
    </Link>
  )
}