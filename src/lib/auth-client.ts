"use client"

import { useEffect, useState } from "react"

// Mock session that returns user from localStorage
export const useSession = () => {
  const [session, setSession] = useState<any>(null)
  const [isPending, setIsPending] = useState(true)

  useEffect(() => {
    // Check localStorage for current user, default to local admin basant
    let userStr = localStorage.getItem("currentUser")
    if (!localStorage.getItem("bearer_token")) {
      localStorage.setItem("bearer_token", "local_admin_token")
    }

    if (!userStr) {
      const defaultUser = {
        id: 1,
        name: "basant",
        role: "admin",
      }
      localStorage.setItem("currentUser", JSON.stringify(defaultUser))
      userStr = JSON.stringify(defaultUser)
    }

    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setSession({
          user: {
            id: String(user.id),
            name: user.name,
            email: `${user.name.toLowerCase()}@fitness.app`,
            role: user.role || "admin",
          }
        })
      } catch (error) {
        console.error("Failed to parse user from localStorage:", error)
      }
    }
    setIsPending(false)
  }, [])

  const refetch = () => {
    const userStr = localStorage.getItem("currentUser")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setSession({
          user: {
            id: String(user.id),
            name: user.name,
            email: `${user.name.toLowerCase()}@fitness.app`,
            role: user.role,
          }
        })
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
    return { error: null }
  }
}