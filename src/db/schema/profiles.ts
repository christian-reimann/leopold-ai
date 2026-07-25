import { PROFILE_SOURCES, type Profile } from "../../shared/schemas/profile.js";
import { jsonb, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

export const profileSourceEnum = pgEnum("profile_source", PROFILE_SOURCES);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  data: jsonb("data").$type<Profile>().notNull(),
  source: profileSourceEnum("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
