import { Router } from 'express';
import { z } from 'zod';
import { fromNodeHeaders } from 'better-auth/node';
import { registry } from '../openapi/registry.js';
import { validationErrorSchema } from '../schemas/common.js';
import { auth } from '../auth.js';

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

router.get('/me', async (req, res) => {
	let session;
	try {
		session = await auth.api.getSession({
			headers: fromNodeHeaders(req.headers)
		});
	} catch {
		res.status(500).json({ error: { message: 'Failed to verify session', details: [] } });
		return;
	}
	if (!session) {
		res.status(401).json({ error: { message: 'Unauthorized', details: [] } });
		return;
	}
	const { user: u } = session;
	res.json({ user: { id: u.id, name: u.name, email: u.email } } satisfies z.infer<typeof meOk>);
});

export default router;
