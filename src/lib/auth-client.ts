"use client"

import { useEffect, useState } from "react"

// Session hook that reads valid authenticated user and bearer token from localStorage
export const useSession = () => {
  const [session, setSession] = useState<any>(null)
  const [isPending, setIsPending] = useState(true)

  useEffect(() => {
    // Clean up any legacy mock token
    const token = localStorage.getItem("bearer_token")
    if (token === "local_admin_token") {
      localStorage.removeItem("bearer_token")
      localStorage.removeItem("currentUser")
    }

    const currentToken = localStorage.getItem("bearer_token")
    const userStr = localStorage.getItem("currentUser")

    if (currentToken && userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user && user.name) {
          const rawId = user.id ? String(user.id) : "1"
          const userId = rawId.startsWith("user_") ? rawId : `user_${rawId}`
          setSession({
            user: {
              id: userId,
              name: user.name,
              email: user.email || `${user.name.toLowerCase()}@fitness.app`,
              role: user.role || "user",
            }
          })
        } else {
          setSession(null)
        }
      } catch (error) {
        console.error("Failed to parse user from localStorage:", error)
        setSession(null)
      }
    } else {
      setSession(null)
    }
    setIsPending(false)
  }, [])

  const refetch = () => {
    const currentToken = localStorage.getItem("bearer_token")
    if (!currentToken || currentToken === "local_admin_token") {
      setSession(null)
      return
    }

    const userStr = localStorage.getItem("currentUser")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user && user.name) {
          const rawId = user.id ? String(user.id) : "1"
          const userId = rawId.startsWith("user_") ? rawId : `user_${rawId}`
          setSession({
            user: {
              id: userId,
              name: user.name,
              email: user.email || `${user.name.toLowerCase()}@fitness.app`,
              role: user.role || "user",
            }
          })
        } else {
          setSession(null)
        }
      } catch (error) {
        setSession(null)
      }
    } else {
      setSession(null)
    }
  }

  return { data: session, isPending, refetch }
}

export const authClient = {
  signOut: async () => {
    localStorage.removeItem("currentUser")
    localStorage.removeItem("bearer_token")
    if (typeof document !== "undefined") {
      document.cookie = "better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
    return { error: null }
  }
}