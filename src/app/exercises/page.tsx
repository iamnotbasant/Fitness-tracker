"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ExerciseCard } from "@/components/exercise-card"
import { useExercises } from "@/hooks/use-local-data"
import { Plus, Lock, AlertCircle } from "lucide-react"
import type { Exercise } from "@/lib/types"
import { useSession } from "@/lib/auth-client"
import { toast } from "sonner"

const BODY_PARTS = [
  "Chest",
  "Upper Back",
  "Lats",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Core / Abs",
  "Obliques",
  "Lower Back",
  "Glutes",
  "Quads",
  "Hamstrings",
  "Adductors",
  "Abductors",
  "Calves",
  "Neck",
]
const TAGS = ["calisthenics", "strength", "endurance", "flexibility", "recovery", "hiit", "mobility"]
const EXERCISE_TYPES: NonNullable<Exercise["type"]>[] = ["standard", "timer", "weighted", "bodyweight", "cardio", "mobility"]
const SPLITS: NonNullable<Exercise["split"]>[] = ["push", "pull", "legs", "upper", "lower", "full", "core", "other"]

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function ExercisesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { exercises, create, update, remove, isLoading } = useExercises()
  const [query, setQuery] = useState("")
  const [levelFilter, setLevelFilter] = useState<"all" | number>("all")
  const [sortBy, setSortBy] = useState<"level-asc" | "level-desc" | "name" | "popularity">("level-asc")
  const [showForm, setShowForm] = useState(false)

  // Debounce search query for better performance
  const debouncedQuery = useDebounce(query, 300)

  const isAdmin = true

  const filtered = useMemo(() => {
    let list = exercises
    
    // Use debounced query for filtering
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase()
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.bodyParts ?? []).some((b) => b.toLowerCase().includes(q)) ||
          (e.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      )
    }
    
    if (levelFilter !== "all") list = list.filter((e) => Number(e.level ?? 0) === levelFilter)
    
    // Sort logic
    if (sortBy === "level-asc") {
      list = list.slice().sort((a, b) => Number(a.level ?? 0) - Number(b.level ?? 0) || a.name.localeCompare(b.name))
    } else if (sortBy === "level-desc") {
      list = list.slice().sort((a, b) => Number(b.level ?? 0) - Number(a.level ?? 0) || a.name.localeCompare(b.name))
    } else if (sortBy === "popularity") {
      list = list.slice().sort((a, b) => {
        const aLast = (a as any).lastUsedAt || 0
        const bLast = (b as any).lastUsedAt || 0
        return bLast - aLast || a.name.localeCompare(b.name)
      })
    } else {
      list = list.slice().sort((a, b) => a.name.localeCompare(b.name))
    }
    
    return list
  }, [exercises, debouncedQuery, levelFilter, sortBy])

  return (
    <main className="pb-24 md:pb-8">
      <section className="mx-auto max-w-5xl px-4 pt-6">
        {session && !localStorage.getItem("bearer_token") && (
          <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-destructive mb-1">Session Expired</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Your authentication session has expired. Please log out and log back in to continue.
              </p>
              <button
                onClick={() => {
                  localStorage.removeItem("currentUser")
                  localStorage.removeItem("bearer_token")
                  router.push("/login")
                }}
                className="text-sm font-medium text-destructive hover:underline cursor-pointer"
              >
                Log Out Now
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <h1 className="text-2xl font-semibold">Exercises</h1>
          <div className="flex flex-col gap-2 md:ml-auto md:flex-row md:items-center">
            <div className="flex gap-2">
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="flex-1 rounded-lg border bg-card px-3 py-2.5 text-sm md:flex-none cursor-pointer"
                aria-label="Filter by level"
              >
                <option value="all">All Levels</option>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((l) => (
                  <option key={l} value={l}>
                    Level {l}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 rounded-lg border bg-card px-3 py-2.5 text-sm md:flex-none cursor-pointer"
                aria-label="Sort by"
              >
                <option value="level-asc">Level (Low to High)</option>
                <option value="level-desc">Level (High to Low)</option>
                <option value="name">Name (A-Z)</option>
                <option value="popularity">Popularity</option>
              </select>
            </div>
            <button
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 md:w-auto cursor-pointer"
              onClick={() => setShowForm((s) => !s)}
            >
              {showForm ? "Close" : "New Exercise"}
            </button>
          </div>
        </div>

        <div className="mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border bg-card px-4 py-2.5 text-base"
            placeholder="Search exercises..."
            aria-label="Search exercises"
          />
          {query !== debouncedQuery && (
            <p className="mt-1 text-xs text-muted-foreground">Searching...</p>
          )}
        </div>

        {showForm && (
          <NewExerciseForm
            onCreate={async (ex) => {
              await create(ex)
              setShowForm(false)
            }}
          />
        )}
      </section>

      <section className="mx-auto max-w-5xl px-3 pt-4 md:px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading exercises...</p>
            </div>
          </div>
        ) : (
          <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
            {filtered.map((e) => (
              <ExerciseCard key={e.id} ex={e} onDelete={remove} />
            ))}
            {filtered.length === 0 && (
              <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
                No exercises found.
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

function NewExerciseForm({
  onCreate,
}: {
  onCreate: (payload: Omit<Exercise, "id">) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["standard"])
  const [split, setSplit] = useState<Exercise["split"]>("push")
  const [description, setDescription] = useState("")
  const [level, setLevel] = useState<number>(1)
  const [bodyParts, setBodyParts] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined)
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [repGoal, setRepGoal] = useState<number | "">("")

  const onPickFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      console.log("[v0] not an image, ignoring:", file.type)
      return
    }

    const readAsDataURL = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("Failed to read file"))
        reader.readAsDataURL(f)
      })

    try {
      const data = await readAsDataURL(file)

      const img = new Image()
      img.onload = () => {
        try {
          const targetRatio = 16 / 9
          const srcW = img.naturalWidth
          const srcH = img.naturalHeight
          const srcRatio = srcW / srcH

          let cropW = srcW
          let cropH = Math.round(srcW / targetRatio)
          if (srcRatio < targetRatio) {
            cropH = srcH
            cropW = Math.round(srcH * targetRatio)
          }
          const sx = Math.max(0, Math.round((srcW - cropW) / 2))
          const sy = Math.max(0, Math.round((srcH - cropH) / 2))

          const maxW = 1600
          const scale = Math.min(1, maxW / cropW)
          const outW = Math.round(cropW * scale)
          const outH = Math.round(outW / targetRatio)

          const canvas = document.createElement("canvas")
          canvas.width = outW
          canvas.height = outH
          const ctx = canvas.getContext("2d")
          if (!ctx) throw new Error("Canvas context not available")

          ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outW, outH)

          const out = canvas.toDataURL("image/jpeg", 0.82)
          setImageUrl(out)
        } catch (err) {
          console.log("[v0] image processing error:", (err as Error).message)
          setImageUrl(data)
        }
      }
      img.src = data
    } catch (e) {
      console.log("[v0] image read error:", e)
    }
  }

  return (
    <form
      className="mt-4 grid gap-4 rounded-xl border bg-card p-4 shadow-sm md:p-6"
      onSubmit={async (e) => {
        e.preventDefault()
        const finalType = selectedTypes.length > 1 ? selectedTypes.join(",") : (selectedTypes[0] || "standard")
        await onCreate({
          name: name.trim(),
          type: finalType as any,
          split,
          description: description.trim() || undefined,
          level,
          bodyParts,
          tags,
          imageUrl: imageUrl || imageUrlInput.trim() || undefined,
          repGoal: repGoal ? Number(repGoal) : undefined,
        })
        setName("")
        setDescription("")
        setImageUrl(undefined)
        setImageUrlInput("")
        setBodyParts([])
        setTags([])
        setLevel(1)
        setSelectedTypes(["standard"])
        setSplit("push")
        setRepGoal("")
      }}
    >
      <div className="grid gap-2">
        <label className="text-sm font-medium text-muted-foreground">Exercise Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border bg-card px-4 py-2.5 text-base"
          placeholder="e.g., Push-ups, Squats, Bench Press"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
            <span>Exercise Type (Multi-select)</span>
            <span className="text-xs text-primary font-medium">{selectedTypes.join(", ")}</span>
          </label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {EXERCISE_TYPES.map((t) => {
              const isSelected = selectedTypes.includes(t)
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => {
                    setSelectedTypes((prev) => {
                      if (prev.includes(t)) {
                        return prev.length > 1 ? prev.filter((x) => x !== t) : prev
                      } else {
                        return [...prev, t]
                      }
                    })
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border capitalize transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                      : "bg-secondary/60 text-muted-foreground border-border/70 hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {selectedTypes.includes("timer") && selectedTypes.includes("weighted")
              ? "Weighted + Timer combined (stopwatch & kg tracking)"
              : selectedTypes.includes("timer")
              ? "Time-based exercise (stopwatch/countdown)"
              : selectedTypes.includes("weighted")
              ? "Weight tracking enabled (kg)"
              : "Standard rep-based exercise"}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Workout Split</label>
          <select
            value={split}
            onChange={(e) => setSplit(e.target.value as Exercise["split"])}
            className="mt-2 w-full rounded-lg border bg-card px-4 py-2.5 text-base capitalize cursor-pointer"
          >
            {SPLITS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="mt-2 w-full rounded-lg border bg-card px-4 py-2.5 text-base cursor-pointer"
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((l) => (
              <option key={l} value={l}>
                Level {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Rep Goal</label>
          <input
            type="number"
            value={repGoal}
            onChange={(e) => setRepGoal(e.target.value ? Number(e.target.value) : "")}
            className="mt-2 w-full rounded-lg border bg-card px-4 py-2.5 text-base"
            placeholder="e.g., 10"
            min="1"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Target reps for this exercise
          </p>
        </div>
      </div>

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Body Parts</legend>
        <div className="flex flex-wrap gap-2">
          {BODY_PARTS.map((bp) => {
            const active = bodyParts.includes(bp)
            return (
              <button
                type="button"
                key={bp}
                onClick={() => setBodyParts((arr) => (arr.includes(bp) ? arr.filter((x) => x !== bp) : [...arr, bp]))}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors cursor-pointer",
                  active ? "bg-foreground text-background" : "bg-card hover:bg-muted",
                ].join(" ")}
              >
                {bp}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-muted-foreground">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="rounded-lg border bg-card px-4 py-2.5 text-base leading-relaxed"
          placeholder="Describe how to perform this exercise"
        />
      </div>

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Media (optional)</legend>
        
        <div className="grid gap-2">
          <label className="text-xs font-medium text-muted-foreground">Upload image file</label>
          <label className="grid h-32 place-items-center rounded-lg border bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) {
                  await onPickFile(f)
                  setImageUrlInput("")
                }
              }}
            />
            <span>Click to upload image</span>
          </label>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-xs font-medium text-muted-foreground">Paste image URL</label>
          <input
            type="url"
            value={imageUrlInput}
            onChange={(e) => {
              setImageUrlInput(e.target.value)
              if (e.target.value.trim()) {
                setImageUrl(undefined)
              }
            }}
            placeholder="https://example.com/image.jpg"
            className="rounded-lg border bg-card px-4 py-2.5 text-base"
          />
        </div>

        {(imageUrl || imageUrlInput) && (
          <div className="relative">
            <img
              src={imageUrl || imageUrlInput}
              alt="Preview"
              className="w-full rounded-md object-cover aspect-[16/9]"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg?height=360&width=640&query=invalid%20image"
              }}
            />
            <button
              type="button"
              onClick={() => {
                setImageUrl(undefined)
                setImageUrlInput("")
              }}
              className="absolute top-2 right-2 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              Remove
            </button>
          </div>
        )}
      </fieldset>

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Tags (optional)</legend>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t) => {
            const active = tags.includes(t)
            return (
              <button
                type="button"
                key={t}
                onClick={() => setTags((arr) => (arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]))}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors capitalize cursor-pointer",
                  active ? "bg-secondary" : "bg-card hover:bg-muted",
                ].join(" ")}
              >
                {t}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted cursor-pointer sm:w-auto"
          onClick={() => {
            setName("")
            setDescription("")
            setImageUrl(undefined)
            setImageUrlInput("")
            setBodyParts([])
            setTags([])
            setLevel(1)
            setType("standard")
            setSplit("push")
            setRepGoal("")
          }}
        >
          Cancel
        </button>
        <button type="submit" className="w-full rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer sm:w-auto">
          Add Exercise
        </button>
      </div>
    </form>
  )
}