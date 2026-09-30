"use client"

import React, { useState } from "react"
import { Clock, Dumbbell, Calendar, ChevronRight } from "lucide-react"
import soundManager from "@/lib/sounds"
import { DetailBottomSheet } from "@/components/charts/detail-bottom-sheet"
import {
  type AggregatedWorkoutSession,
  formatDateDisplay,
  formatTimeDisplay,
} from "./workout-helpers"

interface HistoryCardProps {
  sessions: AggregatedWorkoutSession[]
}

export function HistoryCard({ sessions }: HistoryCardProps) {
  const [showAll, setShowAll] = useState(false)
  const [selectedSession, setSelectedSession] = useState<AggregatedWorkoutSession | null>(null)

  const displayedSessions = showAll ? sessions : sessions.slice(0, 4)

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header: Title + "View all" link */}
      <div className="flex items-center justify-between gap-3 pb-1 border-b border-zinc-800">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight font-display">
            History
          </h2>
          <p className="text-xs text-zinc-400 font-body mt-0.5">
            Past workouts & logged performance
          </p>
        </div>

        {sessions.length > 4 && (
          <button
            type="button"
            onClick={() => {
              soundManager.play("click", 0.2)
              setShowAll(!showAll)
            }}
            className="min-h-[44px] px-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 select-none"
          >
            <span>{showAll ? "Show less" : "View all"}</span>
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                showAll ? "rotate-90" : ""
              }`}
            />
          </button>
        )}
      </div>

      {/* Workout Cards List */}
      {displayedSessions.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <p className="text-sm font-medium text-zinc-400 font-body">No workouts recorded yet</p>
          <p className="text-xs text-zinc-500 font-body">
            Complete a workout session to see your historical performance.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => {
                soundManager.play("click", 0.2)
                setSelectedSession(session)
              }}
              className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 hover:bg-zinc-850 hover:border-zinc-700 active:bg-zinc-800 p-3.5 sm:p-4 min-h-[56px] transition-all cursor-pointer space-y-2 group"
            >
              {/* Top Row: Workout Name + Total Reps */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm sm:text-base font-semibold text-white font-body truncate group-hover:text-white transition-colors">
                  {session.name}
                </h3>
                <span className="text-xs sm:text-sm font-bold text-white font-display tabular-nums shrink-0">
                  {session.totalReps.toLocaleString()} reps
                </span>
              </div>

              {/* Bottom Row: Time + Date & Duration */}
              <div className="flex items-center justify-between text-xs text-zinc-400 font-body gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">
                    {session.time ? `${formatDateDisplay(session.date)} · ${formatTimeDisplay(session.time)}` : formatDateDisplay(session.date)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-zinc-300 font-display tabular-nums">
                  <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <span>{session.durationMin} min</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Bottom Sheet for Tapped Workout Card */}
      <DetailBottomSheet
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title={selectedSession?.name || "Workout Detail"}
        badge={`${selectedSession?.durationMin ?? 0} min`}
        subtitle={
          selectedSession
            ? selectedSession.time
              ? `${formatDateDisplay(selectedSession.date)} · ${formatTimeDisplay(selectedSession.time)}`
              : formatDateDisplay(selectedSession.date)
            : undefined
        }
      >
        {selectedSession && (
          <div className="space-y-4">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-mono block">Duration</span>
                <span className="text-sm font-bold text-white font-display tabular-nums">
                  {selectedSession.durationMin}m
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-mono block">Reps</span>
                <span className="text-sm font-bold text-white font-display tabular-nums">
                  {selectedSession.totalReps}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-mono block">Sets</span>
                <span className="text-sm font-bold text-white font-display tabular-nums">
                  {selectedSession.totalSets}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-mono block">Points</span>
                <span className="text-sm font-bold text-white font-display tabular-nums">
                  {selectedSession.points}
                </span>
              </div>
            </div>

            {/* Exercises List */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                Exercises ({selectedSession.exercises.length})
              </span>
              <div className="space-y-1.5">
                {selectedSession.exercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white font-body truncate">{ex.name}</div>
                      {ex.notes && (
                        <div className="text-[11px] text-zinc-400 font-body mt-0.5 truncate">
                          {ex.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="font-display font-semibold text-white tabular-nums">
                        {ex.sets} {ex.sets === 1 ? "set" : "sets"}
                      </span>
                      {ex.reps > 0 && (
                        <span className="text-zinc-400 font-display tabular-nums ml-1">
                          · {ex.reps} reps
                        </span>
                      )}
                      {ex.timeSeconds && ex.timeSeconds > 0 && (
                        <span className="text-zinc-400 font-display tabular-nums ml-1">
                          · {ex.timeSeconds}s
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DetailBottomSheet>
    </div>
  )
}
