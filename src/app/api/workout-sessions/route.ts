import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workoutSessions, routines } from '@/db/schema';
import { eq, and, gte, lte, desc, isNull, isNotNull } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let conditions = [eq(workoutSessions.userId, user.id)];

    if (status === 'active') {
      conditions.push(isNull(workoutSessions.finishedAt));
    } else if (status === 'completed') {
      conditions.push(isNotNull(workoutSessions.finishedAt));
    }

    if (startDate) {
      const startDateTime = new Date(startDate);
      if (!isNaN(startDateTime.getTime())) {
        conditions.push(gte(workoutSessions.startedAt, startDateTime));
      }
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      if (!isNaN(endDateTime.getTime())) {
        endDateTime.setHours(23, 59, 59, 999);
        conditions.push(lte(workoutSessions.startedAt, endDateTime));
      }
    }

    const results = await db.select()
      .from(workoutSessions)
      .where(and(...conditions))
      .orderBy(desc(workoutSessions.startedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
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

    const { startedAt, finishedAt, routineId } = body;
    let { items } = body;

    if (!startedAt) {
      return NextResponse.json({ 
        error: "startedAt is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    // If routineId is provided, load exercises from the routine
    if (routineId) {
      const parsedRoutineId = parseInt(String(routineId), 10);
      if (isNaN(parsedRoutineId)) {
        return NextResponse.json({ 
          error: 'Invalid routine ID',
          code: 'INVALID_ROUTINE_ID' 
        }, { status: 400 });
      }

      // Allow any user to use any routine (including admin routines)
      const routine = await db.select()
        .from(routines)
        .where(eq(routines.id, parsedRoutineId))
        .limit(1);

      if (routine.length === 0) {
        return NextResponse.json({ 
          error: 'Routine not found',
          code: 'NOT_FOUND' 
        }, { status: 404 });
      }

      // Transform routine exercises into session items
      const routineExercises = routine[0].exercises as any[];
      items = routineExercises.map((ex: any) => {
        const isTimer = ex.type === 'timer' || ex.defaultTimeSeconds !== undefined || String(ex.exerciseName || "").toLowerCase().includes("plank");
        return {
          id: `item-${crypto.randomUUID()}`,
          exerciseId: ex.exerciseId,
          name: ex.exerciseName,
          split: ex.split,
          level: ex.level,
          notes: ex.notes || "",
          restEnabled: true,
          restSec: ex.restSec || 60,
          sets: ex.defaultSets 
            ? Array(ex.defaultSets).fill(null).map(() => ({ 
                reps: undefined,
                timeSeconds: undefined,
                done: false 
              }))
            : [{ 
                reps: undefined, 
                timeSeconds: undefined, 
                done: false 
              }]
        };
      });

      // Update lastUsed timestamp for the routine
      await db.update(routines)
        .set({ lastUsed: new Date() })
        .where(eq(routines.id, parsedRoutineId));
    }

    if (!items) {
      return NextResponse.json({ 
        error: "items is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!Array.isArray(items)) {
      return NextResponse.json({ 
        error: "items must be an array",
        code: "INVALID_FIELD_TYPE" 
      }, { status: 400 });
    }

    const startedAtDate = new Date(startedAt);
    if (isNaN(startedAtDate.getTime())) {
      return NextResponse.json({ 
        error: "startedAt must be a valid date",
        code: "INVALID_DATE_FORMAT" 
      }, { status: 400 });
    }

    let finishedAtDate = null;
    if (finishedAt) {
      finishedAtDate = new Date(finishedAt);
      if (isNaN(finishedAtDate.getTime())) {
        return NextResponse.json({ 
          error: "finishedAt must be a valid date",
          code: "INVALID_DATE_FORMAT" 
        }, { status: 400 });
      }
    }

    const newSession = await db.insert(workoutSessions)
      .values({
        userId: user.id,
        startedAt: startedAtDate,
        finishedAt: finishedAtDate,
        items: items,
        createdAt: new Date()
      })
      .returning();

    return NextResponse.json(newSession[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
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
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.id, parseInt(id)),
        eq(workoutSessions.userId, user.id)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Workout session not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    const updates: any = {};

    if (body.startedAt !== undefined) {
      const startedAtDate = new Date(body.startedAt);
      if (isNaN(startedAtDate.getTime())) {
        return NextResponse.json({ 
          error: "startedAt must be a valid date",
          code: "INVALID_DATE_FORMAT" 
        }, { status: 400 });
      }
      updates.startedAt = startedAtDate;
    }

    if (body.finishedAt !== undefined) {
      if (body.finishedAt === null) {
        updates.finishedAt = null;
      } else {
        const finishedAtDate = new Date(body.finishedAt);
        if (isNaN(finishedAtDate.getTime())) {
          return NextResponse.json({ 
            error: "finishedAt must be a valid date",
            code: "INVALID_DATE_FORMAT" 
          }, { status: 400 });
        }
        updates.finishedAt = finishedAtDate;
      }
    }

    if (body.items !== undefined) {
      if (!Array.isArray(body.items)) {
        return NextResponse.json({ 
          error: "items must be an array",
          code: "INVALID_FIELD_TYPE" 
        }, { status: 400 });
      }
      updates.items = body.items;
    }

    const updated = await db.update(workoutSessions)
      .set(updates)
      .where(and(
        eq(workoutSessions.id, parseInt(id)),
        eq(workoutSessions.userId, user.id)
      ))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Workout session not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const existing = await db.select()
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.id, parseInt(id)),
        eq(workoutSessions.userId, user.id)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Workout session not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(workoutSessions)
      .where(and(
        eq(workoutSessions.id, parseInt(id)),
        eq(workoutSessions.userId, user.id)
      ))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Workout session not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Workout session deleted successfully',
      deleted: deleted[0]
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}