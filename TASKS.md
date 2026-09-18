# 📋 Fitness Tracker Master Task Checklist

> Yeh master task file hai. Har task complete hone ke baad `[x]` tick hoga.

---

## 🔴 Phase 1: Critical Bug Fixes (Data & Logic)
- [x] **Task 1.1:** Fix offline workout sync permanent 400 Bad Request (`userId` stripping in `src/hooks/use-local-data.ts` & `src/app/api/workouts/route.ts`)
- [x] **Task 1.2:** Fix Profile form wiping out saved data on load/save (`src/app/profile/page.tsx`)
- [x] **Task 1.3:** Fix Dashboard Overview card counting exercises instead of distinct workout sessions (`src/app/page.tsx`)
- [x] **Task 1.4:** Fix `window.location.reload()` on exercise drag & drop reorder (`src/app/workout/page.tsx`)
- [x] **Task 1.5:** Fix string vs number Exercise ID type matching across chart components (`src/components/charts/muscle-balance.tsx`)
- [x] **Task 1.6:** Remove error overlay suppression hack (`nextjs-portal` in `src/app/globals.css`)
- [x] **Task 1.7:** Fix SSR hydration mismatch on Exercises page (`src/app/exercises/page.tsx`)
- [x] **Task 1.8:** Fix hardcoded `isAdmin = true` bypass (`src/app/exercises/page.tsx`)
- [x] **Task 1.9:** Fix UTC date drift causing morning streak drops (`src/app/progress/page.tsx`)
- [x] **Task 1.10:** Fix rest timer multiple beeps per second glitch (`src/app/workout/page.tsx`)

---

## 📐 Phase 2: Navigation, Layout & Alignment Fixes
- [x] **Task 2.1:** Add Workout (`/workout`) and Profile (`/profile`) into Desktop and Mobile Bottom Navigation (`src/components/app-navigation.tsx`)
- [x] **Task 2.2:** Fix mobile bottom nav overlapping content by adding safe bottom padding (`pb-28 md:pb-12`) across all pages
- [x] **Task 2.3:** Fix floating rest timer bar overlapping mobile bottom nav (`src/app/workout/page.tsx`)
- [x] **Task 2.4:** Fix date filter range picker and view selector wrapping on small mobile screens (<375px) (`src/app/page.tsx`)
- [x] **Task 2.5:** Fix Recharts container sizing (`w-full min-w-0 overflow-hidden`) to stop mobile horizontal jitter
- [x] **Task 2.6:** Fix navigation bar scrollbar & clipping bug, remove scrollbar, enable instant client tab switching (`src/components/nav-segmented.tsx`, `src/components/app-navigation.tsx`)
- [x] **Task 2.7:** Move Export / Import functionality into Profile page (`src/app/profile/page.tsx`, `src/components/profile/data-backup.tsx`)

---

## 💾 Phase 3: Export/Import, Bulk API & Data Safety
- [x] **Task 3.1:** Create bulk workout insert API endpoint (`src/app/api/workouts/bulk/route.ts`)
- [x] **Task 3.2:** Fix JSON Import in `/export` to prevent duplicate workout entries and support custom exercises
- [x] **Task 3.3:** Add CSV Import capability (Strong / Hevy standard format support)

---

## 🚀 Phase 4: High-Value Features
- [x] **Task 4.1:** Add Barbell Plate Calculator utility inside Live Workout
- [x] **Task 4.2:** Add Estimated 1-Rep Max (1RM) display in exercise cards and logs
- [x] **Task 4.3:** Add Previous Workout Set Auto-Fill (Ghost values) for progressive overload
- [x] **Task 4.4:** Add Personal Record (PR) celebration visual badge on new records

---

## ⏱️ Phase 5: Timer & Duration-Based Exercise Tracking
- [x] **Task 5.1:** Update Personal Records chart (`src/components/charts/personal-records.tsx`) to track, sort, and display duration/time (e.g. `60s`, `1m 30s`) instead of reps for timer exercises.
- [x] **Task 5.2:** Update Progression Timeline (`src/components/charts/progression-timeline.tsx`) so timer milestone cards show `Achieved [time] [exercise]` instead of `Achieved 0 [exercise]`.
- [x] **Task 5.3:** Update Workout Heatmap hover tooltip (`src/components/charts/workout-heatmap.tsx`) to display `sets × time` (e.g. `3×60s`) for timer exercises.
- [x] **Task 5.4:** Update Workout Card (`src/components/today-workout-card.tsx`) and Edit Dialog (`src/components/workout/workout-edit-dialog.tsx`) to format and preserve timer sets without forcing 1 rep fallback.
- [x] **Task 5.5:** Update Active Session, Routines, and API (`src/hooks/use-local-data.ts`, `src/app/workout/page.tsx`, `src/app/workout/routines`, `src/app/api/workout-sessions/route.ts`) so adding a timer exercise initializes with duration (`timeSeconds: 30`) and saves duration as volume without reps.

---

## 🎨 Phase 6: Modern UI Overhaul & UX Precision
- [x] **Task 6.1:** Rest Timer dropdown selector (`30s`, `45s`, `60s`, `90s`, `120s`, `180s`, `240s`, `300s`, default `60s`), removing redundant text label and eliminating horizontal pill clutter.
- [x] **Task 6.2:** Zero Emojis compliance across the application (replaced `⏱️`, `🏋️`, `⏰`, `🎉` with Lucide icons).
- [x] **Task 6.3:** Fix timer pause-resume reset bug (resumes from paused seconds rather than wiping to 0).
- [x] **Task 6.4:** Redesign timer exercise play/pause buttons with sleek modern styling and eliminate harsh yellow/orange highlights.
- [x] **Task 6.5:** Implement dual Stopwatch (Count Up) and Goal Timer (Countdown) modes with automatic elapsed time saving when paused/stopped.
- [x] **Task 6.6:** Remove permanent cross `×` button from set rows; implement Desktop Right-Click and Mobile Long-Press Set Context Menu ("Remove Set", "Duplicate Set", Set Types).
- [x] **Task 6.7:** De-clutter `/workout` Routine Cards (bold routine name, clean subtitle, sleek Start button, and 3-dots menu).
- [x] **Task 6.8:** Modernize `+ New Routine` header button and fix routine creation/edit redirect back to `/workout`.
- [x] **Task 6.9:** Add Routine Full Overview modal and context menu options ("Full Overview", "Edit Routine", "Pin/Unpin", "Start Routine").
- [x] **Task 6.10:** Clean Exercise cards on `/exercises` (name with Level, Split, and Type badges directly beneath, no muscle subtitle).

---

## ⚡ Phase 7: Deep Audit Fixes & Advanced Fitness Tools
- [x] **Task 7.1:** Fix Routine Starting NaN Crash Risk with safe integer validation (`src/app/api/workout-sessions/route.ts`).
- [x] **Task 7.2:** Dynamic Period-Aware Radial Goals Targets & Distinct Days Counting (`src/components/charts/radial-goals-chart.tsx`, `src/app/progress/page.tsx`).
- [x] **Task 7.3:** Interactive BMI, BMR & Daily Calorie Target Calculator on Profile (`src/app/profile/page.tsx`).
- [x] **Task 7.4:** Fast Muscle/Split Filter Chips & Equipment Type Dropdown on Exercises (`src/app/exercises/page.tsx`).
- [x] **Task 7.5:** Native Next.js PWA Web App Manifest for mobile installation (`src/app/manifest.ts`).

---

## 🔥 Phase 8: Part 4, 5 & 6 Master Plan Implementations
- [x] **Task 8.1:** Dashboard Today's Plan card with 1-click Start/Resume and 7-day interactive calendar strip (`src/app/page.tsx`).
- [x] **Task 8.2:** Removed Top Personal Records (PRs) widget from Dashboard (`src/app/page.tsx`) for a clean, minimal layout.
- [x] **Task 8.3:** Live Workout Ghost Bar input placeholders and 1-Tap Copy previous set values (`src/components/workout/live-exercise-card.tsx`, `src/app/workout/page.tsx`).
- [x] **Task 8.4:** Live Workout Discard Confirmation safety modal replacing native alert/confirm (`src/app/workout/page.tsx`).
- [x] **Task 8.5:** Routine Cards Estimated Duration Badge (`~X min`) and Card Click Exercise Preview without auto-starting (`src/app/workout/page.tsx`).
- [x] **Task 8.6:** Profile Weight Unit Preference Toggle (`kg` vs `lbs`) with automatic conversion and persistence (`src/app/profile/page.tsx`).
- [x] **Task 8.7:** Big 3 Lifts (Bench, Squat, Deadlift) 1RM Strength Progression timeline chart with Epley formula and PR summary (`src/components/charts/strength-progression-chart.tsx`, `src/app/progress/page.tsx`).
- [x] **Task 8.8:** Smooth 3D Flip Animation for Muscle Anatomy Heatmap view switching between Front and Back (`src/components/charts/muscle-anatomy-map.tsx`).

---

## ⏱️ Phase 9: Workout Duration & Confirmation Modal Fixes
- [x] **Task 9.1:** Fix workout duration tracking and confirmation dialog time calculation (`src/hooks/use-local-data.ts`, `src/app/workout/page.tsx`, `src/components/workout/workout-confirmation-dialog.tsx`).
  - Switched `startedAt` generation from ambiguous local time string to standard UTC ISO format (`new Date().toISOString()`).
  - Added robust timestamp parsing with automatic fallback handling for timezone-shifted sessions.
  - Eliminated disconnected `timerStarted` / `timerStartTime` states and redundant secondary "Start" header button.
  - Bound live elapsed tracking directly to active session creation timestamp with a 1-second continuous tick.
  - Captured frozen duration snapshot on finish with smart fallback (~90s per completed set if duration < 60s).
  - Prevented confirmation dialog from re-initializing or overwriting manual edits on each parent tick.

---

## 📊 Phase 10: Heatmap Origin Alignment, Adaptive Span & Weekly Goals Colors
- [x] **Task 10.1:** Heatmap Start Date Alignment & Origin Positioning (`src/components/charts/workout-heatmap.tsx`, `src/app/progress/page.tsx`).
  - Aligned heatmap start to user's earliest workout date in "All" view so the first workout block appears right at the start (column 1), rather than 52 empty weeks away.
  - Auto-defaulted recently started users to "All" view with minimum 4-week starter month grid.
  - Fixed missing `range` dependency in `useMemo` so Span filter pills (`1 Mo`, `3 Mo`, `6 Mo`, `1 Yr`, `All`) instantly recompute.
- [x] **Task 10.2:** Dynamic Heatmap Cell Scaling & Layout Adaptation (`src/components/charts/workout-heatmap.tsx`).
  - Added adaptive cell sizing: large rounded squares (`h-8 w-8`) for 1 Mo, medium (`h-5.5 w-5.5`) for 3 Mo, compact (`h-3 w-3`) for 1 Yr.
  - Dynamically adjusted column widths, day labels, and month label offsets to match cell size.
  - Updated legend to display dynamic span days count (e.g. `28 Days`, `84 Days`, `All Time`).
  - Smart auto-scroll: short grids stay at start, long historical grids scroll to end.
- [x] **Task 10.3:** Weekly Goals & Targets Color Overhaul (`src/components/charts/radial-goals-chart.tsx`).
  - Replaced stark plain white `#ffffff` and harsh red/orange repetition with a cohesive 4-tier neon fitness palette:
    - **Workouts Frequency**: Electric Cyan (`#06b6d4`)
    - **Total Sets**: Emerald Mint (`#10b981`)
    - **Reps Volume**: Solar Amber (`#f59e0b`)
    - **Points Overload**: Neon Rose / Coral (`#f43f5e`)
  - Added glassmorphic translucent ring tracks (`rgba(255, 255, 255, 0.05)`) with rounded bar caps.
  - Updated center text and legend progress bars with matching glowing dots and dynamic period label.

---

## 🎨 Phase 11: Exact 5-Tier Red Intensity Scale on Muscle Map & Heatmap
- [x] **Task 11.1:** Revert `WorkoutHeatmap` (`src/components/charts/workout-heatmap.tsx`) back to original consistency grid themes (`flame`, `emerald`, `monochrome`).
- [x] **Task 11.2:** Implement exact 5-Tier Red Heatmap Scale + Pure Black No Workout in `MuscleAnatomyMap` (`src/components/charts/muscle-anatomy-map.tsx`) per user reference:
  - **Color Palette & Intensity Brackets:**
    1. **No Workout (0%):** Pure Black (`#000000`) with `#28282e` anatomical stroke contours
    2. **Very Low (0–10%):** `#FCD3D3` (Light Blush Pink)
    3. **Low (10–40%):** `#FE9997` (Soft Rose Coral)
    4. **Moderate (40–70%):** `#FD5F5F` (Vibrant Coral Red)
    5. **High (70–90%):** `#FE1E26` (Bright Flame Red / Scarlet)
    6. **Very High (90–100%):** `#840004` (Deep Crimson / Dark Burgundy Red)
  - **Dynamic SVG Fills & Mannequin Contrast:**
    - Active muscles filled with exact gradient colors based on volume percentage (`sets / maxSets`).
    - Unworked muscles and neutral anatomical elements set to pure black (`#000000`).
    - Container background styled with elevated dark graphite (`#0e0e12`) so the black mannequin silhouette and `#28282e` anatomical divider strokes are distinct and sharp.
    - Muscle borders delineated with dark `#28282e` strokes, hovered with `#FE1E26`, and selected with `#ffffff`.
  - **Clean UI & Activation Legend:**
    - Kept header focused with clean View Mode switcher (`Both Views`, `Front (Anterior)`, `Back (Posterior)`).
    - Activation Legend displays the pure black chip (`#000000` with `#3f3f46` border) labeled "No Workout" alongside the 5 percentage tiers.
    - Synchronized Heat Intensity Gauge in muscle inspector and Top Worked Muscle Groups bars with the exact 5 red shades.
