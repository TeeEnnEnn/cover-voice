import { beforeAll, beforeEach } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { emailOutbox } from '../src/services/email.js';

// In-memory outbox: with COLLECT_SENT_EMAILS=true (see vitest.config.ts)
// auth emails are collected here and never reach the network.
export const sentEmails = emailOutbox;

// Runs once per test file: apply migrations to the test database.
beforeAll(async () => {
	await migrate(db, { migrationsFolder: './drizzle' });
});

// Every test starts from an empty database.
beforeEach(async () => {
	sentEmails.length = 0;
	const result = await db.execute(
		sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '__drizzle_migrations'`
	);
	const tables = result.rows.map((row) => row.tablename);
	if (tables.length > 0) {
		const quoted = tables.map((table) => `"public"."${table}"`).join(', ');
		await db.execute(sql.raw(`TRUNCATE ${quoted} RESTART IDENTITY CASCADE`));
	}
});
