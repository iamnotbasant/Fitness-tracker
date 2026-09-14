# Calisthenics Fitness Tracker

A private, offline-first fitness tracker focused on calisthenics. Built with Next.js (App Router), Tailwind, SWR, Recharts, and Framer Motion. Data is stored in your browser via localStorage — no login or backend.

## Features
- Workout logging (date, time, exercise, sets, reps, rest, notes). Auto-calculates volume.
- Dashboard with today summary, quick add, recent workouts, and last 7 days chart.
- Progress with exercise/date filters, weekly volume chart, and best performance per exercise.
- Profile with user info and target goals (e.g., 15 pull-ups).
- Data export/import (JSON export/import, CSV export).
- Mobile-first UI with a simple bottom nav.

## Run
- Open the v0 preview. Dependencies are auto-inferred.
- Use the Publish or Download ZIP options in v0 for deployment or local use.

## Notes
- First load seeds mock data (4–5 workouts and common exercises).
- Data persists in localStorage and updates automatically on each change.
- Import supports JSON exports produced by this app. CSV is export-only.

## Next ideas
- Reminders (local notifications)
- Goal alerts when nearing targets
- Streaks and habit tracking
- AI workout suggestions using the Vercel AI SDK
