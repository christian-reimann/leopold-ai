import { Redis } from 'ioredis';

const connectionString = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redisConnection = new Redis(connectionString, {
  maxRetriesPerRequest: null,
});
