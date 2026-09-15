import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { exercises, user } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthenticatedUser as getCurrentUser } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
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

    // Return any exercise (all users can view all exercises)
    const exerciseWithUser = await db
      .select({
        id: exercises.id,
        userId: exercises.userId,
        createdBy: exercises.createdBy,
        name: exercises.name,
        description: exercises.description,
        imageUrl: exercises.imageUrl,
        type: exercises.type,
        bodyParts: exercises.bodyParts,
        tags: exercises.tags,
        level: exercises.level,
        split: exercises.split,
        repGoal: exercises.repGoal,
        createdAt: exercises.createdAt,
        isAdminExercise: user.isAdmin,
        creatorName: user.name
      })
      .from(exercises)
      .leftJoin(user, eq(exercises.createdBy, user.id))
      .where(eq(exercises.id, parseInt(id)))
      .limit(1);

    if (exerciseWithUser.length === 0) {
      return NextResponse.json(
        { error: 'Exercise not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const ex = exerciseWithUser[0];
    const formatted = {
      ...ex,
      level: ex.level ? (isNaN(Number(ex.level)) ? 1 : Number(ex.level)) : 1,
    };
    return NextResponse.json(formatted, { status: 200 });
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
    const currentUser = await getCurrentUser(request);
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

    if ('createdBy' in body || 'created_by' in body) {
      return NextResponse.json(
        {
          error: 'createdBy cannot be provided in request body',
          code: 'CREATED_BY_NOT_ALLOWED',
        },
        { status: 400 }
      );
    }

    // Get current user's admin status
    const isCurrentUserAdmin = currentUser.isAdmin || false;

    // Get the exercise
    const exerciseData = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, parseInt(id)))
      .limit(1);

    if (exerciseData.length === 0) {
      return NextResponse.json(
        { error: 'Exercise not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const exercise = exerciseData[0];

    // Only allow editing if user is admin OR if user created the exercise
    if (!isCurrentUserAdmin && exercise.createdBy !== currentUser.id) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this exercise', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const updateData: {
      name?: string;
      description?: string;
      imageUrl?: string;
      type?: string;
      bodyParts?: string[] | null;
      tags?: string[] | null;
      level?: string | null;
      split?: string;
      repGoal?: number | null;
    } = {};

    if (body.name !== undefined) updateData.name = typeof body.name === 'string' ? body.name.trim() : body.name;
    if (body.description !== undefined) updateData.description = typeof body.description === 'string' ? body.description.trim() : body.description;
    if (body.imageUrl !== undefined) updateData.imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : body.imageUrl;
    if (body.type !== undefined) updateData.type = typeof body.type === 'string' ? body.type.trim() : body.type;
    if (body.bodyParts !== undefined) {
      updateData.bodyParts = Array.isArray(body.bodyParts) ? body.bodyParts : (body.bodyParts === null ? null : undefined);
    }
    if (body.tags !== undefined) {
      updateData.tags = Array.isArray(body.tags) ? body.tags : (body.tags === null ? null : undefined);
    }
    if (body.level !== undefined) updateData.level = body.level !== null && body.level !== undefined ? String(body.level) : null;
    if (body.split !== undefined) updateData.split = typeof body.split === 'string' ? body.split.trim() : body.split;
    if (body.repGoal !== undefined) updateData.repGoal = body.repGoal;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'NO_UPDATE_FIELDS' },
        { status: 400 }
      );
    }

    const updated = await db
      .update(exercises)
      .set(updateData)
      .where(eq(exercises.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Exercise not found', code: 'NOT_FOUND' },
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
    const currentUser = await getCurrentUser(request);
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

    // Get current user's admin status
    const currentUserData = await db
      .select({ isAdmin: user.isAdmin })
      .from(user)
      .where(eq(user.id, currentUser.id))
      .limit(1);

    const isCurrentUserAdmin = currentUserData[0]?.isAdmin || false;

    // Get the exercise
    const exerciseData = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, parseInt(id)))
      .limit(1);

    if (exerciseData.length === 0) {
      return NextResponse.json(
        { error: 'Exercise not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const exercise = exerciseData[0];

    // Only allow deletion if user is admin OR if user created the exercise
    if (!isCurrentUserAdmin && exercise.createdBy !== currentUser.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this exercise', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const deleted = await db
      .delete(exercises)
      .where(eq(exercises.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Exercise not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Exercise deleted successfully',
        exercise: deleted[0],
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