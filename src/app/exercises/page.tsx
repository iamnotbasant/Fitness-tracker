"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ExerciseCard } from "@/components/exercise-card"
import { useExercises } from "@/hooks/use-local-data"
import { Plus, Lock, AlertCircle, Loader2, Search, X } from "lucide-react"
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
  const [splitFilter, setSplitFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"name" | "popularity">("name")
  const [showForm, setShowForm] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Dynamic levels from existing exercises
  const availableLevels = useMemo(() => {
    const set = new Set<number>()
    for (const ex of exercises) {
      if (ex.level !== undefined && ex.level !== null) {
        set.add(Number(ex.level))
      }
    }
    return Array.from(set).sort((a, b) => a - b)
  }, [exercises])

  // Debounce search query for better performance
  const debouncedQuery = useDebounce(query, 300)

  const isAdmin = Boolean(mounted && session?.user?.role === "admin")

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
    
    if (splitFilter !== "all") {
      const sf = splitFilter.toLowerCase()
      list = list.filter((e) => {
        const s = (e.split || "").toLowerCase()
        const bp = (e.bodyParts || []).map(b => b.toLowerCase())
        return s.includes(sf) || bp.some(b => b.includes(sf))
      })
    }

    if (typeFilter !== "all") {
      const tf = typeFilter.toLowerCase()
      list = list.filter((e) => {
        const t = (e.type || "standard").toLowerCase()
        return t.includes(tf)
      })
    }

    // Sort logic
    if (sortBy === "popularity") {
      list = list.slice().sort((a, b) => {
        const aLast = (a as any).lastUsedAt || 0
        const bLast = (b as any).lastUsedAt || 0
        return bLast - aLast || a.name.localeCompare(b.name)
      })
    } else {
      list = list.slice().sort((a, b) => a.name.localeCompare(b.name))
    }
    
    return list
  }, [exercises, debouncedQuery, levelFilter, splitFilter, typeFilter, sortBy])

  return (
    <main className="pb-32 md:pb-12">
      <section className="mx-auto max-w-5xl px-3 pt-6 md:px-4">
        {mounted && session && typeof window !== "undefined" && !localStorage.getItem("bearer_token") && (
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

        {/* Header: Title + Action */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Exercises</h1>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs sm:text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors min-h-[44px] cursor-pointer shadow-xs"
            onClick={() => setShowForm((s) => !s)}
          >
            <Plus className="h-4 w-4" />
            <span>{showForm ? "Close" : "New Exercise"}</span>
          </button>
        </div>

        {/* Search Bar + Filters (reference: Hevy exercise search) */}
        <div className="mt-3 flex flex-col gap-2.5">
          {/* Rounded-full Search bar with Search icon & clear X button */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-11 rounded-full border border-border/80 bg-card pl-10 pr-11 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-colors"
              placeholder="Search exercises by name, muscle, or tag..."
              aria-label="Search exercises"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <div className="h-5 w-5 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300">
                  <X className="h-3 w-3" />
                </div>
              </button>
            )}
          </div>

          {/* "Showing results for '...'" label row when searching */}
          {query.trim().length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pt-0.5">
              <p>
                Showing results for{" "}
                <span className="font-semibold text-foreground">&apos;{query.trim()}&apos;</span>
              </p>
              <span className="text-[11px] tabular-nums">
                {query !== debouncedQuery ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Searching...</span>
                  </span>
                ) : (
                  `${filtered.length} ${filtered.length === 1 ? "exercise" : "exercises"}`
                )}
              </span>
            </div>
          )}

          {/* Filter Dropdowns: Split, Type, Level, Sort */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-end gap-2 pt-1">
            <select
              value={splitFilter}
              onChange={(e) => setSplitFilter(e.target.value)}
              className="min-h-[44px] h-11 rounded-xl sm:rounded-full bg-card border border-border/80 px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer hover:border-zinc-500/50 transition-colors"
              aria-label="Filter by split"
            >
              <option value="all">All Splits</option>
              <option value="push">Push</option>
              <option value="pull">Pull</option>
              <option value="legs">Legs</option>
              <option value="upper">Upper</option>
              <option value="lower">Lower</option>
              <option value="full">Full Body</option>
              <option value="core">Core</option>
              <option value="other">Other</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="min-h-[44px] h-11 rounded-xl sm:rounded-full bg-card border border-border/80 px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer hover:border-zinc-500/50 transition-colors"
              aria-label="Filter by exercise type"
            >
              <option value="all">All Types</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="weighted">Weighted</option>
              <option value="timer">Timer</option>
              <option value="cardio">Cardio</option>
              <option value="mobility">Mobility</option>
            </select>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="min-h-[44px] h-11 rounded-xl sm:rounded-full border border-border/80 bg-card px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer hover:border-zinc-500/50 transition-colors"
              aria-label="Filter by level"
            >
              <option value="all">All Levels</option>
              {(availableLevels.length > 0 ? availableLevels : [1]).map((l) => (
                <option key={l} value={l}>
                  Level {l}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="min-h-[44px] h-11 rounded-xl sm:rounded-full border border-border/80 bg-card px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer hover:border-zinc-500/50 transition-colors"
              aria-label="Sort by"
            >
              <option value="name">Name (A-Z)</option>
              <option value="popularity">Popularity</option>
            </select>
          </div>
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
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-4 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
            {filtered.map((e) => (
              <ExerciseCard key={e.id} ex={e} onDelete={remove} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full rounded-2xl border border-border/80 bg-card p-8 text-center text-sm text-muted-foreground">
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false)

  const onPickFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file")
      return
    }

    setIsProcessingImage(true)
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

          // Lightweight thumbnail compression (~15-20KB) to ensure rapid loading
          const maxW = 480
          const scale = Math.min(1, maxW / cropW)
          const outW = Math.round(cropW * scale)
          const outH = Math.round(outW / targetRatio)

          const canvas = document.createElement("canvas")
          canvas.width = outW
          canvas.height = outH
          const ctx = canvas.getContext("2d")
          if (!ctx) throw new Error("Canvas context not available")

          ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outW, outH)

          const out = canvas.toDataURL("image/jpeg", 0.72)
          setImageUrl(out)
          toast.success("Image optimized and attached!")
        } catch (err) {
          console.log("[v0] image processing error:", (err as Error).message)
          setImageUrl(data)
        } finally {
          setIsProcessingImage(false)
        }
      }
      img.onerror = () => {
        setIsProcessingImage(false)
        toast.error("Failed to process image")
      }
      img.src = data
    } catch (e) {
      console.log("[v0] image read error:", e)
      setIsProcessingImage(false)
      toast.error("Failed to read image file")
    }
  }

  return (
    <form
      className="mt-4 grid gap-4 rounded-xl border bg-card p-4 shadow-sm md:p-6"
      onSubmit={async (e) => {
        e.preventDefault()
        if (isSubmitting) return
        try {
          setIsSubmitting(true)
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
          toast.success("Exercise created successfully!")
        } catch (err: any) {
          toast.error(err.message || "Failed to create exercise")
        } finally {
          setIsSubmitting(false)
        }
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
                {s === "full" ? "Full Body" : s.charAt(0).toUpperCase() + s.slice(1)}
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
          <label className="text-sm font-medium text-muted-foreground">
            {selectedTypes.includes("timer") ? "Time Goal (seconds)" : "Rep Goal"}
          </label>
          <input
            type="number"
            value={repGoal}
            onChange={(e) => setRepGoal(e.target.value ? Number(e.target.value) : "")}
            className="mt-2 w-full rounded-lg border bg-card px-4 py-2.5 text-base"
            placeholder={selectedTypes.includes("timer") ? "e.g., 60s" : "e.g., 10"}
            min="1"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {selectedTypes.includes("timer") ? "Target duration in seconds" : "Target reps for this exercise"}
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
          <label className="grid h-32 place-items-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors relative">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isProcessingImage}
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) {
                  await onPickFile(f)
                  setImageUrlInput("")
                }
              }}
            />
            {isProcessingImage ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <span className="text-xs font-medium text-foreground">Processing & compressing image...</span>
              </div>
            ) : imageUrl ? (
              <div className="flex items-center gap-3 p-2">
                <img src={imageUrl} alt="Preview" className="h-16 w-24 object-cover rounded-md border" />
                <span className="text-xs text-emerald-500 font-medium">Image attached · Click to replace</span>
              </div>
            ) : (
              <span>Click to upload image</span>
            )}
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
            setSelectedTypes(["standard"])
            setSplit("push")
            setRepGoal("")
          }}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={isSubmitting || isProcessingImage}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 cursor-pointer sm:w-auto shadow-xs"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving Exercise...</span>
            </>
          ) : (
            <span>Add Exercise</span>
          )}
        </button>
      </div>
    </form>
  )
}