import type { UIMessage } from 'ai';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { conversations } from '@/db/schema/conversations';
import { messages } from '@/db/schema/messages';

export class ConversationService {
  /**
   * MVP: Einzelnutzer-Tool, es gibt genau eine Konversation für die gesamte App.
   * `orderBy` ist Pflicht, nicht Kosmetik: ohne sie ist bei mehreren Zeilen (z.B. Altlasten
   * aus der früheren Pro-Bewerbung-Konversation) nicht garantiert, dass zwei Aufrufe
   * dieselbe Zeile liefern – Client (GET) und Server (POST) könnten sonst auf
   * unterschiedlichen Konversationen landen.
   */
  async getOrCreate(): Promise<string> {
    const [existing] = await db.select({ id: conversations.id }).from(conversations).orderBy(asc(conversations.createdAt)).limit(1);
    if (existing) {
      return existing.id;
    }

    const [created] = await db.insert(conversations).values({}).returning({ id: conversations.id });
    if (!created) {
      throw new Error('Konversation konnte nicht angelegt werden');
    }
    return created.id;
  }

  async clear(): Promise<void> {
    const conversationId = await this.getOrCreate();
    await db.delete(messages).where(eq(messages.conversationId, conversationId));
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
    // 'system' kommt hier nie vor (System-Prompt wird separat gesetzt, s.o.), wird trotzdem
    // defensiv gefiltert statt das Enum stillschweigend falsch zu belegen.
    const persistable = newMessages.filter(
      (message): message is UIMessage & { role: 'user' | 'assistant' } =>
        message.role === 'user' || message.role === 'assistant',
    );
    if (persistable.length === 0) {
      return;
    }

    await db.transaction(async (tx) => {
      // Upsert statt Insert: nach einer Tool-Approval wird dieselbe Assistant-Nachricht
      // (gleiche id) erneut übergeben, jetzt mit aufgelöstem Tool-Ergebnis statt der
      // ursprünglichen approval-requested-Teile – das darf keinen Duplicate-Key werfen,
      // sondern muss die vorhandene Zeile aktualisieren.
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
