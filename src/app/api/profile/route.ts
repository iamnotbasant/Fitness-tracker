import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    
    if (!currentUser?.id) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const userId = currentUser.id;

    const profile = await db.select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (profile.length === 0) {
      return NextResponse.json({
        userId,
        name: currentUser.name || '',
        heightCm: null,
        weightKg: null,
        goalType: 'strength',
        goals: [],
      }, { status: 200 });
    }

    return NextResponse.json(profile[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    
    if (!currentUser?.id) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const userId = currentUser.id;
    const body = await request.json();

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { name, heightCm, weightKg, goalType, goals } = body;

    const existingProfile = await db.select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (existingProfile.length > 0) {
      const updatedProfile = await db.update(profiles)
        .set({
          name: name ? name.trim() : existingProfile[0].name,
          heightCm: heightCm !== undefined ? (heightCm ? parseInt(heightCm) : null) : existingProfile[0].heightCm,
          weightKg: weightKg !== undefined ? (weightKg ? parseFloat(weightKg) : null) : existingProfile[0].weightKg,
          goalType: goalType !== undefined ? goalType : existingProfile[0].goalType,
          goals: goals !== undefined ? goals : existingProfile[0].goals,
          updatedAt: new Date()
        })
        .where(eq(profiles.userId, userId))
        .returning();

      return NextResponse.json(updatedProfile[0], { status: 200 });
    }

    const newProfile = await db.insert(profiles)
      .values({
        userId,
        name: name ? name.trim() : (currentUser.name || 'User'),
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
      error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    
    if (!currentUser?.id) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const userId = currentUser.id;
    const body = await request.json();

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { name, heightCm, weightKg, goalType, goals } = body;

    const existingProfile = await db.select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (existingProfile.length === 0) {
      // Upsert: Create profile if it does not yet exist
      const newProfile = await db.insert(profiles)
        .values({
          userId,
          name: name ? name.trim() : (currentUser.name || 'User'),
          heightCm: heightCm ? parseInt(heightCm) : null,
          weightKg: weightKg ? parseFloat(weightKg) : null,
          goalType: goalType || null,
          goals: goals || null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return NextResponse.json(newProfile[0], { status: 200 });
    }

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

    return NextResponse.json(updatedProfile[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}