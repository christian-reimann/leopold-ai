import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { GenericContainer, Wait } from 'testcontainers';

export default async function setup() {
  const initSql = readFileSync(
    path.resolve(process.cwd(), 'docker/postgres-init/001-pgvector.sql'),
    'utf-8',
  );

  const postgres = await new GenericContainer('pgvector/pgvector:pg17')
    .withEnvironment({ POSTGRES_USER: 'leopold', POSTGRES_PASSWORD: 'leopold', POSTGRES_DB: 'leopold' })
    .withExposedPorts(5432)
    .withCopyContentToContainer([
      { content: initSql, target: '/docker-entrypoint-initdb.d/001-pgvector.sql' },
    ])
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/, 2))
    .start();

  const redis = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    .start();

  const databaseUrl = `postgres://leopold:leopold@${postgres.getHost()}:${postgres.getMappedPort(5432)}/leopold`;
  const redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;

  process.env.DATABASE_URL = databaseUrl;
  process.env.REDIS_URL = redisUrl;

  // Run migrations against the fresh container before test files import db/client.ts
  // (Vitest only loads test files after globalSetup, see test plan).
  execSync('pnpm drizzle-kit migrate', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  return async () => {
    await postgres.stop();
    await redis.stop();
  };
}
