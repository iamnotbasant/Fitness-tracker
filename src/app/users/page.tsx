"use client"

import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { UserPlus, Loader2, Trash2, Shield, User, ArrowLeft } from "lucide-react"

export default function UsersPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ name: "", password: "", role: "user" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if not admin
  useEffect(() => {
    if (!isPending && (!session || session.user.role !== "admin")) {
      router.push("/")
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session?.user.role === "admin") {
      fetchUsers()
    }
  }, [session])

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
      toast.error("Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newUser.name || !newUser.password) {
      toast.error("Name and password are required")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === "DUPLICATE_USER") {
          toast.error("User with this name already exists")
        } else {
          toast.error(data.error || "Failed to create user")
        }
        return
      }

      toast.success(`User ${newUser.name} created successfully`)
      setNewUser({ name: "", password: "", role: "user" })
      setShowAddUser(false)
      fetchUsers()
    } catch (error) {
      console.error("Failed to create user:", error)
      toast.error("An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast.success(`User ${userName} deleted successfully`)
        fetchUsers()
      } else {
        toast.error("Failed to delete user")
      }
    } catch (error) {
      console.error("Failed to delete user:", error)
      toast.error("An error occurred")
    }
  }

  if (isPending || !session) {
    return (
      <main className="pb-24 md:pb-8">
        <section className="w-full px-4 lg:px-8 pt-4">
          <div className="mx-auto max-w-7xl flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="pb-24 md:pb-8">
      <section className="w-full px-4 lg:px-8 pt-4">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">User Management</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Create and manage user accounts
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Admin Panel</span>
              </div>
            </div>
          </div>

          {/* Add New User Section */}
          <div className="mb-6">
            {!showAddUser ? (
              <button
                onClick={() => setShowAddUser(true)}
                className="w-full rounded-xl bg-primary px-4 py-4 text-base font-medium text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <UserPlus className="h-5 w-5" />
                Add New User
              </button>
            ) : (
              <div className="rounded-xl border-2 bg-card p-6 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Create New User</h2>
                  <p className="text-sm text-muted-foreground">Fill in the details below</p>
                </div>

                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="user-name" className="block text-sm font-medium">
                      Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="user-name"
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter user name (e.g., John Doe)"
                      disabled={isSubmitting}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="user-password" className="block text-sm font-medium">
                      Password <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="user-password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter secure password"
                      autoComplete="off"
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="user-role" className="block text-sm font-medium">
                      Role <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="user-role"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      disabled={isSubmitting}
                    >
                      <option value="user">User - Regular access</option>
                      <option value="admin">Admin - Full access</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? "Creating..." : "Create User"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddUser(false)
                        setNewUser({ name: "", password: "", role: "user" })
                      }}
                      disabled={isSubmitting}
                      className="px-6 rounded-lg border py-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Existing Users Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">All Users</h2>
              <span className="text-sm text-muted-foreground">
                {users.length} {users.length === 1 ? "user" : "users"}
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12 rounded-xl border bg-card">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 rounded-xl border-2 border-dashed bg-card">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No users found. Create your first user above.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {user.role === "admin" ? (
                          <Shield className="h-5 w-5 text-primary" />
                        ) : (
                          <User className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{user.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {user.role}
                        </div>
                      </div>
                    </div>
                    {user.name !== "basant" && (
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors ml-3"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
