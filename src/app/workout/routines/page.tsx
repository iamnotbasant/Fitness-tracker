"use client"

import { useRouter } from "next/navigation"
import { authClient, useSession } from "@/lib/auth-client"
import { useRoutines, useActiveSession } from "@/hooks/use-local-data"
import { ArrowLeft, Plus, Play, Trash2, Calendar, Edit } from "lucide-react"
import { useState, useEffect } from "react"

export default function RoutinesPage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])


  const { routines, remove } = useRoutines()
  const { start } = useActiveSession()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [starting, setStarting] = useState<string | null>(null)

  const handleStartRoutine = async (routineId: string) => {
    try {
      setStarting(routineId)
      await start(routineId)
      router.push("/workout")
    } catch (error) {
      console.error("Failed to start routine:", error)
      alert("Failed to start routine. Please try again.")
    } finally {
      setStarting(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Delete this routine?")) {
      await remove(id)
    }
    setDeleting(null)
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  if (!mounted) {
    return null
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-muted rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl md:text-2xl font-semibold flex-1">My Routines</h1>
          <button
            onClick={() => router.push("/workout/routines/new")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pt-6 pb-20">
        {routines.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">No Routines Yet</h2>
              <p className="text-muted-foreground text-sm">
                Create your first workout routine to quickly start workouts with pre-loaded exercises
              </p>
              <button
                onClick={() => router.push("/workout/routines/new")}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Routine
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map((routine) => (
              <div key={routine.id} className="rounded-2xl border bg-card p-5 hover:border-primary/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1">{routine.name}</h3>
                    {routine.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{routine.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-foreground">{routine.exercises.length}</span> exercises
                      </span>
                      {routine.lastUsed && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Last used {formatDate(routine.lastUsed)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {routine.exercises.slice(0, 5).map((ex, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-md bg-muted">
                          {ex.exerciseName}
                        </span>
                      ))}
                      {routine.exercises.length > 5 && (
                        <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                          +{routine.exercises.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleStartRoutine(routine.id)}
                      disabled={starting === routine.id}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" />
                      {starting === routine.id ? "Starting..." : "Continue"}
                    </button>
                    <button
                      onClick={() => router.push(`/workout/routines/${routine.id}/edit`)}
                      className="px-4 py-2 hover:bg-muted rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleting(deleting === routine.id ? null : routine.id)}
                      className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {deleting === routine.id && (
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Delete this routine?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleting(null)}
                        className="px-3 py-1.5 text-sm hover:bg-muted rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(routine.id)}
                        className="px-3 py-1.5 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}