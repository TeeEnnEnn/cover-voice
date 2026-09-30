import { Pool } from 'pg';

// Ensures the e2e test database exists before the backend webServer boots.
// Playwright starts webServers before globalSetup (which also creates it),
// so without this the backend exhausts its migration retries on a fresh
// database and exits, failing the whole run. Idempotent: creates nothing
// when the database already exists. Never touches any other database.
const databaseUrl =
	process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/app_test';

const testDbName = new URL(databaseUrl).pathname.slice(1);
if (!testDbName) throw new Error('DATABASE_URL must include a database name');
const adminUrl = databaseUrl.replace(/\/[^/]*$/, '/postgres');

const admin = new Pool({ connectionString: adminUrl });
try {
	const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
		testDbName
	]);
	if (!rowCount) {
		await admin.query(`CREATE DATABASE "${testDbName.replace(/"/g, '""')}"`);
		console.log(`created test database "${testDbName}"`);
	} else {
		console.log(`test database "${testDbName}" already exists`);
	}
} finally {
	await admin.end();
}
