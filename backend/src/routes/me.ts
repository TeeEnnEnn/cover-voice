import { Router } from 'express';
import { z } from 'zod';
import { registry } from '../openapi/registry.js';
import { validationErrorSchema } from '../schemas/common.js';
import { requireAuth } from '../middleware/require-auth.js';

const user = z.object({
	id: z.string(),
	name: z.string(),
	email: z.email()
});
const meOk = z.object({ user });

registry.registerPath({
	method: 'get',
	path: '/api/me',
	summary: 'Get the current user',
	tags: ['auth'],
	responses: {
		200: {
			description: 'The authenticated user',
			content: { 'application/json': { schema: meOk } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: validationErrorSchema } }
		}
	}
});

const router = Router();

router.get('/me', requireAuth, async (_req, res) => {
	const u = res.locals.user as { id: string; name: string; email: string };
	res.json({ user: { id: u.id, name: u.name, email: u.email } } satisfies z.infer<typeof meOk>);
});

export default router;
