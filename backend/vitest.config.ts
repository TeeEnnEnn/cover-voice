import { defineConfig } from 'vitest/config';

const testEnv = {
	DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/app_test',
	BETTER_AUTH_SECRET:
		process.env.BETTER_AUTH_SECRET ?? 'test-only-secret-0123456789abcdef0123456789abcdef',
	BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://localhost',
	CORS_ORIGINS: process.env.CORS_ORIGINS ?? 'http://localhost:5173',
	PORT: process.env.PORT ?? '3001'
};

// The global setup runs in the main process and does not receive test.env,
// so expose the same variables there too (without clobbering explicit overrides).
for (const [key, value] of Object.entries(testEnv)) {
	process.env[key] ??= value;
}

// Shared Postgres for all test files, so files must run serially.
// The test database is created (if missing) and migrated by the global setup.
export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
		fileParallelism: false,
		globalSetup: ['./tests/global-setup.ts'],
		setupFiles: ['./tests/setup.ts'],
		env: testEnv
	}
});
