"use client"

import { useSession, authClient } from "@/lib/auth-client"
import { User, Shield, LogOut, UserPlus, LogIn } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"

export function AuthButton() {
  const { data: session, isPending, refetch } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect to login if not authenticated and not already on /login
  useEffect(() => {
    if (mounted && !isPending && !session?.user) {
      if (pathname !== "/login") {
        router.push("/login")
      }
    }
  }, [mounted, isPending, session, router, pathname])

  // Show loading state until mounted
  if (!mounted || isPending) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
        <div className="h-4 w-4 animate-pulse rounded-full bg-muted-foreground/20" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 px-3 py-1.5 text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer text-foreground"
      >
        <LogIn className="h-3.5 w-3.5" />
        <span>Login</span>
      </Link>
    )
  }

  const handleSignOut = async () => {
    await authClient.signOut()
    refetch()
    toast.success("Signed out successfully")
    router.push("/login")
  }

  const isAdmin = session.user.role === "admin"

  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 hover:bg-primary/20 transition-colors"
      >
        {isAdmin ? (
          <Shield className="h-4 w-4 text-primary" />
        ) : (
          <User className="h-4 w-4 text-primary" />
        )}
        <span className="text-sm font-semibold text-primary">{session.user.name}</span>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-lg border bg-card shadow-lg">
            {isAdmin && (
              <button
                onClick={() => {
                  setShowMenu(false)
                  router.push("/users")
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary rounded-t-lg"
              >
                <UserPlus className="h-4 w-4" />
                Manage Users
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary rounded-b-lg text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  )
}