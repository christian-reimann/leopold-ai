import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL ?? 'postgres://mortimer:mortimer@localhost:5432/mortimer';

const client = postgres(connectionString);

export const db = drizzle(client);
