import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workouts, exercises, user } from '@/db/schema';
import { eq, and, like, or, gte, lte, desc } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';

// Helper function to calculate points based on exercise type
function calculatePoints(
  exerciseType: string | null,
  reps: number,
  timeSeconds: number | null,
  weight: number | null,
  level: number
): number {
  const exerciseLevel = level || 1;

  if (exerciseType === 'timer') {
    // Points = (timeSeconds ÷ 5) × level
    const seconds = timeSeconds || 0;
    return Math.round((seconds / 5) * exerciseLevel);
  } else if (exerciseType === 'weighted') {
    // Points = (weight × reps × 1) × level
    const w = weight || 0;
    return Math.round((w * reps * 1) * exerciseLevel);
  } else {
    // bodyweight or standard: Points = (reps × 1) × level
    return Math.round((reps * 1) * exerciseLevel);
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10000');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Remove userId check - allow any authenticated user to view all workouts
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(workouts.exerciseName, `%${search}%`),
          like(workouts.notes, `%${search}%`)
        )!
      );
    }

    if (date) {
      conditions.push(eq(workouts.date, date));
    }

    if (startDate) {
      conditions.push(gte(workouts.date, startDate));
    }

    if (endDate) {
      conditions.push(lte(workouts.date, endDate));
    }

    const results = await db.select()
      .from(workouts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(workouts.date))
      .limit(limit)
      .offset(offset);

    // Add total_points to response
    const workoutsWithTotalPoints = results.map(workout => ({
      ...workout,
      total_points: (workout.points || 0) + (workout.bonusPoints || 0)
    }));

    return NextResponse.json({ workouts: workoutsWithTotalPoints }, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const body = await request.json();

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Remove 'id' from body if accidentally included
    if ('id' in body) {
      delete body.id;
    }

    const { date, time, exerciseId, exerciseName, sets, reps, rest, notes, bonusPoints, timeSeconds, weight, durationSeconds } = body;

    if (!date) {
      return NextResponse.json({ 
        error: "Date is required",
        code: "MISSING_DATE" 
      }, { status: 400 });
    }

    if (!exerciseName || typeof exerciseName !== 'string' || exerciseName.trim() === '') {
      return NextResponse.json({ 
        error: "Exercise name is required",
        code: "MISSING_EXERCISE_NAME" 
      }, { status: 400 });
    }

    if (!sets || typeof sets !== 'number' || sets <= 0) {
      return NextResponse.json({ 
        error: "Valid number of sets is required",
        code: "INVALID_SETS" 
      }, { status: 400 });
    }

    const isTimeBased = timeSeconds !== undefined && timeSeconds > 0;
    
    if (!isTimeBased && (!reps || typeof reps !== 'number' || reps <= 0)) {
      return NextResponse.json({ 
        error: "Valid number of reps is required",
        code: "INVALID_REPS" 
      }, { status: 400 });
    }

    // Fetch exercise details if exerciseId provided
    let exerciseType: string | null = 'standard';
    let exerciseLevel: number = 1;

    if (exerciseId) {
      const exerciseRecord = await db.select()
        .from(exercises)
        .where(eq(exercises.id, exerciseId))
        .limit(1);

      if (exerciseRecord.length > 0) {
        exerciseType = exerciseRecord[0].type;
        // Parse level if it's a string like "beginner", "intermediate", "advanced"
        const levelStr = exerciseRecord[0].level;
        if (levelStr === 'beginner') exerciseLevel = 1;
        else if (levelStr === 'intermediate') exerciseLevel = 2;
        else if (levelStr === 'advanced') exerciseLevel = 3;
        else if (typeof levelStr === 'number') exerciseLevel = levelStr;
      }
    }

    // Calculate points
    const calculatedPoints = calculatePoints(
      exerciseType,
      reps || 1,
      timeSeconds || null,
      weight || null,
      exerciseLevel
    );

    // Create insert object explicitly without undefined values
    const insertValues: any = {
      userId: currentUser.id,
      date: date.trim(),
      exerciseName: exerciseName.trim(),
      sets,
      reps: reps || 1,
      points: calculatedPoints,
      exerciseLevel: exerciseLevel,
      createdAt: new Date(),
    };

    // Add optional fields only if defined and not null
    if (time) insertValues.time = time.trim();
    if (exerciseId) insertValues.exerciseId = exerciseId;
    if (rest !== undefined && rest !== null) insertValues.rest = rest;
    if (notes) insertValues.notes = notes.trim();
    if (bonusPoints !== undefined && bonusPoints !== null) insertValues.bonusPoints = bonusPoints;
    if (timeSeconds !== undefined && timeSeconds !== null) insertValues.timeSeconds = timeSeconds;
    if (weight !== undefined && weight !== null) insertValues.weight = weight;
    if (durationSeconds !== undefined && durationSeconds !== null) insertValues.durationSeconds = durationSeconds;

    const newWorkout = await db.insert(workouts)
      .values(insertValues)
      .returning();

    // Add total_points to response
    const workoutWithTotalPoints = {
      ...newWorkout[0],
      total_points: (newWorkout[0].points || 0) + (newWorkout[0].bonusPoints || 0)
    };

    return NextResponse.json(workoutWithTotalPoints, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const existing = await db.select()
      .from(workouts)
      .where(and(eq(workouts.id, parseInt(id)), eq(workouts.userId, currentUser.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Workout not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    const { date, time, exerciseId, exerciseName, sets, reps, rest, notes, bonusPoints, timeSeconds, weight, durationSeconds } = body;

    const updates: any = {};

    // Track if we need to recalculate points
    let needsRecalculation = false;
    let newReps = existing[0].reps;
    let newTimeSeconds = existing[0].timeSeconds;
    let newWeight = existing[0].weight;
    let newExerciseId = existing[0].exerciseId;

    if (date !== undefined) updates.date = date.trim();
    if (time !== undefined) updates.time = time ? time.trim() : null;
    
    if (exerciseId !== undefined) {
      updates.exerciseId = exerciseId || null;
      newExerciseId = exerciseId;
      needsRecalculation = true;
    }

    if (exerciseName !== undefined) {
      if (!exerciseName || typeof exerciseName !== 'string' || exerciseName.trim() === '') {
        return NextResponse.json({ 
          error: "Exercise name cannot be empty",
          code: "INVALID_EXERCISE_NAME" 
        }, { status: 400 });
      }
      updates.exerciseName = exerciseName.trim();
    }

    if (sets !== undefined) {
      if (typeof sets !== 'number' || sets <= 0) {
        return NextResponse.json({ 
          error: "Valid number of sets is required",
          code: "INVALID_SETS" 
        }, { status: 400 });
      }
      updates.sets = sets;
    }

    if (reps !== undefined) {
      if (typeof reps !== 'number' || reps <= 0) {
        return NextResponse.json({ 
          error: "Valid number of reps is required",
          code: "INVALID_REPS" 
        }, { status: 400 });
      }
      updates.reps = reps;
      newReps = reps;
      needsRecalculation = true;
    }

    if (rest !== undefined) updates.rest = rest || null;
    if (notes !== undefined) updates.notes = notes ? notes.trim() : null;
    
    if (bonusPoints !== undefined) {
      updates.bonusPoints = bonusPoints || null;
    }

    if (timeSeconds !== undefined) {
      updates.timeSeconds = timeSeconds || null;
      newTimeSeconds = timeSeconds;
      needsRecalculation = true;
    }

    if (weight !== undefined) {
      updates.weight = weight || null;
      newWeight = weight;
      needsRecalculation = true;
    }

    if (durationSeconds !== undefined) updates.durationSeconds = durationSeconds || null;

    // Recalculate points if necessary
    if (needsRecalculation) {
      let exerciseType: string | null = 'standard';
      let exerciseLevel: number = existing[0].exerciseLevel || 1;

      if (newExerciseId) {
        const exerciseRecord = await db.select()
          .from(exercises)
          .where(eq(exercises.id, newExerciseId))
          .limit(1);

        if (exerciseRecord.length > 0) {
          exerciseType = exerciseRecord[0].type;
          const levelStr = exerciseRecord[0].level;
          if (levelStr === 'beginner') exerciseLevel = 1;
          else if (levelStr === 'intermediate') exerciseLevel = 2;
          else if (levelStr === 'advanced') exerciseLevel = 3;
          else if (typeof levelStr === 'number') exerciseLevel = levelStr;
        }
      }

      const recalculatedPoints = calculatePoints(
        exerciseType,
        newReps,
        newTimeSeconds,
        newWeight,
        exerciseLevel
      );

      updates.points = recalculatedPoints;
      updates.exerciseLevel = exerciseLevel;
    }

    const updated = await db.update(workouts)
      .set(updates)
      .where(and(eq(workouts.id, parseInt(id)), eq(workouts.userId, currentUser.id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Workout not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    // Add total_points to response
    const workoutWithTotalPoints = {
      ...updated[0],
      total_points: (updated[0].points || 0) + (updated[0].bonusPoints || 0)
    };

    return NextResponse.json(workoutWithTotalPoints, { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const existing = await db.select()
      .from(workouts)
      .where(and(eq(workouts.id, parseInt(id)), eq(workouts.userId, currentUser.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Workout not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(workouts)
      .where(and(eq(workouts.id, parseInt(id)), eq(workouts.userId, currentUser.id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Workout not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Workout deleted successfully',
      workout: deleted[0] 
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}