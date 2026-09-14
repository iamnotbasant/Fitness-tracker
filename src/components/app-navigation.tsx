"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useTheme } from "next-themes"
import { SegmentedNav } from "@/components/nav-segmented"
import { AuthButton } from "@/components/auth-button"
import { Flame, Dumbbell, TrendingUp, Download, Menu, Sun, Moon } from "lucide-react"

export function AppNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  
  const navItems = [
    { href: "/", label: "Dashboard", icon: <Flame className="h-4 w-4" /> },
    { href: "/exercises", label: "Exercises", icon: <Dumbbell className="h-4 w-4" /> },
    { href: "/progress", label: "Progress", icon: <TrendingUp className="h-4 w-4" /> },
    { href: "/export", label: "Export", icon: <Download className="h-4 w-4" /> },
  ]

  return (
    <>
      {/* Desktop Navigation */}
      <header className="sticky top-0 z-40 w-full bg-background/80 px-4 lg:px-8 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Title - Far Left */}
          <h1 className="text-lg font-semibold whitespace-nowrap">Fitness Tracker</h1>
          
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