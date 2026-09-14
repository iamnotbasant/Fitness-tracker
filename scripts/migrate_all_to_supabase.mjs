import { createClient } from '@libsql/client';
import postgres from 'postgres';

const local = createClient({ url: 'file:local.db' });
const pg = postgres(process.env.DATABASE_URL, { prepare: false, ssl: 'require', idle_timeout: 30, max: 5 });

function toDate(val) {
  if (!val) return new Date();
  const num = Number(val);
  if (isNaN(num)) return new Date(val);
  return new Date(num > 1e11 ? num : num * 1000);
}

function parseJson(val, fallback = null) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

async function migrate() {
  console.log('🚀 Starting batch migration from local.db to Supabase...');

  // 1. user
  const userRows = await local.execute('SELECT * FROM "user"');
  for (const r of userRows.rows) {
    await pg`
      INSERT INTO "user" (id, name, email, email_verified, image, is_admin, created_at, updated_at)
      VALUES (${r.id}, ${r.name}, ${r.email}, ${Boolean(r.email_verified)}, ${r.image || null}, ${Boolean(r.is_admin)}, ${toDate(r.created_at)}, ${toDate(r.updated_at)})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`✅ Migrated ${userRows.rows.length} user records`);

  // 2. users (custom auth table)
  const usersRows = await local.execute('SELECT * FROM "users"');
  for (const r of usersRows.rows) {
    await pg`
      INSERT INTO "users" (id, name, password, role, created_at)
      VALUES (${r.id}, ${r.name}, ${r.password}, ${r.role}, ${toDate(r.created_at)})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  if (usersRows.rows.length > 0) {
    await pg`SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM "users"), 1))`;
  }
  console.log(`✅ Migrated ${usersRows.rows.length} custom user records`);

  // 3. exercises
  const exRows = await local.execute('SELECT * FROM "exercises"');
  for (const r of exRows.rows) {
    await pg`
      INSERT INTO "exercises" (id, user_id, created_by, name, description, image_url, type, body_parts, tags, level, split, rep_goal, created_at)
      VALUES (
        ${r.id},
        ${r.user_id},
        ${r.created_by},
        ${r.name},
        ${r.description || null},
        ${r.image_url || null},
        ${r.type || null},
        ${pg.json(parseJson(r.body_parts, []))},
        ${pg.json(parseJson(r.tags, []))},
        ${r.level || null},
        ${r.split || null},
        ${r.rep_goal ? Number(r.rep_goal) : null},
        ${toDate(r.created_at)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
  if (exRows.rows.length > 0) {
    await pg`SELECT setval(pg_get_serial_sequence('exercises', 'id'), COALESCE((SELECT MAX(id) FROM "exercises"), 1))`;
  }
  console.log(`✅ Migrated ${exRows.rows.length} exercises`);

  // 4. routines
  const routineRows = await local.execute('SELECT * FROM "routines"');
  for (const r of routineRows.rows) {
    await pg`
      INSERT INTO "routines" (id, user_id, name, description, exercises, created_at, last_used)
      VALUES (
        ${r.id},
        ${r.user_id},
        ${r.name},
        ${r.description || null},
        ${pg.json(parseJson(r.exercises, []))},
        ${toDate(r.created_at)},
        ${r.last_used ? toDate(r.last_used) : null}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
  if (routineRows.rows.length > 0) {
    await pg`SELECT setval(pg_get_serial_sequence('routines', 'id'), COALESCE((SELECT MAX(id) FROM "routines"), 1))`;
  }
  console.log(`✅ Migrated ${routineRows.rows.length} routines`);

  // 5. workouts in chunks of 50
  const workoutRows = await local.execute('SELECT * FROM "workouts"');
  console.log(`Migrating ${workoutRows.rows.length} workouts in batches of 50...`);
  
  for (let i = 0; i < workoutRows.rows.length; i += 50) {
    const chunk = workoutRows.rows.slice(i, i + 50).map(r => ({
      id: r.id,
      user_id: r.user_id,
      date: r.date,
      time: r.time || null,
      exercise_id: r.exercise_id ? Number(r.exercise_id) : null,
      exercise_name: r.exercise_name,
      sets: Number(r.sets),
      reps: Number(r.reps),
      rest: r.rest ? Number(r.rest) : null,
      notes: r.notes || null,
      points: r.points != null ? Number(r.points) : null,
      bonus_points: r.bonus_points != null ? Number(r.bonus_points) : null,
      exercise_level: r.exercise_level != null ? Number(r.exercise_level) : null,
      time_seconds: r.time_seconds != null ? Number(r.time_seconds) : null,
      weight: r.weight != null ? Number(r.weight) : null,
      duration_seconds: r.duration_seconds != null ? Number(r.duration_seconds) : null,
      created_at: toDate(r.created_at)
    }));

    await pg`
      INSERT INTO "workouts" ${pg(chunk)}
      ON CONFLICT (id) DO NOTHING
    `;
    console.log(`  Batch ${i + 1} - ${Math.min(i + 50, workoutRows.rows.length)} inserted`);
  }
  
  if (workoutRows.rows.length > 0) {
    await pg`SELECT setval(pg_get_serial_sequence('workouts', 'id'), COALESCE((SELECT MAX(id) FROM "workouts"), 1))`;
  }
  console.log(`✅ Migrated all ${workoutRows.rows.length} workouts!`);

  // 6. workout_sessions
  const sessionRows = await local.execute('SELECT * FROM "workout_sessions"');
  for (const r of sessionRows.rows) {
    await pg`
      INSERT INTO "workout_sessions" (id, user_id, started_at, finished_at, items, created_at)
      VALUES (
        ${r.id},
        ${r.user_id},
        ${toDate(r.started_at)},
        ${r.finished_at ? toDate(r.finished_at) : null},
        ${pg.json(parseJson(r.items, []))},
        ${toDate(r.created_at)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
  if (sessionRows.rows.length > 0) {
    await pg`SELECT setval(pg_get_serial_sequence('workout_sessions', 'id'), COALESCE((SELECT MAX(id) FROM "workout_sessions"), 1))`;
  }
  console.log(`✅ Migrated ${sessionRows.rows.length} workout sessions!`);

  await pg.end();
  console.log('🎉 ALL DATA SUCCESSFULLY MIGRATED TO SUPABASE!');
}

migrate().catch(async (e) => {
  console.error('❌ Migration failed:', e);
  await pg.end();
  process.exit(1);
});
