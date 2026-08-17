import type { UIMessage } from 'ai';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { conversations } from '@/db/schema/conversations';
import { messages } from '@/db/schema/messages';

export class ConversationService {
  async getOrCreate(profileId: string): Promise<string> {
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.profileId, profileId));
    if (existing) {
      return existing.id;
    }

    const [row] = await db
      .insert(conversations)
      .values({ profileId })
      .onConflictDoUpdate({ target: conversations.profileId, set: { updatedAt: new Date() } })
      .returning({ id: conversations.id });
    if (!row) {
      throw new Error('Conversation could not be created');
    }
    return row.id;
  }

  async clear(profileId: string): Promise<void> {
    const conversationId = await this.getOrCreate(profileId);
    await db.delete(messages).where(eq(messages.conversationId, conversationId));
  }

  async getProfileId(conversationId: string): Promise<string> {
    const [row] = await db
      .select({ profileId: conversations.profileId })
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    if (!row) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    return row.profileId;
  }

  async listMessages(conversationId: string): Promise<UIMessage[]> {
    const rows = await db
      .select({ id: messages.id, role: messages.role, parts: messages.parts })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    return rows.map((row) => ({ id: row.id, role: row.role, parts: row.parts }));
  }

  async appendMessages(conversationId: string, newMessages: UIMessage[]): Promise<void> {
    // 'system' never occurs here (the system prompt is set separately, see above), but it's
    // still filtered defensively instead of silently mis-assigning the enum.
    const persistable = newMessages.filter(
      (message): message is UIMessage & { role: 'user' | 'assistant' } =>
        message.role === 'user' || message.role === 'assistant',
    );
    if (persistable.length === 0) {
      return;
    }

    await db.transaction(async (tx) => {
      // Upsert instead of insert: after a tool approval, the same assistant message
      // (same id) is passed in again, now with the resolved tool result instead of the
      // original approval-requested parts – this must not throw a duplicate-key error,
      // but should update the existing row instead.
      await tx
        .insert(messages)
        .values(
          persistable.map((message) => ({
            id: message.id,
            conversationId,
            role: message.role,
            parts: message.parts,
          })),
        )
        .onConflictDoUpdate({ target: messages.id, set: { parts: sql`excluded.parts` } });
      await tx.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));
    });
  }
}

export const conversationService = new ConversationService();
