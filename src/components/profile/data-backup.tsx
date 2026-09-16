"use client"

import { useState, useRef } from "react"
import { useWorkouts, useExercises, useProfile } from "@/hooks/use-local-data"
import { toast } from "sonner"
import { Download, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Database } from "lucide-react"

export function DataBackup() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [mode, setMode] = useState<"merge" | "replace">("merge")
  const { workouts, refresh: refreshW } = useWorkouts()
  const { exercises, create: createExercise, refresh: refreshE } = useExercises()
  const { profile, save: saveProfile, refresh: refreshP } = useProfile()
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<string>("")
  const [errorDetails, setErrorDetails] = useState<string>("")

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
          result.push(cur.trim())
        }
      }
      result.push(cur.trim())
      return result
    }

    const header = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
    
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

      let normalizedDate = rawDate
      if (rawDate && rawDate.includes("/")) {
        const parts = rawDate.split("/")
        if (parts.length === 3) {
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
        workoutsList = parseCSV(fileText)
        if (workoutsList.length === 0) {
          throw new Error("No valid workout rows could be parsed from the CSV file.")
        }
      } else {
        const json = JSON.parse(fileText)
        workoutsList = json.workouts || (Array.isArray(json) ? json : [])
        exercisesList = json.exercises || []
        profileData = json.profile || null
      }

      // 1. If custom exercises are present in JSON and don't exist yet, add them
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

  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-2.5 pb-1 border-b">
        <Database className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Data Backup & Restore</h2>
          <p className="text-xs text-muted-foreground">
            Export your complete workout data or restore from a JSON / CSV file.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 pt-2">
        {/* Export Column */}
        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-secondary/20 p-4 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Download className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Export Workouts</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Download your full database backup including all workouts, sets, custom exercises, and personal goals.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={() => download(exportJSON(), `fitness-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Export JSON (Complete)</span>
            </button>
            <button
              type="button"
              onClick={() => download(exportCSV(), `workouts-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-3.5 py-2 text-xs font-semibold hover:bg-secondary/80 transition-colors cursor-pointer border"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Import Column */}
        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-secondary/20 p-4 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Upload className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Import & Restore</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports .json backups and .csv exports from Fitness Tracker, Strong, or Hevy.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <label htmlFor="profile-import-mode" className="text-xs text-muted-foreground whitespace-nowrap">Mode:</label>
              <select
                id="profile-import-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="w-full rounded-md border bg-card px-2.5 py-1 text-xs font-medium cursor-pointer"
              >
                <option value="merge">Merge (Skip duplicates)</option>
                <option value="replace">Add All (Import everything)</option>
              </select>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".json,.csv"
              disabled={isProcessing}
              className="hidden"
              id="profile-file-upload"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const txt = await file.text()
                await importData(txt, file.name.toLowerCase())
              }}
            />
            <label
              htmlFor="profile-file-upload"
              className={`w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs ${
                isProcessing ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Importing workouts...</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  <span>Select JSON or CSV File</span>
                </>
              )}
            </label>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-center gap-2.5 text-xs text-emerald-400 font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {errorDetails && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex items-center gap-2.5 text-xs text-destructive font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorDetails}</span>
        </div>
      )}
    </div>
  )
}
