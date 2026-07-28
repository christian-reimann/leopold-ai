'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { profiles } from '@/db/schema/profiles';
import { ProfileSchema } from '@/shared/schemas/profile';

const ProfileInputSchema = ProfileSchema.extend({ id: z.uuid().optional() });

export async function updateProfile(input: unknown): Promise<void> {
  const { id, ...profileData } = ProfileInputSchema.parse(input);

  if (id) {
    await db
      .update(profiles)
      .set({ data: profileData, source: 'manual', updatedAt: new Date() })
      .where(eq(profiles.id, id));
  } else {
    await db.insert(profiles).values({ data: profileData, source: 'manual' });
  }

  revalidatePath('/profile');
}
