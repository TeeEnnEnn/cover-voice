import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
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
	if (!session.user.emailVerified) {
		res.status(403).json({
			error: {
				message: 'Email not verified. Check your inbox for the verification link.',
				details: []
			}
		});
		return;
	}
	res.locals.user = session.user;
	next();
}
