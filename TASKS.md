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


