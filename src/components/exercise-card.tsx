"use client"

import { useRouter } from "next/navigation"
import { Edit, Trash2, Dumbbell } from "lucide-react"
import type { Exercise } from "@/lib/types"
import { useSession } from "@/lib/auth-client"
import { useEffect, useState } from "react"

interface ExerciseCardProps {
  ex: Exercise & {
    isAdminExercise?: boolean
    creatorName?: string
    userId?: string
  }
  onDelete: (id: string) => Promise<void>
}

export function ExerciseCard({ ex, onDelete }: ExerciseCardProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleClick = () => {
    router.push(`/exercises/${ex.id}`)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/exercises/${ex.id}?mode=edit`)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Are you sure you want to delete "${ex.name}"?`)) {
      await onDelete(ex.id)
    }
  }

  const canEdit = mounted

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 cursor-pointer select-none"
    >
      {/* Exercise Image or Modern Geometric Graphic */}
      <div className="aspect-[16/9] w-full overflow-hidden bg-muted/60 relative">
        {ex.imageUrl ? (
          <img
            src={ex.imageUrl}
            alt={ex.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-108"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary/50 via-muted to-secondary/30 text-muted-foreground/60">
            <Dumbbell className="h-10 w-10 stroke-[1.25] transition-transform duration-300 group-hover:scale-110 group-hover:text-primary/70" />
          </div>
        )}

        {/* Subtle dark gradient overlay on hover for crisp contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Floating Action Buttons - Gracefully revealed on hover */}
        {mounted && canEdit && (
          <div
            className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 -translate-y-1.5 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-250 ease-out z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleEdit}
              className="p-2 rounded-xl bg-background/90 backdrop-blur-md border border-border/80 text-foreground shadow-lg hover:bg-primary hover:text-primary-foreground hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer"
              title="Edit Exercise"
              aria-label="Edit Exercise"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-xl bg-background/90 backdrop-blur-md border border-border/80 text-muted-foreground shadow-lg hover:bg-destructive hover:text-destructive-foreground hover:border-destructive hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer"
              title="Delete Exercise"
              aria-label="Delete Exercise"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col gap-2.5 flex-1 justify-between">
        <div>
          <h3 className="text-base font-bold tracking-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {ex.name}
          </h3>
          {ex.bodyParts && ex.bodyParts.length > 0 && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {ex.bodyParts.slice(0, 3).join(", ")}
            </p>
          )}
        </div>

        {/* Pill Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {ex.isAdminExercise && (
            <span className="rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
              Official
            </span>
          )}
          {ex.level !== undefined && (
            <span className="rounded-lg bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[11px] font-bold">
              Level {ex.level}
            </span>
          )}
          {ex.split && (
            <span className="rounded-lg bg-secondary/80 border border-border/60 px-2 py-0.5 text-[11px] font-medium capitalize text-secondary-foreground">
              {ex.split}
            </span>
          )}
          {ex.type && (
            <span className="rounded-lg bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
              {ex.type}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}