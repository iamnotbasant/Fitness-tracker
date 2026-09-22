import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workouts, exercises, user } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';

import { calculateWorkoutPoints, parseExerciseLevel } from '@/lib/points';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Remove userId check - allow any authenticated user to view any workout
    const workout = await db
      .select()
      .from(workouts)
      .where(eq(workouts.id, parseInt(id)))
      .limit(1);

    if (workout.length === 0) {
      return NextResponse.json(
        { error: 'Workout not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Add total_points to response
    const workoutWithTotalPoints = {
      ...workout[0],
      total_points: (workout[0].points || 0) + (workout[0].bonusPoints || 0)
    };

    return NextResponse.json(workoutWithTotalPoints, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json(
        {
          error: 'User ID cannot be provided in request body',
          code: 'USER_ID_NOT_ALLOWED',
        },
        { status: 400 }
      );
    }

    // Remove userId check - allow any authenticated user to edit any workout
    const existingWorkout = await db
      .select()
      .from(workouts)
      .where(eq(workouts.id, parseInt(id)))
      .limit(1);

    if (existingWorkout.length === 0) {
      return NextResponse.json(
        { error: 'Workout not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    const { date, time, exerciseId, exerciseName, sets, reps, rest, notes, bonusPoints, timeSeconds, weight, durationSeconds } = body;

    // Track if we need to recalculate points
    let needsRecalculation = false;
    let newReps = existingWorkout[0].reps;
    let newTimeSeconds = existingWorkout[0].timeSeconds;
    let newWeight = existingWorkout[0].weight;
    let newExerciseId = existingWorkout[0].exerciseId;

    if (date !== undefined) updateData.date = date;
    if (time !== undefined) updateData.time = time;
    
    if (exerciseId !== undefined) {
      updateData.exerciseId = exerciseId;
      newExerciseId = exerciseId;
      needsRecalculation = true;
    }

    if (exerciseName !== undefined) updateData.exerciseName = exerciseName;

    if (sets !== undefined) updateData.sets = sets;

    if (reps !== undefined) {
      updateData.reps = reps;
      newReps = reps;
      needsRecalculation = true;
    }

    if (rest !== undefined) updateData.rest = rest;
    if (notes !== undefined) updateData.notes = notes;

    if (bonusPoints !== undefined) {
      updateData.bonusPoints = bonusPoints;
    }

    if (timeSeconds !== undefined) {
      updateData.timeSeconds = timeSeconds;
      newTimeSeconds = timeSeconds;
      needsRecalculation = true;
    }

    if (weight !== undefined) {
      updateData.weight = weight;
      newWeight = weight;
      needsRecalculation = true;
    }

    if (durationSeconds !== undefined) updateData.durationSeconds = durationSeconds;

    // Recalculate points if necessary
    if (needsRecalculation) {
      const targetExerciseId = newExerciseId ?? existingWorkout[0].exerciseId;
      let exerciseType: string | null = null;
      let exerciseLevel: number = existingWorkout[0].exerciseLevel || 1;

      if (targetExerciseId) {
        const exerciseRecord = await db.select()
          .from(exercises)
          .where(eq(exercises.id, targetExerciseId))
          .limit(1);

        if (exerciseRecord.length > 0) {
          exerciseType = exerciseRecord[0].type;
          exerciseLevel = parseExerciseLevel(exerciseRecord[0].level);
        }
      }

      const finalTimeSeconds = newTimeSeconds !== null && newTimeSeconds !== undefined ? newTimeSeconds : existingWorkout[0].timeSeconds;
      const finalWeight = newWeight !== null && newWeight !== undefined ? newWeight : existingWorkout[0].weight;
      const finalReps = newReps !== null && newReps !== undefined ? newReps : existingWorkout[0].reps;
      const finalSets = sets !== undefined ? sets : existingWorkout[0].sets;
      const finalBonus = bonusPoints !== undefined ? bonusPoints : existingWorkout[0].bonusPoints;

      if (!exerciseType) {
        if (finalTimeSeconds && finalTimeSeconds > 0) exerciseType = 'timer';
        else if (finalWeight && finalWeight > 0) exerciseType = 'weighted';
        else exerciseType = 'standard';
      }

      const { points: recalculatedPoints } = calculateWorkoutPoints({
        exerciseType,
        sets: finalSets,
        reps: finalReps,
        timeSeconds: finalTimeSeconds,
        weight: finalWeight,
        level: exerciseLevel,
        bonusPoints: finalBonus,
      });

      updateData.points = recalculatedPoints;
      updateData.exerciseLevel = exerciseLevel;
    }

    // Remove userId check from update - allow any authenticated user to edit
    const updated = await db
      .update(workouts)
      .set(updateData)
      .where(eq(workouts.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Workout not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Add total_points to response
    const workoutWithTotalPoints = {
      ...updated[0],
      total_points: (updated[0].points || 0) + (updated[0].bonusPoints || 0)
    };

    return NextResponse.json(workoutWithTotalPoints, { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Remove userId check - allow any authenticated user to delete any workout
    const existingWorkout = await db
      .select()
      .from(workouts)
      .where(eq(workouts.id, parseInt(id)))
      .limit(1);

    if (existingWorkout.length === 0) {
      return NextResponse.json(
        { error: 'Workout not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Remove userId check from delete - allow any authenticated user to delete
    const deleted = await db
      .delete(workouts)
      .where(eq(workouts.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Workout not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Workout deleted successfully',
        workout: deleted[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}