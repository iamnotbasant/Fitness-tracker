import type { Exercise, Workout, Profile } from "./types"

export const sampleExercises: Exercise[] = [
  { id: "ex-pullups", name: "Pull-ups" },
  { id: "ex-pushups", name: "Push-ups" },
  { id: "ex-squats", name: "Bodyweight Squats" },
  { id: "ex-dips", name: "Dips" },
]

// No fake workouts - only real user workouts will be shown
export const sampleWorkouts: Workout[] = []

export const sampleProfile: Profile = {
  name: "Athlete",
  heightCm: 175,
  weightKg: 70,
  goalType: "strength",
  goals: [
    { exerciseId: "ex-pullups", targetReps: 15 },
    { exerciseId: "ex-pushups", targetReps: 50 },
  ],
}