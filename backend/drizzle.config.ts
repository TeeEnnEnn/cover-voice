import dotenv from "dotenv";
import { fileURLToPath } from 'node:url';
import path from 'node:path';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	out: './drizzle',
	schema: ['./src/db/schema.ts'],
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL!
	}
});
