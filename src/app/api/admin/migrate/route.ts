import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  // Only allow admin users (check both isAdmin boolean and role property for full compatibility)
  let isAdmin = Boolean(
    user && (user.isAdmin || (user as { role?: string }).role === 'admin')
  );

  if (user && !isAdmin) {
    try {
      const customUser = await db
        .select()
        .from(users)
        .where(eq(users.name, user.name))
        .limit(1);
      if (customUser.length > 0 && customUser[0].role === 'admin') {
        isAdmin = true;
      }
    } catch {
      // Best-effort check
    }
  }

  if (!user || !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Idempotent: only add the column if it doesn't exist
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'workouts' AND column_name = 'client_id'
        ) THEN
          ALTER TABLE "workouts" ADD COLUMN "client_id" text;
        END IF;
      END $$;
    `);

    // Also record it in drizzle's migration journal so future migrates don't conflict,
    // if the __drizzle_migrations table exists:
    // (best-effort, ignore errors)
    try {
      await db.execute(sql`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
          ) THEN
            IF NOT EXISTS (
              SELECT 1 FROM "drizzle"."__drizzle_migrations"
              WHERE "hash" = '35106ffbe6e86fd9ebe272976d660fa4a851c6c33736230782e2bfd8c255a83f'
            ) THEN
              INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
              VALUES ('35106ffbe6e86fd9ebe272976d660fa4a851c6c33736230782e2bfd8c255a83f', 1790948603085);
            END IF;
          ELSIF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = '__drizzle_migrations'
          ) THEN
            IF NOT EXISTS (
              SELECT 1 FROM "public"."__drizzle_migrations"
              WHERE "hash" = '35106ffbe6e86fd9ebe272976d660fa4a851c6c33736230782e2bfd8c255a83f'
            ) THEN
              INSERT INTO "public"."__drizzle_migrations" ("hash", "created_at")
              VALUES ('35106ffbe6e86fd9ebe272976d660fa4a851c6c33736230782e2bfd8c255a83f', 1790948603085);
            END IF;
          END IF;
        END $$;
      `);
    } catch (journalErr) {
      console.warn('Could not record migration in __drizzle_migrations (ignoring):', journalErr);
    }

    return NextResponse.json({ ok: true, message: 'client_id column ensured' });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
