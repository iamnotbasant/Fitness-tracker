import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:local.db' });

async function seedCleanRoutines() {
  await client.execute({
    sql: 'DELETE FROM routines WHERE user_id = ?',
    args: ['user_1']
  });

  const routines = [
    {
      name: 'Push - Level 1',
      description: 'Beginner push routine',
      exercises: [
        { exerciseId: '17', exerciseName: 'Incline Push-ups', split: 'push', level: 1, defaultSets: 3, defaultReps: 10, restSec: 60 },
        { exerciseId: '21', exerciseName: 'Plank Hold', split: 'core', level: 1, defaultSets: 3, defaultReps: 30, restSec: 45 }
      ]
    },
    {
      name: 'Pull - Level 1',
      description: 'Beginner pull & grip routine',
      exercises: [
        { exerciseId: '18', exerciseName: 'Bar Hang', split: 'pull', level: 1, defaultSets: 3, defaultReps: 30, restSec: 60 },
        { exerciseId: '26', exerciseName: 'Bicep Curls', split: 'pull', level: 2, defaultSets: 3, defaultReps: 12, restSec: 45 }
      ]
    },
    {
      name: 'Legs - Level 1',
      description: 'Beginner lower body routine',
      exercises: [
        { exerciseId: '19', exerciseName: 'Bodyweight Squats', split: 'legs', level: 1, defaultSets: 3, defaultReps: 15, restSec: 60 },
        { exerciseId: '20', exerciseName: 'Glute Bridges', split: 'legs', level: 1, defaultSets: 3, defaultReps: 15, restSec: 45 }
      ]
    },
    {
      name: 'Push - Level 2',
      description: 'Intermediate chest & triceps routine',
      exercises: [
        { exerciseId: '23', exerciseName: 'Push Ups', split: 'push', level: 2, defaultSets: 4, defaultReps: 12, restSec: 60 },
        { exerciseId: '25', exerciseName: 'Chair Dips', split: 'push', level: 2, defaultSets: 3, defaultReps: 12, restSec: 60 },
        { exerciseId: '32', exerciseName: 'Pike Push-ups', split: 'push', level: 3, defaultSets: 3, defaultReps: 8, restSec: 60 }
      ]
    },
    {
      name: 'Pull - Level 2',
      description: 'Intermediate back & biceps routine',
      exercises: [
        { exerciseId: '29', exerciseName: 'Pull Ups', split: 'pull', level: 3, defaultSets: 3, defaultReps: 6, restSec: 90 },
        { exerciseId: '28', exerciseName: 'Chin-ups', split: 'pull', level: 3, defaultSets: 3, defaultReps: 6, restSec: 90 },
        { exerciseId: '26', exerciseName: 'Bicep Curls', split: 'pull', level: 2, defaultSets: 3, defaultReps: 12, restSec: 60 }
      ]
    },
    {
      name: 'Legs - Level 2',
      description: 'Intermediate legs & glutes routine',
      exercises: [
        { exerciseId: '24', exerciseName: 'Walking Lunges', split: 'legs', level: 2, defaultSets: 3, defaultReps: 12, restSec: 60 },
        { exerciseId: '33', exerciseName: 'Bulgarian Split Squats', split: 'legs', level: 3, defaultSets: 3, defaultReps: 10, restSec: 60 },
        { exerciseId: '31', exerciseName: 'Jump Squats', split: 'legs', level: 3, defaultSets: 3, defaultReps: 12, restSec: 60 }
      ]
    }
  ];

  for (const r of routines) {
    await client.execute({
      sql: 'INSERT INTO routines (user_id, name, description, exercises, created_at) VALUES (?, ?, ?, ?, ?)',
      args: ['user_1', r.name, r.description, JSON.stringify(r.exercises), Math.floor(Date.now() / 1000)]
    });
  }
  console.log('Clean Level 1 and Level 2 routines seeded successfully!');
}

seedCleanRoutines().catch(console.error);
