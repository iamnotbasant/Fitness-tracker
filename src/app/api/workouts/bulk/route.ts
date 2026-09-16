import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workouts } from '@/db/schema';
import { getAuthenticatedUser } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const rawList: any[] = Array.isArray(body) ? body : body.workouts;

    if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
      return NextResponse.json(
        { error: 'No workouts provided for bulk insert' },
        { status: 400 }
      );
    }

    const sanitizedRows: any[] = [];

    for (const w of rawList) {
      if (!w.date || !w.exerciseName) continue;

      const sets = Number(w.sets) || 1;
      const reps = Number(w.reps) || 0;
      const timeSeconds = w.timeSeconds ? Number(w.timeSeconds) : null;
      const weight = w.weight ? Number(w.weight) : null;
      const points = w.points || (weight ? Math.round(weight * reps) : reps);

      const row: any = {
        userId: currentUser.id,
        date: String(w.date).trim(),
        exerciseName: String(w.exerciseName).trim(),
        sets,
        reps: reps || 1,
        points,
        exerciseLevel: Number(w.exerciseLevel) || 1,
        createdAt: new Date(),
      };

      if (w.time) row.time = String(w.time).trim();
      if (w.exerciseId && !isNaN(Number(w.exerciseId))) row.exerciseId = Number(w.exerciseId);
      if (w.rest !== undefined && w.rest !== null) row.rest = Number(w.rest);
      if (w.notes) row.notes = String(w.notes).trim();
      if (w.bonusPoints !== undefined) row.bonusPoints = Number(w.bonusPoints);
      if (timeSeconds !== null) row.timeSeconds = timeSeconds;
      if (weight !== null) row.weight = weight;
      if (w.durationSeconds) row.durationSeconds = Number(w.durationSeconds);

      sanitizedRows.push(row);
    }

    if (sanitizedRows.length === 0) {
      return NextResponse.json(
        { error: 'No valid workout records found in payload' },
        { status: 400 }
      );
    }

    // Insert in batches of 100 to stay well within query parameter limits
    const BATCH_SIZE = 100;
    let insertedCount = 0;

    for (let i = 0; i < sanitizedRows.length; i += BATCH_SIZE) {
      const batch = sanitizedRows.slice(i, i + BATCH_SIZE);
      await db.insert(workouts).values(batch);
      insertedCount += batch.length;
    }

    return NextResponse.json(
      { success: true, count: insertedCount },
      { status: 201 }
    );
  } catch (error) {
    console.error('Bulk workout insert error:', error);
    return NextResponse.json(
      { error: 'Failed to insert workouts: ' + String(error) },
      { status: 500 }
    );
  }
}
