import { NextRequest } from 'next/server';
import { db } from '@/db';
import { user, session } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getAuthenticatedUser(request: NextRequest) {
  try {
    let token = '';
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = request.cookies.get('better-auth.session_token')?.value || '';
    }

    if (token && token !== 'local_admin_token') {
      const sessionRecord = await db
        .select()
        .from(session)
        .where(eq(session.token, token))
        .limit(1);
      
      if (sessionRecord.length > 0) {
        const sess = sessionRecord[0];
        if (sess.expiresAt > new Date()) {
          const userRecord = await db
            .select()
            .from(user)
            .where(eq(user.id, sess.userId))
            .limit(1);
          
          if (userRecord.length > 0) {
            return userRecord[0];
          }
        }
      }
    }
    
    // In local / single-user mode, fallback to user_1 or first available user
    const defaultUser = await db
      .select()
      .from(user)
      .where(eq(user.id, 'user_1'))
      .limit(1);
    
    if (defaultUser.length > 0) {
      return defaultUser[0];
    }

    const firstUser = await db
      .select()
      .from(user)
      .limit(1);

    if (firstUser.length > 0) {
      return firstUser[0];
    }
    
    return null;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}
