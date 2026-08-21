import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/**/*.integration.test.ts'],
          testTimeout: 5_000,
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/**/*.integration.test.ts'],
          testTimeout: 60_000,
          hookTimeout: 60_000,
          environment: 'node',
          globalSetup: ['./vitest.integration.globalsetup.ts'],
          // Integration tests share one testcontainer Postgres across the whole run
          // (see globalSetup) - files therefore run sequentially instead of in parallel,
          // otherwise TRUNCATE cleanup between test files would interfere with each other.
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/app/**',
        'src/db/schema/**',
      ],
    },
  },
});
