import { beforeAll, beforeEach } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { setEmailSender } from '../src/services/email.js';

// In-memory outbox: auth emails never leave the process in tests.
export const sentEmails: Array<{ to: string; subject: string; html: string }> = [];

// Runs once per test file: apply migrations to the test database.
beforeAll(async () => {
	await migrate(db, { migrationsFolder: './drizzle' });
	setEmailSender(async (input) => {
		sentEmails.push(input);
	});
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
