import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { routines } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
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

    // Allow any authenticated user to view any routine
    const routine = await db
      .select()
      .from(routines)
      .where(eq(routines.id, parseInt(id)))
      .limit(1);

    if (routine.length === 0) {
      return NextResponse.json(
        { error: 'Routine not found', code: 'ROUTINE_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(routine[0], { status: 200 });
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
    const user = await getAuthenticatedUser(request);
    if (!user) {
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

    const { name, description, exercises: exercisesData, lastUsed } = body;

    if (exercisesData !== undefined && !Array.isArray(exercisesData)) {
      return NextResponse.json(
        {
          error: 'Exercises must be an array',
          code: 'INVALID_EXERCISES_FORMAT',
        },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (exercisesData !== undefined) updateData.exercises = exercisesData;
    if (lastUsed !== undefined) {
      updateData.lastUsed = new Date(lastUsed);
    }

    const conditions = user.isAdmin
      ? eq(routines.id, parseInt(id))
      : and(eq(routines.id, parseInt(id)), eq(routines.userId, user.id));

    const updated = await db
      .update(routines)
      .set(updateData)
      .where(conditions)
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Routine not found or not authorized to edit', code: 'ROUTINE_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated[0], { status: 200 });
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
    const user = await getAuthenticatedUser(request);
    if (!user) {
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

    const conditions = user.isAdmin
      ? eq(routines.id, parseInt(id))
      : and(eq(routines.id, parseInt(id)), eq(routines.userId, user.id));

    const deleted = await db
      .delete(routines)
      .where(conditions)
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Routine not found or not authorized to delete', code: 'ROUTINE_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Routine deleted successfully',
        routine: deleted[0],
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