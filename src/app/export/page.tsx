"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWorkouts, useExercises, useProfile } from "@/hooks/use-local-data"

export default function ExportPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fileRef = useRef<HTMLInputElement | null>(null)
  const [mode, setMode] = useState<"merge" | "replace">("merge")
  const { workouts, saveWorkouts, refresh: refreshW } = useWorkouts()
  const { exercises, refresh: refreshE } = useExercises()
  const { profile, save: saveProfile, refresh: refreshP } = useProfile()
  const [message, setMessage] = useState<string>("")

  const download = (content: string, name: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    const data = {
      workouts,
      exercises,
      profile,
      exportedAt: new Date().toISOString()
    }
    return JSON.stringify(data, null, 2)
  }

  const exportCSV = () => {
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""'
      const str = String(val)
      return `"${str.replace(/"/g, '""')}"`
    }

    const headers = ["Date", "Time", "Exercise", "Sets", "Reps", "Rest (s)", "Volume", "Weight", "Time (s)", "Notes"]
    const rows = workouts.map(w => [
      w.date,
      w.time || "",
      w.exerciseName,
      w.sets,
      w.reps,
      w.rest || "",
      w.volume || "",
      w.weight || "",
      w.timeSeconds || "",
      w.notes || ""
    ])
    return [headers, ...rows].map(row => row.map(escapeCsv).join(",")).join("\r\n")
  }

  const importJSON = async (jsonText: string) => {
    try {
      const data = JSON.parse(jsonText)
      
      if (mode === "replace") {
        // Replace mode: use imported data as-is
        if (data.workouts) await saveWorkouts(data.workouts)
        if (data.profile) await saveProfile(data.profile)
      } else {
        // Merge mode: combine with existing data
        if (data.workouts) {
          const merged = [...workouts, ...data.workouts]
          await saveWorkouts(merged)
        }
        if (data.profile && data.profile.name) {
          await saveProfile(data.profile)
        }
      }
      
      await Promise.all([refreshW(), refreshE(), refreshP()])
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Invalid JSON" }
    }
  }

  // Show loading while mounting
  if (!mounted) {
    return (
      <main className="pb-24">
        <section className="mx-auto max-w-3xl px-4 pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="pb-24">

      <header className="mx-auto max-w-3xl px-4 pt-6">
        <h1 className="text-2xl font-semibold">Data Export / Import</h1>
        <p className="text-sm text-muted-foreground">Export your workout data or import from a backup.</p>
      </header>

      <section className="mx-auto grid max-w-3xl gap-4 px-4 pt-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-base font-semibold">Export</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => download(exportJSON(), "workouts.json", "application/json")}
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              Export JSON
            </button>
            <button
              onClick={() => download(exportCSV(), "workouts.csv", "text/csv")}
              className="rounded-lg bg-secondary px-4 py-2 hover:bg-secondary/80"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-base font-semibold">Import</h2>
          <div className="mb-2 flex items-center gap-3">
            <label className="text-sm">Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="rounded-lg border bg-card px-3 py-2"
            >
              <option value="merge">Merge</option>
              <option value="replace">Replace</option>
            </select>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="mb-2 block"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const txt = await file.text()
              const res = await importJSON(txt)
              if (res.ok) {
                setMessage("Import successful.")
              } else {
                setMessage(`Import failed: ${res.error}`)
              }
              if (fileRef.current) fileRef.current.value = ""
            }}
          />
          <p className="text-xs text-muted-foreground">
            Import expects a JSON export created by this app. CSV import is not supported (export only).
          </p>
          {message && <p className="mt-2 text-sm">{message}</p>}
        </div>
      </section>
    </main>
  )
}