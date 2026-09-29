import { db, pool } from '../db/index.js';
import { user } from '../db/schema.js';
import { resyncUserUsage } from '../services/usage-sync.js';

/**
 * One-shot backfill: reconciles junction tables for every user from current
 * block values and letter rawContent. Safe to re-run (idempotent full
 * reconcile). Run with: `npx tsx src/db/backfill-usage.ts`
 */
async function main(): Promise<void> {
	const users = await db.select({ id: user.id }).from(user);
	console.log(`Backfilling usage for ${users.length} user(s)...`);
	for (const { id } of users) {
		await db.transaction((tx) => resyncUserUsage(tx, id));
		console.log(`- ${id}: done`);
	}
	console.log('Backfill complete.');
}

try {
	await main();
} finally {
	await pool.end();
}
