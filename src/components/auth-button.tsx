"use client"

import { useSession, authClient } from "@/lib/auth-client"
import { User, Shield, LogOut, UserPlus } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function AuthButton() {
  const { data: session, isPending, refetch } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (mounted && !isPending && !session) {
      router.push("/login")
    }
  }, [mounted, isPending, session, router])

  // Show loading state until mounted
  if (!mounted || isPending) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
        <div className="h-4 w-4 animate-pulse rounded-full bg-muted-foreground/20" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (!session?.user) {
    return null
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