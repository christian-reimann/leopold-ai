import type { UIMessage } from 'ai';
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { conversations } from './conversations';

// System-Prompt wird nie persistiert (siehe core/agent/system-prompt.ts), daher kein 'system'-Wert.
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant']);

export const messages = pgTable(
  'messages',
  {
    // AI SDKs generateId() liefert keine UUIDs, sondern eigene IDs (z.B. "msg-xxxx") – daher
    // `text` statt `uuid`, und die ID kommt vom Aufrufer statt per defaultRandom() generiert zu
    // werden, damit sie mit der Client-seitigen UIMessage-ID übereinstimmt.
    id: text('id').primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    // Bildet UIMessage['parts'] direkt ab, damit conversationService.listMessages() ohne
    // Transformation als initialMessages an useChat durchgereicht werden kann.
    parts: jsonb('parts').$type<UIMessage['parts']>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('messages_conversation_id_idx').on(table.conversationId, table.createdAt)],
);
