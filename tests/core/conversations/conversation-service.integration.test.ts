import type { UIMessage } from 'ai';
import { afterEach, describe, expect, it } from 'vitest';
import { conversationService } from '@/core/conversations/conversation-service';
import { profileService } from '@/core/profile/profile-service';
import { truncateAll } from '../../fixtures/db/test-db';

function userMessage(id: string, text: string): UIMessage {
  return { id, role: 'user', parts: [{ type: 'text', text }] };
}

describe('ConversationService (integration)', () => {
  afterEach(async () => {
    await truncateAll();
  });

  it('getOrCreate is idempotent per profile', async () => {
    const profileId = await profileService.createProfile('Mein Profil');
    const first = await conversationService.getOrCreate(profileId);
    const second = await conversationService.getOrCreate(profileId);
    expect(second).toBe(first);
  });

  it('appendMessages then listMessages returns them in creation order', async () => {
    const profileId = await profileService.createProfile('Mein Profil');
    const conversationId = await conversationService.getOrCreate(profileId);

    await conversationService.appendMessages(conversationId, [
      userMessage('msg-1', 'Hallo'),
      userMessage('msg-2', 'Wie geht es dir?'),
    ]);

    const messages = await conversationService.listMessages(conversationId);
    expect(messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);
  });

  it('appendMessages upserts on a repeated message id instead of throwing', async () => {
    const profileId = await profileService.createProfile('Mein Profil');
    const conversationId = await conversationService.getOrCreate(profileId);

    await conversationService.appendMessages(conversationId, [userMessage('msg-1', 'Ursprünglich')]);
    await conversationService.appendMessages(conversationId, [userMessage('msg-1', 'Aktualisiert')]);

    const messages = await conversationService.listMessages(conversationId);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.parts).toEqual([{ type: 'text', text: 'Aktualisiert' }]);
  });

  it('clear removes all messages but keeps the conversation', async () => {
    const profileId = await profileService.createProfile('Mein Profil');
    const conversationId = await conversationService.getOrCreate(profileId);
    await conversationService.appendMessages(conversationId, [userMessage('msg-1', 'Hallo')]);

    await conversationService.clear(profileId);

    expect(await conversationService.listMessages(conversationId)).toHaveLength(0);
    expect(await conversationService.getOrCreate(profileId)).toBe(conversationId);
  });

  it('deleting the profile cascades to the conversation and its messages', async () => {
    // deleteProfile refuses to delete the last remaining profile, so a second one must exist.
    await profileService.createProfile('Profil A');
    const second = await profileService.createProfile('Profil B');
    const conversationId = await conversationService.getOrCreate(second);
    await conversationService.appendMessages(conversationId, [userMessage('msg-1', 'Hallo')]);

    await profileService.deleteProfile(second);

    await expect(conversationService.getProfileId(conversationId)).rejects.toThrow(/not found/i);
  });
});
