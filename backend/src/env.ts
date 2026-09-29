import { z } from 'zod';

const schema = z.object({
	DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
	BETTER_AUTH_SECRET: z
		.string()
		.min(32, 'BETTER_AUTH_SECRET is required and must be at least 32 characters'),
	BETTER_AUTH_URL: z
		.string()
		.min(1, 'BETTER_AUTH_URL is required (e.g. http://localhost or https://your-domain.com)')
		.refine((url) => {
			if (process.env.NODE_ENV !== 'production') return true;
			if (url.startsWith('https://')) return true;
			// Local compose serves plain HTTP on loopback; that is safe and
			// required for local dev with the production image.
			try {
				const host = new URL(url).hostname;
				return host === 'localhost' || host === '127.0.0.1' || host === '::1';
			} catch {
				return false;
			}
		}, 'BETTER_AUTH_URL must use https:// in production (http://localhost is allowed for local dev)'),
	CORS_ORIGINS: z.string().optional(),
	PORT: z.coerce.number().int().positive().default(3001),
	LOG_LEVEL: z.string().optional(),
	RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required to send auth emails'),
	EMAIL_FROM: z.string().min(1, 'EMAIL_FROM is required (e.g. Cover Voice <noreply@example.com>)'),
	DOCS_ENABLED: z
		.string()
		.optional()
		.transform((value) =>
			value === undefined ? process.env.NODE_ENV !== 'production' : value === 'true'
		)
});

export type Env = z.infer<typeof schema>;

export function validateEnv() {
	return schema.safeParse(process.env);
}
