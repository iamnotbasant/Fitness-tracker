import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { account, user } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes, pbkdf2Sync } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, newPassword } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'User ID is required',
          code: 'MISSING_USER_ID' 
        },
        { status: 400 }
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        { 
          error: 'New password is required',
          code: 'MISSING_PASSWORD' 
        },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { 
          error: 'Password must be at least 8 characters long',
          code: 'WEAK_PASSWORD' 
        },
        { status: 400 }
      );
    }

    // Check if user exists and get user info
    const existingUser = await db.select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { 
          error: 'User not found',
          code: 'USER_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    // Check if account with credential provider exists
    const existingAccount = await db.select()
      .from(account)
      .where(and(
        eq(account.userId, userId),
        eq(account.providerId, 'credential')
      ))
      .limit(1);

    if (existingAccount.length === 0) {
      return NextResponse.json(
        { 
          error: 'Credential account not found for user',
          code: 'ACCOUNT_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    // Generate salt and hash password using PBKDF2 (better-auth format)
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(newPassword, salt, 10000, 64, 'sha256').toString('hex');
    const hashedPassword = `${salt}:${hash}`;

    // Update the account password
    const updatedAccount = await db.update(account)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(and(
        eq(account.userId, userId),
        eq(account.providerId, 'credential')
      ))
      .returning();

    if (updatedAccount.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to update password',
          code: 'UPDATE_FAILED' 
        },
        { status: 500 }
      );
    }

    // Log the password reset action
    console.log(`Password reset successfully for user: ${userId} (${existingUser[0].email})`);

    return NextResponse.json(
      {
        message: 'Password reset successfully',
        userId: existingUser[0].id,
        email: existingUser[0].email
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}