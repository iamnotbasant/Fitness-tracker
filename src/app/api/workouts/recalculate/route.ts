import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workouts, exercises } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { calculateWorkoutPoints, parseExerciseLevel } from '@/lib/points';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 1. Fetch all workouts for current user - NEVER deletes any data
    const userWorkouts = await db
      .select()
      .from(workouts)
      .where(eq(workouts.userId, currentUser.id));

    if (userWorkouts.length === 0) {
      return NextResponse.json({
        updatedCount: 0,
        message: 'No workouts found to recalculate',
      });
    }

    // 2. Fetch all exercises for fast level/type lookup
    const allExercises = await db.select().from(exercises);
    const exerciseMap = new Map<number, { type: string | null; level: any }>();
    allExercises.forEach((e) => {
      exerciseMap.set(e.id, { type: e.type, level: e.level });
    });

    let updatedCount = 0;

    // 3. Recalculate balanced points safely without deleting anything
    for (const w of userWorkouts) {
      const exMeta = w.exerciseId ? exerciseMap.get(w.exerciseId) : null;
      const exType = exMeta?.type || (w.timeSeconds ? 'timer' : w.weight ? 'weighted' : 'standard');
      const exLevel = exMeta?.level ? parseExerciseLevel(exMeta.level) : (w.exerciseLevel || 1);

      const { points: newPoints } = calculateWorkoutPoints({
        exerciseType: exType,
        sets: w.sets || 1,
        reps: w.reps || 0,
        timeSeconds: w.timeSeconds || null,
        weight: w.weight || null,
        level: exLevel,
        bonusPoints: w.bonusPoints || 0,
      });

      // Only update if points differ
      if (w.points !== newPoints) {
        await db
          .update(workouts)
          .set({ points: newPoints })
          .where(eq(workouts.id, w.id));
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      totalWorkouts: userWorkouts.length,
      updatedCount,
      message: `Successfully normalized ${updatedCount} workouts to the balanced points system. All workout data was preserved.`,
    });
  } catch (error) {
    console.error('Points recalculation error:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate points: ' + error },
      { status: 500 }
    );
  }
}
