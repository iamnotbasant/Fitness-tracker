import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const userId = session.user.id;

    const profile = await db.select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (profile.length === 0) {
      return NextResponse.json({ 
        error: 'Profile not found',
        code: 'PROFILE_NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json(profile[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { name, heightCm, weightKg, goalType, goals } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ 
        error: 'Name is required and cannot be empty',
        code: 'MISSING_REQUIRED_FIELD' 
      }, { status: 400 });
    }

    const existingProfile = await db.select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (existingProfile.length > 0) {
      return NextResponse.json({ 
        error: 'Profile already exists, use PUT to update',
        code: 'PROFILE_ALREADY_EXISTS' 
      }, { status: 400 });
    }

    const newProfile = await db.insert(profiles)
      .values({
        userId,
        name: name.trim(),
        heightCm: heightCm ? parseInt(heightCm) : null,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        goalType: goalType || null,
        goals: goals || null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return NextResponse.json(newProfile[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { name, heightCm, weightKg, goalType, goals } = body;

    const updates: Record<string, any> = {
      updatedAt: new Date()
    };

    if (name !== undefined) {
      if (name.trim() === '') {
        return NextResponse.json({ 
          error: 'Name cannot be empty',
          code: 'INVALID_FIELD' 
        }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (heightCm !== undefined) {
      updates.heightCm = heightCm ? parseInt(heightCm) : null;
    }

    if (weightKg !== undefined) {
      updates.weightKg = weightKg ? parseFloat(weightKg) : null;
    }

    if (goalType !== undefined) {
      updates.goalType = goalType || null;
    }

    if (goals !== undefined) {
      updates.goals = goals || null;
    }

    const updatedProfile = await db.update(profiles)
      .set(updates)
      .where(eq(profiles.userId, userId))
      .returning();

    if (updatedProfile.length === 0) {
      return NextResponse.json({ 
        error: 'Profile not found, use POST to create',
        code: 'PROFILE_NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json(updatedProfile[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}