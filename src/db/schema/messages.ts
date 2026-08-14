import type { UIMessage } from 'ai';
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { conversations } from './conversations';

// The system prompt is never persisted (see core/agent/system-prompt.ts), hence no 'system' value.
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant']);

export const messages = pgTable(
  'messages',
  {
    // The AI SDK's generateId() doesn't produce UUIDs but its own IDs (e.g. "msg-xxxx") – hence
    // `text` instead of `uuid`, and the ID comes from the caller instead of being generated via
    // defaultRandom(), so it matches the client-side UIMessage ID.
    id: text('id').primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    // Maps UIMessage['parts'] directly so conversationService.listMessages() can be passed
    // through to useChat as initialMessages without transformation.
    parts: jsonb('parts').$type<UIMessage['parts']>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('messages_conversation_id_idx').on(table.conversationId, table.createdAt)],
);
