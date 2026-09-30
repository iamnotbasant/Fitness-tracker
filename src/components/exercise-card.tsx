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
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setImageError(false)
  }, [ex.imageUrl])

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

  const muscleGroup = ex.bodyParts && ex.bodyParts.length > 0
    ? ex.bodyParts.join(", ")
    : (ex.split ? ex.split.charAt(0).toUpperCase() + ex.split.slice(1) : (ex.type ? ex.type.charAt(0).toUpperCase() + ex.type.slice(1) : "General"))

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleClick()
        }
      }}
      role="button"
      tabIndex={0}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs transition-all duration-200 hover:shadow-lg hover:border-zinc-500/50 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer select-none min-h-[44px]"
    >
      {/* Roughly square visual area on top (reference: Hevy exercise picker) */}
      <div className="aspect-square w-full overflow-hidden bg-zinc-900/80 relative">
        {ex.imageUrl && !imageError ? (
          <img
            src={ex.imageUrl}
            alt={ex.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-900/60 text-zinc-500">
            <Dumbbell className="h-8 w-8 stroke-[1.25] text-zinc-500/70 transition-transform duration-300 group-hover:scale-110 group-hover:text-zinc-400" />
          </div>
        )}

        {/* Subtle dark gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Subtle Level badge in top-left corner */}
        {ex.level !== undefined && (
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/60 text-zinc-300 backdrop-blur-md border border-white/10 shadow-xs">
              Lvl {ex.level}
            </span>
          </div>
        )}

        {/* Corner Affordances: Edit & Delete buttons */}
        {mounted && canEdit && (
          <div
            className="absolute top-1.5 right-1.5 flex items-center gap-1 z-20 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleEdit}
              className="relative h-7 w-7 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white hover:bg-black/80 flex items-center justify-center transition-colors cursor-pointer before:absolute before:-inset-2 before:content-['']"
              title="Edit Exercise"
              aria-label="Edit Exercise"
            >
              <Edit className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="relative h-7 w-7 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-red-400 hover:bg-black/80 flex items-center justify-center transition-colors cursor-pointer before:absolute before:-inset-2 before:content-['']"
              title="Delete Exercise"
              aria-label="Delete Exercise"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Card Body: Name in semibold white, muscle group in small grey text */}
      <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 gap-0.5 bg-card">
        <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-white line-clamp-2 leading-snug group-hover:text-zinc-200 transition-colors">
          {ex.name}
        </h3>
        <p className="text-[11px] sm:text-xs text-zinc-400 capitalize truncate">
          {muscleGroup}
        </p>
      </div>
    </div>
  )
}