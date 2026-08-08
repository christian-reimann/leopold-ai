import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL ?? 'postgres://leopold:leopold@localhost:5432/leopold';

const client = postgres(connectionString);

export const db = drizzle(client);
