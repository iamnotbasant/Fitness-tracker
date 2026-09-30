/**
 * Analytics v4 Design System & Color Palette
 *
 * Muted, desaturated, eye-friendly palette tailored for dark theme.
 * BANNED: neon yellow, lime green, bright orange, garish gold, rainbow clutter.
 *
 * Surfaces & Neutral Text:
 * - Base Surface:      #09090b (pitch near-black root)
 * - Card Surface:      #121216 (dark slate-zinc card background)
 * - Card Border:       rgba(255, 255, 255, 0.08)
 * - Control Well:      #0c0c10 (inner toggle / input container)
 * - Primary Text:      #f4f4f5 (zinc-100 headings / hero numbers)
 * - Secondary Text:    #a1a1aa (zinc-400 subtitles / labels)
 * - Muted Text:        #71717a (zinc-500 captions / inactive ticks)
 * - Subtle Border:     #27272a (zinc-800 borders / dividers)
 *
 * ONE Calm Accent:
 * - Calm Teal:         #4fa8a0 (calm desaturated teal)
 * - Calm Teal Hover:   #5cb8af
 * - Calm Teal Highlight:#7ecec7
 * - Calm Teal Subtle:  rgba(79, 168, 160, 0.12)
 * - Calm Teal Border:  rgba(79, 168, 160, 0.35)
 *
 * Heatmap 5-Tier Scale (Calm Desaturated Teal Ramp):
 * - Level 0 (0 sets):  #141418 (border #222228)
 * - Level 1 (Low):     #192928 (border #243e3c)
 * - Level 2 (Med-Low): #20413e (border #2d5e5a)
 * - Level 3 (Med-High):#2d605c (border #3f8580)
 * - Level 4 (High):    #4fa8a0 (border #6ac2b9)
 *
 * Per-Muscle Muted Category Hues (Low-Saturation, Distinguishable, No Neon):
 * - Push (Chest, Shoulders):               #5e769e (Slate Indigo)
 * - Pull (Lats, Traps, Lower Back, Neck):  #4fa8a0 (Calm Teal)
 * - Legs (Quads, Glutes, Hamstrings, Calves, Adductors): #856a88 (Muted Heather / Plum)
 * - Core (Abdominals, Obliques):           #5b806d (Muted Sage Green)
 * - Arms (Biceps, Triceps, Forearms):      #947b67 (Warm Sandstone / Taupe)
 */

export const ANALYTICS_PALETTE = {
  surfaces: {
    base: "#09090b",
    card: "#121216",
    cardBorder: "rgba(255, 255, 255, 0.08)",
    well: "#0c0c10",
    divider: "rgba(255, 255, 255, 0.07)",
  },
  text: {
    primary: "#f4f4f5",
    secondary: "#a1a1aa",
    muted: "#71717a",
  },
  accent: {
    primary: "#4fa8a0",
    hover: "#5cb8af",
    highlight: "#7ecec7",
    subtleBg: "rgba(79, 168, 160, 0.12)",
    border: "rgba(79, 168, 160, 0.35)",
  },
  heatmap: {
    level0: { bg: "#141418", border: "#222228" },
    level1: { bg: "#192928", border: "#243e3c" },
    level2: { bg: "#20413e", border: "#2d5e5a" },
    level3: { bg: "#2d605c", border: "#3f8580" },
    level4: { bg: "#4fa8a0", border: "#6ac2b9" },
  },
  muscleCategories: {
    push: {
      label: "Push",
      hex: "#5e769e",
      stroke: "#7b93ba",
      subtleBg: "rgba(94, 118, 158, 0.15)",
    },
    pull: {
      label: "Pull",
      hex: "#4fa8a0",
      stroke: "#6fc4bc",
      subtleBg: "rgba(79, 168, 160, 0.15)",
    },
    legs: {
      label: "Legs",
      hex: "#856a88",
      stroke: "#a58ba8",
      subtleBg: "rgba(133, 106, 136, 0.15)",
    },
    core: {
      label: "Core",
      hex: "#5b806d",
      stroke: "#779e89",
      subtleBg: "rgba(91, 128, 109, 0.15)",
    },
    arms: {
      label: "Arms",
      hex: "#947b67",
      stroke: "#b39a86",
      subtleBg: "rgba(148, 123, 103, 0.15)",
    },
  },
} as const

export type MuscleCategoryKey = keyof typeof ANALYTICS_PALETTE.muscleCategories

export const MUSCLE_CATEGORY_MAP: Record<string, MuscleCategoryKey> = {
  chest: "push",
  shoulders: "push",
  traps: "pull",
  lats: "pull",
  "lower back": "pull",
  neck: "pull",
  quads: "legs",
  glutes: "legs",
  hamstrings: "legs",
  calves: "legs",
  adductors: "legs",
  core: "core",
  obliques: "core",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
}

/**
 * Return category styling for any muscle key
 */
export function getMuscleCategoryConfig(muscleKey: string) {
  const catKey = MUSCLE_CATEGORY_MAP[muscleKey] || "core"
  return ANALYTICS_PALETTE.muscleCategories[catKey]
}
