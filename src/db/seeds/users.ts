import { db } from '@/db';
import { users, user } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    const existingUser = await db.select().from(user).where(eq(user.id, 'user_1')).limit(1);
    if (existingUser.length === 0) {
        await db.insert(user).values({
            id: 'user_1',
            name: 'basant',
            email: 'basant@fitness.app',
            emailVerified: true,
            isAdmin: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    const existingCustomUser = await db.select().from(users).where(eq(users.name, 'basant')).limit(1);
    if (existingCustomUser.length === 0) {
        await db.insert(users).values({
            name: 'basant',
            password: 'basant1bkp',
            role: 'admin',
            createdAt: new Date(),
        });
    }
    
    console.log('✅ Users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});