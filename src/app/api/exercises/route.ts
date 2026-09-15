import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { exercises, user } from '@/db/schema';
import { eq, and, like, or, desc } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10000');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const level = searchParams.get('level');

    // Return exercises created by an admin (official default exercises) OR created by current user
    const conditions = [
      or(
        eq(user.isAdmin, true),
        eq(exercises.userId, currentUser.id),
        eq(exercises.createdBy, currentUser.id)
      )!
    ];

    if (search) {
      const searchCond = or(
        like(exercises.name, `%${search}%`),
        like(exercises.description, `%${search}%`)
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    if (type) {
      conditions.push(eq(exercises.type, type));
    }

    if (level) {
      conditions.push(eq(exercises.level, level));
    }

    const results = await db
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(exercises.createdAt))
      .limit(limit)
      .offset(offset);

    const formatted = results.map((r) => ({
      ...r,
      level: r.level ? (isNaN(Number(r.level)) ? 1 : Number(r.level)) : 1,
    }));

    return NextResponse.json(formatted, { status: 200 });
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

    if ('createdBy' in body || 'created_by' in body) {
      return NextResponse.json({ 
        error: "createdBy cannot be provided in request body",
        code: "CREATED_BY_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { name, description, imageUrl, type, bodyParts, tags, level, split, repGoal } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        error: "Name is required and must be a non-empty string",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    const insertData: any = {
      userId: currentUser.id,
      createdBy: currentUser.id,
      name: name.trim(),
      createdAt: new Date()
    };

    if (description !== undefined && description !== null) {
      insertData.description = typeof description === 'string' ? description.trim() : description;
    }

    if (imageUrl !== undefined && imageUrl !== null) {
      insertData.imageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : imageUrl;
    }

    if (type !== undefined && type !== null) {
      insertData.type = typeof type === 'string' ? type.trim() : type;
    }

    if (bodyParts !== undefined && bodyParts !== null) {
      insertData.bodyParts = bodyParts;
    }

    if (tags !== undefined && tags !== null) {
      insertData.tags = tags;
    }

    if (level !== undefined && level !== null) {
      insertData.level = typeof level === 'string' ? level.trim() : level;
    }

    if (split !== undefined && split !== null) {
      insertData.split = typeof split === 'string' ? split.trim() : split;
    }

    if (repGoal !== undefined && repGoal !== null) {
      insertData.repGoal = repGoal;
    }

    const newExercise = await db.insert(exercises)
      .values(insertData)
      .returning();

    return NextResponse.json(newExercise[0], { status: 201 });
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

    if ('createdBy' in body || 'created_by' in body) {
      return NextResponse.json({ 
        error: "createdBy cannot be provided in request body",
        code: "CREATED_BY_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Get current user's admin status
    const isCurrentUserAdmin = currentUser.isAdmin || false;

    // Get the exercise
    const exerciseData = await db.select()
      .from(exercises)
      .where(eq(exercises.id, parseInt(id)))
      .limit(1);

    if (exerciseData.length === 0) {
      return NextResponse.json({ 
        error: 'Exercise not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    const exercise = exerciseData[0];

    // Only allow editing if user is admin OR if user created the exercise
    if (!isCurrentUserAdmin && exercise.createdBy !== currentUser.id) {
      return NextResponse.json({ 
        error: 'You do not have permission to edit this exercise',
        code: 'FORBIDDEN' 
      }, { status: 403 });
    }

    const { name, description, imageUrl, type, bodyParts, tags, level, split, repGoal } = body;

    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ 
          error: "Name must be a non-empty string",
          code: "INVALID_NAME" 
        }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = typeof description === 'string' ? description.trim() : description;
    }

    if (imageUrl !== undefined) {
      updateData.imageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : imageUrl;
    }

    if (type !== undefined) {
      updateData.type = typeof type === 'string' ? type.trim() : type;
    }

    if (bodyParts !== undefined) {
      updateData.bodyParts = bodyParts;
    }

    if (tags !== undefined) {
      updateData.tags = tags;
    }

    if (level !== undefined) {
      updateData.level = typeof level === 'string' ? level.trim() : level;
    }

    if (split !== undefined) {
      updateData.split = typeof split === 'string' ? split.trim() : split;
    }

    if (repGoal !== undefined) {
      updateData.repGoal = repGoal;
    }

    const updated = await db.update(exercises)
      .set(updateData)
      .where(eq(exercises.id, parseInt(id)))
      .returning();

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
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
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

    // Get the exercise with creator info
    const exerciseWithUser = await db.select({
      exercise: exercises,
      creator: user
    })
      .from(exercises)
      .leftJoin(user, eq(exercises.createdBy, user.id))
      .where(eq(exercises.id, parseInt(id)))
      .limit(1);

    if (exerciseWithUser.length === 0) {
      return NextResponse.json({ 
        error: 'Exercise not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    const exercise = exerciseWithUser[0].exercise;
    const creator = exerciseWithUser[0].creator;

    // Only allow deletion if user created the exercise
    if (exercise.createdBy !== currentUser.id) {
      // Check if exercise creator is admin
      if (creator?.isAdmin) {
        return NextResponse.json({ 
          error: 'Admin exercises can only be deleted by the admin who created them',
          code: 'FORBIDDEN' 
        }, { status: 403 });
      }
      // Regular user's exercise - not the creator
      return NextResponse.json({ 
        error: 'You do not have permission to delete this exercise',
        code: 'FORBIDDEN' 
      }, { status: 403 });
    }

    const deleted = await db.delete(exercises)
      .where(and(eq(exercises.id, parseInt(id)), eq(exercises.createdBy, currentUser.id)))
      .returning();

    return NextResponse.json({
      message: 'Exercise deleted successfully',
      exercise: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}