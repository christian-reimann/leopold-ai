import { afterEach, describe, expect, it } from 'vitest';
import { profileService } from '@/core/profile/profile-service';
import { searchQueryService } from '@/core/jobs/search-query-service';
import { buildSearchCriteria } from '../../fixtures/shared';
import { truncateAll } from '../../fixtures/db/test-db';

describe('SearchQueryService (integration)', () => {
  afterEach(async () => {
    await truncateAll();
  });

  it('create persists the query as active and schedules it (real Redis)', async () => {
    const profileId = await profileService.createProfile('Mein Profil');

    const id = await searchQueryService.create(profileId, {
      criteria: buildSearchCriteria(),
      interval: 'daily',
    });

    const { criteria } = await searchQueryService.getCriteria(id);
    expect(criteria).toEqual(buildSearchCriteria());
    const [stored] = await searchQueryService.listAll(profileId);
    expect(stored).toMatchObject({ id, active: true, interval: 'daily' });
  });

  it('setActive(false) then setActive(true) round-trips without error', async () => {
    const profileId = await profileService.createProfile('Mein Profil');
    const id = await searchQueryService.create(profileId, {
      criteria: buildSearchCriteria(),
      interval: 'instant',
    });

    await searchQueryService.setActive(id, false);
    expect((await searchQueryService.listAll(profileId))[0]?.active).toBe(false);

    await searchQueryService.setActive(id, true);
    expect((await searchQueryService.listAll(profileId))[0]?.active).toBe(true);
  });

  it('delete removes the search query', async () => {
    const profileId = await profileService.createProfile('Mein Profil');
    const id = await searchQueryService.create(profileId, {
      criteria: buildSearchCriteria(),
      interval: 'daily',
    });

    await searchQueryService.delete(id);

    expect(await searchQueryService.listAll(profileId)).toHaveLength(0);
  });

  it('deleting the profile cascades to its search queries', async () => {
    await profileService.createProfile('Profil A');
    const second = await profileService.createProfile('Profil B');
    await searchQueryService.create(second, { criteria: buildSearchCriteria(), interval: 'daily' });

    await profileService.deleteProfile(second);

    await expect(searchQueryService.listAll(second)).resolves.toEqual([]);
  });
});
