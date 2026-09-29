import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { pino } from 'pino';
import { createApp } from './app.js';
import { db, pool } from './db/index.js';
import { validateEnv } from './env.js';

const env = validateEnv();
if (!env.success) {
	console.error('Invalid environment configuration:');
	for (const issue of env.error.issues) {
		console.error(`  - ${issue.path.join('.') || 'env'}: ${issue.message}`);
	}
	process.exit(1);
}

const port = env.data.PORT;
const logger = pino({ level: env.data.LOG_LEVEL ?? 'info' });

async function main() {
	// Retry migrations with backoff: on (re)deploy the database may still be
	// starting, and a single failed attempt would otherwise crashloop the
	// container before Postgres is ready.
	const attempts = 5;
	for (let attempt = 1; ; attempt++) {
		try {
			await migrate(db, { migrationsFolder: './drizzle' });
			break;
		} catch (error) {
			if (attempt >= attempts) throw error;
			const delayMs = 2 ** attempt * 1000;
			logger.warn({ attempt, attempts, delayMs }, 'Migration failed, retrying');
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}
	const app = createApp();
	const server = app.listen(port, () => {
		logger.info({ port }, 'Backend listening');
	});

	const shutdown = (signal: NodeJS.Signals) => {
		logger.info({ signal }, 'Shutting down');
		server.close(async () => {
			await pool.end();
			logger.info('Shutdown complete');
			process.exit(0);
		});
		setTimeout(() => process.exit(1), 10_000).unref();
	};

	process.on('SIGTERM', shutdown);
	process.on('SIGINT', shutdown);
}

main().catch((error) => {
	logger.error(error, 'Failed to start backend');
	process.exit(1);
});
