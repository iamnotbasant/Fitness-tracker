import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, password, role } = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Name is required and must not be empty',
          code: 'MISSING_NAME' 
        },
        { status: 400 }
      );
    }

    // Validate password
    if (!password || typeof password !== 'string' || password === '') {
      return NextResponse.json(
        { 
          error: 'Password is required and must not be empty',
          code: 'MISSING_PASSWORD' 
        },
        { status: 400 }
      );
    }

    // Validate role is provided
    if (!role || typeof role !== 'string') {
      return NextResponse.json(
        { 
          error: 'Role is required',
          code: 'MISSING_ROLE' 
        },
        { status: 400 }
      );
    }

    // Validate role is exactly "admin" or "user"
    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json(
        { 
          error: 'Role must be either "admin" or "user"',
          code: 'INVALID_ROLE' 
        },
        { status: 400 }
      );
    }

    // Trim name
    const trimmedName = name.trim();

    // Check for duplicate name
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.name, trimmedName))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { 
          error: 'User with this name already exists',
          code: 'DUPLICATE_USER' 
        },
        { status: 409 }
      );
    }

    // Insert new user
    const newUser = await db.insert(users)
      .values({
        name: trimmedName,
        password: password,
        role: role,
        createdAt: new Date()
      })
      .returning();

    // Return user without password
    const { password: _, ...userResponse } = newUser[0];

    return NextResponse.json(userResponse, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}