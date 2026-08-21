import { afterEach, describe, expect, it, vi } from 'vitest';
import { profileService } from '@/core/profile/profile-service';
import { db } from '@/db/client';
import { profiles } from '@/db/schema/profiles';
import { embeddingClient } from '@/llm/embeddings';
import { buildProfile } from '../../fixtures/shared';
import { truncateAll } from '../../fixtures/db/test-db';

describe('ProfileService (integration)', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await truncateAll();
  });

  it('creates a profile with default status "pending"', async () => {
    const id = await profileService.createProfile('Mein Profil');
    const profile = await profileService.getProfile(id);
    expect(profile).toMatchObject({ name: 'Mein Profil', status: 'pending', data: null });
  });

  it('renameProfile updates the name', async () => {
    const id = await profileService.createProfile('Alter Name');
    await profileService.renameProfile(id, 'Neuer Name');
    expect((await profileService.getProfile(id))?.name).toBe('Neuer Name');
  });

  it('beginExtraction/completeExtraction runs through the status lifecycle', async () => {
    const id = await profileService.createProfile('Mein Profil');
    vi.spyOn(embeddingClient, 'embedText').mockResolvedValue(Array(1024).fill(0.1));

    await profileService.beginExtraction(id);
    expect((await profileService.getProfile(id))?.status).toBe('processing');

    const profileData = buildProfile();
    await profileService.completeExtraction(id, profileData);
    const done = await profileService.getProfile(id);
    expect(done?.status).toBe('done');
    expect(done?.data).toEqual(profileData);
    expect(done?.embedding).toHaveLength(1024);
  });

  it('failExtraction sets status "failed" and stores the error message', async () => {
    const id = await profileService.createProfile('Mein Profil');
    await profileService.failExtraction(id, 'Parsing fehlgeschlagen');
    const profile = await profileService.getProfile(id);
    expect(profile?.status).toBe('failed');
    expect(profile?.error).toBe('Parsing fehlgeschlagen');
  });

  it('deleteProfile refuses to delete the last remaining profile', async () => {
    const id = await profileService.createProfile('Einziges Profil');
    await expect(profileService.deleteProfile(id)).rejects.toThrow(/at least one profile/i);
  });

  it('deleteProfile removes a profile when another one remains', async () => {
    const first = await profileService.createProfile('Profil A');
    const second = await profileService.createProfile('Profil B');
    await profileService.deleteProfile(second);
    expect(await profileService.getProfile(second)).toBeUndefined();
    expect(await profileService.getProfile(first)).toBeDefined();
  });

  it('ensureAtLeastOneProfile creates a default profile only when none exists', async () => {
    await profileService.ensureAtLeastOneProfile();
    const [profile] = await db.select().from(profiles);
    expect(profile?.name).toBe('Mein Profil');

    await profileService.ensureAtLeastOneProfile();
    expect((await db.select().from(profiles)).length).toBe(1);
  });
});
