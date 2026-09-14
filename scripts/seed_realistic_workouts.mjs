import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:local.db' });

async function seedRealisticWorkouts() {
  console.log('Seeding realistic workout data across the past 6 months...');

  // Clear existing workouts
  await client.execute('DELETE FROM workouts');

  const userId = 'user_1';
  const workoutsToInsert = [];

  // Exercises mapping
  const pushExercises = [
    { id: 23, name: 'Push Ups', baseSets: 4, baseReps: 15, level: 2 },
    { id: 30, name: 'Dips', baseSets: 3, baseReps: 12, level: 3 },
    { id: 17, name: 'Incline Push-ups', baseSets: 3, baseReps: 14, level: 1 },
    { id: 32, name: 'Pike Push-ups', baseSets: 3, baseReps: 10, level: 3 },
    { id: 25, name: 'Chair Dips', baseSets: 3, baseReps: 12, level: 2 },
  ];

  const pullExercises = [
    { id: 29, name: 'Pull Ups', baseSets: 4, baseReps: 8, level: 3 },
    { id: 28, name: 'Chin-ups', baseSets: 3, baseReps: 10, level: 2 },
    { id: 26, name: 'Bicep Curls', baseSets: 4, baseReps: 12, level: 2 },
    { id: 18, name: 'Bar Hang', baseSets: 3, baseReps: 35, level: 1 },
  ];

  const legExercises = [
    { id: 19, name: 'Bodyweight Squats', baseSets: 4, baseReps: 22, level: 1 },
    { id: 33, name: 'Bulgarian Split Squats', baseSets: 3, baseReps: 12, level: 3 },
    { id: 24, name: 'Walking Lunges', baseSets: 3, baseReps: 16, level: 2 },
    { id: 31, name: 'Jump Squats', baseSets: 3, baseReps: 15, level: 2 },
    { id: 20, name: 'Glute Bridges', baseSets: 3, baseReps: 18, level: 1 },
  ];

  const coreExercises = [
    { id: 21, name: 'Plank Hold', baseSets: 3, baseReps: 60, level: 1 },
    { id: 22, name: 'Mountain Climbers', baseSets: 3, baseReps: 30, level: 2 },
  ];

  // Current anchor date (today: 2026-09-12)
  const today = new Date();
  const daysBack = 180; // 6 months

  for (let i = daysBack; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    // Realistic routine schedule:
    // Mon (1): Push
    // Tue (2): Pull
    // Wed (3): Core / Mobility
    // Thu (4): Rest
    // Fri (5): Legs
    // Sat (6): Upper / Full
    // Sun (0): Rest

    let dayCategory = null;
    if (dayOfWeek === 1) dayCategory = 'push';
    else if (dayOfWeek === 2) dayCategory = 'pull';
    else if (dayOfWeek === 3) dayCategory = 'core';
    else if (dayOfWeek === 5) dayCategory = 'legs';
    else if (dayOfWeek === 6) dayCategory = Math.random() > 0.3 ? 'push_pull' : 'legs';
    else if (Math.random() > 0.75) dayCategory = 'core'; // occasional Sunday workout

    if (!dayCategory) continue;

    // Progression multiplier over time (from 0.8 at 180 days ago to 1.35 now)
    const progressFactor = 0.8 + (1 - i / daysBack) * 0.55;

    let exercisesForDay = [];
    if (dayCategory === 'push') {
      exercisesForDay = [pushExercises[0], pushExercises[1], pushExercises[2]];
      if (Math.random() > 0.4) exercisesForDay.push(pushExercises[3]);
    } else if (dayCategory === 'pull') {
      exercisesForDay = [pullExercises[0], pullExercises[1], pullExercises[2]];
      if (Math.random() > 0.3) exercisesForDay.push(pullExercises[3]);
    } else if (dayCategory === 'legs') {
      exercisesForDay = [legExercises[0], legExercises[1], legExercises[2]];
      if (Math.random() > 0.4) exercisesForDay.push(legExercises[3]);
    } else if (dayCategory === 'core') {
      exercisesForDay = [coreExercises[0], coreExercises[1]];
      if (Math.random() > 0.5) exercisesForDay.push(pushExercises[0]); // bonus pushups
    } else if (dayCategory === 'push_pull') {
      exercisesForDay = [pushExercises[0], pullExercises[0], pushExercises[1], pullExercises[1]];
    }

    const startHour = 17 + Math.floor(Math.random() * 3); // 17:00 to 19:00
    let currentMinute = Math.floor(Math.random() * 20);

    for (const ex of exercisesForDay) {
      const sets = ex.baseSets;
      const reps = Math.round(ex.baseReps * progressFactor * (0.9 + Math.random() * 0.2));
      const points = Math.round(reps * ex.level * (sets * 0.5));
      
      const hour = startHour + Math.floor(currentMinute / 60);
      const min = currentMinute % 60;
      const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      currentMinute += 15;

      workoutsToInsert.push({
        userId,
        date: dateStr,
        time: timeStr,
        exerciseId: ex.id,
        exerciseName: ex.name,
        sets,
        reps,
        points,
        bonusPoints: reps > ex.baseReps * 1.2 ? 15 : 0,
        exerciseLevel: ex.level,
        rest: 60,
        notes: i < 7 ? `Felt strong! High intensity session.` : null
      });
    }
  }

  console.log(`Inserting ${workoutsToInsert.length} realistic workout entries...`);

  // Batch insert
  for (const w of workoutsToInsert) {
    const timestampMs = Math.floor(new Date(`${w.date}T12:00:00Z`).getTime());
    await client.execute({
      sql: `INSERT INTO workouts (user_id, date, time, exercise_id, exercise_name, sets, reps, points, bonus_points, exercise_level, rest, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [w.userId, w.date, w.time, w.exerciseId, w.exerciseName, w.sets, w.reps, w.points, w.bonusPoints, w.exerciseLevel, w.rest, w.notes, timestampMs]
    });
  }

  console.log('✅ Realistic workouts successfully seeded!');
}

seedRealisticWorkouts().catch((err) => {
  console.error('Error seeding realistic workouts:', err);
  process.exit(1);
});
