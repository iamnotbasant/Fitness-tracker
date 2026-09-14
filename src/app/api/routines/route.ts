import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { routines, user } from '@/db/schema';
import { eq, and, like, or, desc, sql } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10000');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    // Get all routines with creator information
    const searchTerm = search ? `%${search}%` : null;
    const results = await db
      .select({
        id: routines.id,
        userId: routines.userId,
        name: routines.name,
        description: routines.description,
        exercises: routines.exercises,
        createdAt: routines.createdAt,
        lastUsed: routines.lastUsed,
        isAdminRoutine: user.isAdmin,
        creatorName: user.name
      })
      .from(routines)
      .leftJoin(user, eq(routines.userId, user.id))
      .where(
        searchTerm
          ? or(
              like(routines.name, searchTerm),
              like(routines.description, searchTerm)
            )
          : undefined
      )
      .orderBy(
        sql`${routines.lastUsed} DESC NULLS LAST`,
        desc(routines.createdAt)
      )
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ routines: results }, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
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

    const { name, description, exercises } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Name is required and must be a non-empty string',
          code: 'MISSING_REQUIRED_FIELD',
        },
        { status: 400 }
      );
    }

    if (!exercises) {
      return NextResponse.json(
        {
          error: 'Exercises field is required',
          code: 'MISSING_REQUIRED_FIELD',
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(exercises)) {
      return NextResponse.json(
        {
          error: 'Exercises must be an array',
          code: 'INVALID_EXERCISES_FORMAT',
        },
        { status: 400 }
      );
    }

    const newRoutine = await db
      .insert(routines)
      .values({
        userId: user.id,
        name: name.trim(),
        description: description ? description.trim() : null,
        exercises: exercises,
        createdAt: new Date(),
        lastUsed: null,
      })
      .returning();

    return NextResponse.json({ routine: newRoutine[0] }, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}