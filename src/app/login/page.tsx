"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, UserPlus, LogIn } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = formData.name.trim()
    if (!trimmedName || !formData.password) {
      toast.error("Please enter both username and password")
      return
    }

    if (mode === "register") {
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match")
        return
      }
      if (formData.password.length < 4) {
        toast.error("Password must be at least 4 characters long")
        return
      }
    }

    setIsLoading(true)

    try {
      if (mode === "register") {
        // 1. Create account via register API
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            password: formData.password,
            role: "user",
          }),
        })

        const regData = await regRes.json()
        if (!regRes.ok) {
          toast.error(regData.error || "Failed to create account")
          setIsLoading(false)
          return
        }

        toast.success("Account created successfully! Logging you in...")
      }

      // 2. Perform login
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          password: formData.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === "INVALID_CREDENTIALS") {
          toast.error("Invalid username or password")
        } else {
          toast.error(data.error || "Login failed")
        }
        return
      }

      // Store user data in localStorage
      localStorage.setItem("currentUser", JSON.stringify(data))

      // Store bearer token for API calls
      if (data.token) {
        localStorage.setItem("bearer_token", data.token)
      }

      toast.success(`Welcome, ${data.name}!`)
      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("Auth error:", error)
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Fitness Tracker</h1>
          <p className="text-muted-foreground">
            {mode === "login"
              ? "Sign in to track your workouts"
              : "Create your free account to start tracking"}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 sm:p-8 shadow-sm">
          {/* Mode Switch Tabs */}
          <div className="flex rounded-lg bg-muted p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                mode === "login"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                mode === "register"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Username
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter your username"
                disabled={isLoading}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter your password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                disabled={isLoading}
                required
              />
            </div>

            {mode === "register" && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 cursor-pointer"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading
                ? mode === "login"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="text-primary hover:underline font-medium"
              >
                Create one now
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  )
}