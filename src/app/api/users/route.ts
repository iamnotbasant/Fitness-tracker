import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { desc } from 'drizzle-orm';
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

    // Admin access check for user management
    if (!currentUser.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Query all users ordered by createdAt descending
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })
      .from(users)
      .orderBy(desc(users.createdAt));

    // Return the users array (will be empty array if no users exist)
    return NextResponse.json(allUsers, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}