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
