import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, user, session } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { generateId } from 'better-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, password } = body;

    // Validate that both name and password are provided
    if (!name || !password) {
      return NextResponse.json(
        { 
          error: 'Name and password are required',
          code: 'MISSING_CREDENTIALS'
        },
        { status: 400 }
      );
    }

    // Trim whitespace from name input
    const trimmedName = name.trim();

    // Query users table for exact name match (case-sensitive)
    const userRecord = await db.select()
      .from(users)
      .where(eq(users.name, trimmedName))
      .limit(1);

    // Check if user exists
    if (userRecord.length === 0) {
      return NextResponse.json(
        { 
          error: 'Invalid name or password',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      );
    }

    const customUser = userRecord[0];

    // Compare password directly (plain text comparison)
    if (customUser.password !== password) {
      return NextResponse.json(
        { 
          error: 'Invalid name or password',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      );
    }

    // Ensure user exists in better-auth user table
    const betterAuthUserId = `user_${customUser.id}`;
    const userEmail = `${customUser.name.toLowerCase().replace(/\s+/g, '')}@fitness.app`;
    
    // Check if user already exists by ID or email
    const existingBetterAuthUser = await db.select()
      .from(user)
      .where(or(eq(user.id, betterAuthUserId), eq(user.email, userEmail)))
      .limit(1);

    if (existingBetterAuthUser.length === 0) {
      // User doesn't exist - create them
      const isAdminUser = customUser.role === 'admin';
      
      await db.insert(user).values({
        id: betterAuthUserId,
        name: customUser.name,
        email: userEmail,
        emailVerified: isAdminUser,
        image: null,
        isAdmin: isAdminUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Create a better-auth session
    const sessionToken = generateId(32);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(session).values({
      id: generateId(32),
      token: sessionToken,
      userId: betterAuthUserId,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      userAgent: request.headers.get('user-agent') || '',
    });

    // Return user data with bearer token
    const { password: _, ...userWithoutPassword } = customUser;

    const response = NextResponse.json({
      ...userWithoutPassword,
      token: sessionToken
    }, { status: 200 });

    // Set session cookie for better-auth compatibility
    response.cookies.set('better-auth.session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}