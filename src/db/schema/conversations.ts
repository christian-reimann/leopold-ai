import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

// MVP: es gibt genau eine (globale) Konversation, siehe ConversationService.getOrCreateGlobal.
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
