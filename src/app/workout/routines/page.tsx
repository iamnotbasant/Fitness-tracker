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
      await start(String(routineId))
      router.push("/workout")
    } catch (error) {
      console.error("Failed to start routine:", error)
      toast.error("Failed to start routine. Please try again.")
    } finally {
      setStarting(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await remove(String(id))
      toast.success("Routine deleted successfully")
    } catch (error) {
      console.error("Failed to delete routine:", error)
      toast.error("Failed to delete routine")
    } finally {
      setDeleting(null)
    }
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
          <button onClick={() => router.back()} className="p-1 hover:bg-muted rounded-lg cursor-pointer">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl md:text-2xl font-semibold flex-1">My Routines</h1>
          <button
            onClick={() => router.push("/workout/routines/new")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            New Routine
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pt-6 pb-20">
        {routines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-12 text-center">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto text-primary">
                <Plus className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-semibold">No Routines Yet</h2>
              <p className="text-muted-foreground text-sm">
                Create your first workout routine to quickly start workouts with pre-loaded exercises
              </p>
              <button
                onClick={() => router.push("/workout/routines/new")}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 inline-flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Create Routine
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map((routine) => (
              <div key={routine.id} className="rounded-2xl border border-border/70 bg-card p-5 hover:border-zinc-700 transition-all shadow-xs">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-foreground mb-1 tracking-tight">{routine.name}</h3>
                    {routine.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{routine.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3.5">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        {routine.exercises?.length || 0} exercises
                      </span>
                      {routine.lastUsed && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Last used {formatDate(routine.lastUsed)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(routine.exercises || []).slice(0, 5).map((ex, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
                          {ex.exerciseName}
                        </span>
                      ))}
                      {(routine.exercises || []).length > 5 && (
                        <span className="text-xs px-2.5 py-1 rounded-md bg-secondary text-muted-foreground font-medium">
                          +{(routine.exercises || []).length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleStartRoutine(routine.id)}
                      disabled={starting === routine.id}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      {starting === routine.id ? "Starting..." : "Start"}
                    </button>
                    <button
                      onClick={() => router.push(`/workout/routines/${routine.id}/edit`)}
                      className="px-4 py-2 hover:bg-muted border border-border/60 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleting(deleting === routine.id ? null : routine.id)}
                      className="p-2 hover:bg-destructive/10 rounded-xl text-muted-foreground hover:text-destructive cursor-pointer transition-colors flex items-center justify-center"
                      title="Delete routine"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {deleting === routine.id && (
                  <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
                    <p className="text-xs font-medium text-destructive">Delete this routine permanently?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleting(null)}
                        className="px-3 py-1.5 text-xs hover:bg-muted rounded-lg font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(routine.id)}
                        className="px-3 py-1.5 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg font-semibold cursor-pointer shadow-xs"
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