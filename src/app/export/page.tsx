"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWorkouts, useExercises, useProfile } from "@/hooks/use-local-data"
import { toast } from "sonner"
import { Download, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

export default function ExportPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [mode, setMode] = useState<"merge" | "replace">("merge")
  const { workouts, refresh: refreshW } = useWorkouts()
  const { exercises, create: createExercise, refresh: refreshE } = useExercises()
  const { profile, save: saveProfile, refresh: refreshP } = useProfile()
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<string>("")
  const [errorDetails, setErrorDetails] = useState<string>("")

  useEffect(() => {
    setMounted(true)
  }, [])

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
      exportedAt: new Date().toISOString(),
      version: "2.0"
    }
    return JSON.stringify(data, null, 2)
  }

  const exportCSV = () => {
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""'
      const str = String(val)
      return `"${str.replace(/"/g, '""')}"`
    }

    const headers = ["Date", "Time", "Exercise", "Sets", "Reps", "Rest (s)", "Volume", "Weight (kg)", "Time (s)", "Notes"]
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

  const parseCSV = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0)
    if (lines.length < 2) return []

    // Helper to parse CSV line respecting quotes
    const parseLine = (line: string) => {
      const result: string[] = []
      let cur = ""
      let inQuote = false
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (c === '"') {
          if (inQuote && line[i + 1] === '"') {
            cur += '"'
            i++
          } else {
            inQuote = !inQuote
          }
        } else if (c === ',' && !inQuote) {
          result.push(cur.trim())
          cur = ""
        } else {
          cur += c
        }
      }
      result.push(cur.trim())
      return result
    }

    const header = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
    
    // Detect column indexes for flexibility (supports standard format & Strong/Hevy formats)
    const dateIdx = header.findIndex(h => h.includes("date"))
    const timeIdx = header.findIndex(h => h.includes("time") && !h.includes("rest"))
    const nameIdx = header.findIndex(h => h.includes("exercise") || h.includes("name"))
    const setsIdx = header.findIndex(h => h.includes("set") && !h.includes("offset"))
    const repsIdx = header.findIndex(h => h.includes("rep"))
    const weightIdx = header.findIndex(h => h.includes("weight") || h.includes("kg") || h.includes("lbs"))
    const notesIdx = header.findIndex(h => h.includes("note") || h.includes("comment"))

    const parsedWorkouts: any[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i])
      if (cols.length === 0 || !cols[nameIdx >= 0 ? nameIdx : 2]) continue

      const rawDate = dateIdx >= 0 ? cols[dateIdx] : cols[0]
      const exerciseName = nameIdx >= 0 ? cols[nameIdx] : cols[2]
      if (!exerciseName) continue

      // Normalize date to YYYY-MM-DD
      let normalizedDate = rawDate
      if (rawDate && rawDate.includes("/")) {
        const parts = rawDate.split("/")
        if (parts.length === 3) {
          // If DD/MM/YYYY or MM/DD/YYYY, convert
          const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
          const m = parts[0].padStart(2, '0')
          const d = parts[1].padStart(2, '0')
          normalizedDate = `${y}-${m}-${d}`
        }
      }

      parsedWorkouts.push({
        date: normalizedDate || new Date().toISOString().slice(0, 10),
        time: timeIdx >= 0 ? cols[timeIdx] : undefined,
        exerciseName,
        sets: setsIdx >= 0 ? Number(cols[setsIdx]) || 1 : 1,
        reps: repsIdx >= 0 ? Number(cols[repsIdx]) || 0 : 0,
        weight: weightIdx >= 0 ? Number(cols[weightIdx]) || undefined : undefined,
        notes: notesIdx >= 0 ? cols[notesIdx] : undefined,
      })
    }

    return parsedWorkouts
  }

  const handleBulkInsert = async (workoutsToInsert: any[]) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null
    const res = await fetch("/api/workouts/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ workouts: workoutsToInsert }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Bulk insert failed (${res.status})`)
    }

    const data = await res.json()
    return data.count || workoutsToInsert.length
  }

  const importData = async (fileText: string, fileName: string) => {
    setIsProcessing(true)
    setMessage("")
    setErrorDetails("")

    try {
      let workoutsList: any[] = []
      let exercisesList: any[] = []
      let profileData: any = null

      if (fileName.endsWith(".csv")) {
        // Parse CSV
        workoutsList = parseCSV(fileText)
        if (workoutsList.length === 0) {
          throw new Error("No valid workout rows could be parsed from the CSV file.")
        }
      } else {
        // Parse JSON
        const json = JSON.parse(fileText)
        workoutsList = json.workouts || (Array.isArray(json) ? json : [])
        exercisesList = json.exercises || []
        profileData = json.profile || null
      }

      // 1. If exercises present in JSON and don't exist yet, add them
      if (Array.isArray(exercisesList) && exercisesList.length > 0) {
        const existingNames = new Set(exercises.map(e => e.name.toLowerCase()))
        for (const ex of exercisesList) {
          if (ex.name && !existingNames.has(ex.name.toLowerCase())) {
            try {
              await createExercise({
                name: ex.name,
                description: ex.description,
                type: ex.type,
                split: ex.split,
                bodyParts: ex.bodyParts,
                tags: ex.tags,
                level: ex.level,
              })
              existingNames.add(ex.name.toLowerCase())
            } catch (e) {
              console.warn("Could not import custom exercise:", ex.name, e)
            }
          }
        }
      }

      // 2. Filter / deduplicate workouts if mode is merge
      let toInsert = workoutsList
      if (mode === "merge") {
        const existingKeys = new Set(
          workouts.map(w => `${w.date}_${(w.time || "").slice(0, 5)}_${w.exerciseName.toLowerCase()}`)
        )
        toInsert = workoutsList.filter(
          w => !existingKeys.has(`${w.date}_${(w.time || "").slice(0, 5)}_${w.exerciseName.toLowerCase()}`)
        )
      }

      if (toInsert.length === 0) {
        setMessage("All workouts in this file already exist in your history. No new records added.")
        toast.info("No new workouts to import (all duplicates)")
        return
      }

      // 3. Perform bulk insert
      const count = await handleBulkInsert(toInsert)

      // 4. Save profile if provided
      if (profileData && profileData.name) {
        await saveProfile(profileData)
      }

      await Promise.all([refreshW(), refreshE(), refreshP()])
      setMessage(`Successfully imported ${count} workouts!`)
      toast.success(`Successfully imported ${count} workouts!`)
    } catch (err: any) {
      console.error("Import error:", err)
      setErrorDetails(err.message || "Failed to process import file.")
      toast.error(err.message || "Failed to import file")
    } finally {
      setIsProcessing(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  // Show loading while mounting
  if (!mounted) {
    return (
      <main className="pb-32 md:pb-12">
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
    <main className="pb-32 md:pb-12">
      <header className="mx-auto max-w-3xl px-4 pt-6">
        <h1 className="text-2xl font-semibold">Data Export / Import</h1>
        <p className="text-sm text-muted-foreground">Export your workout history or restore from a JSON or CSV backup.</p>
      </header>

      <section className="mx-auto grid max-w-3xl gap-4 px-4 pt-4">
        {/* Export Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <Download className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Export Your Data</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Download your full database backup including all workouts, sets, custom exercises, and personal goals.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              onClick={() => download(exportJSON(), `fitness-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>Export JSON (Complete Backup)</span>
            </button>
            <button
              onClick={() => download(exportCSV(), `workouts-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv")}
              className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV (Spreadsheet)</span>
            </button>
          </div>
        </div>

        {/* Import Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <Upload className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Import & Restore Data</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Import workouts from an existing JSON backup or standard CSV (supports exports from Fitness Tracker, Strong, and Hevy).
          </p>

          <div className="flex items-center gap-3">
            <label htmlFor="import-mode-select" className="text-xs font-medium text-muted-foreground">Import Mode:</label>
            <select
              id="import-mode-select"
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="rounded-lg border bg-card px-3 py-1.5 text-xs font-medium cursor-pointer"
            >
              <option value="merge">Merge (Skip existing duplicates)</option>
              <option value="replace">Add All (Import everything)</option>
            </select>
          </div>

          <div className="rounded-xl border border-dashed border-border/80 bg-secondary/30 p-6 text-center">
            <input
              ref={fileRef}
              type="file"
              accept=".json,.csv"
              disabled={isProcessing}
              className="hidden"
              id="file-upload"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const txt = await file.text()
                await importData(txt, file.name.toLowerCase())
              }}
            />
            <label
              htmlFor="file-upload"
              className={`inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-sm ${
                isProcessing ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Importing workouts...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Select JSON or CSV File</span>
                </>
              )}
            </label>
            <p className="text-[11px] text-muted-foreground mt-2">
              Supports .json and .csv files from this app, Hevy, or Strong.
            </p>
          </div>

          {message && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 flex items-center gap-2.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {errorDetails && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3.5 flex items-center gap-2.5 text-xs text-destructive font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorDetails}</span>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}