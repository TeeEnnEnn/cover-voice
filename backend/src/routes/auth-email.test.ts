import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { testAgent, TRUSTED_ORIGIN } from '../../tests/helpers.js';
import { sentEmails } from '../../tests/setup.js';
import { db } from '../db/index.js';
import { user as userTable } from '../db/schema.js';

function urlFromLastEmail(): URL {
	expect(sentEmails.length).toBeGreaterThan(0);
	const html = sentEmails[sentEmails.length - 1].html;
	const match = html.match(/href="([^"]+)"/);
	expect(match).toBeTruthy();
	return new URL(match![1]);
}

function verificationToken(): string {
	// Verification links carry the token as ?token=
	return urlFromLastEmail().searchParams.get('token') as string;
}

function resetToken(): string {
	// Reset links carry the token in the path: /reset-password/:token
	const segments = urlFromLastEmail().pathname.split('/');
	return segments[segments.length - 1];
}

async function signUp(agent: ReturnType<typeof testAgent>, email: string) {
	const res = await agent
		.post('/api/auth/sign-up/email')
		.set('Origin', TRUSTED_ORIGIN)
		.send({ email, password: 'password123', name: 'Email User' });
	expect(res.status).toBe(200);
	return res;
}

describe('email verification', () => {
	it('sends a verification email on signup and blocks sign-in until verified', async () => {
		const agent = testAgent();
		await signUp(agent, 'verify-me@example.com');
		expect(sentEmails).toHaveLength(1);
		expect(sentEmails[0].to).toBe('verify-me@example.com');
		expect(sentEmails[0].subject).toContain('Verify');

		// Fresh agent (no signup session): sign-in is rejected while unverified.
		const other = testAgent();
		const denied = await other
			.post('/api/auth/sign-in/email')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ email: 'verify-me@example.com', password: 'password123' });
		expect([401, 403]).toContain(denied.status);
		expect(JSON.stringify(denied.body)).toContain('EMAIL_NOT_VERIFIED');

		// Signup issues no session when verification is required, so the API
		// answers 401 until the email is verified.
		const gated = await agent.get('/api/blocks');
		expect(gated.status).toBe(401);

		// Follow the link: verifies and signs in.
		const token = verificationToken();
		const verified = await agent
			.get(`/api/auth/verify-email?token=${token}&callbackURL=/`)
			.set('Origin', TRUSTED_ORIGIN);
		expect([200, 302]).toContain(verified.status);

		const me = await agent.get('/api/me');
		expect(me.status).toBe(200);
		expect(me.body.user.email).toBe('verify-me@example.com');

		const blocks = await agent.get('/api/blocks');
		expect(blocks.status).toBe(200);
	});

	it('rejects tampered verification tokens', async () => {
		const agent = testAgent();
		await signUp(agent, 'verify-tamper@example.com');
		const res = await agent
			.get('/api/auth/verify-email?token=tampered-token&callbackURL=/')
			.set('Origin', TRUSTED_ORIGIN);
		expect(res.headers.location ?? '').toContain('error');
		const me = await agent.get('/api/me');
		expect(me.status).toBe(401);
	});

	it('rejects API use for sessions whose email is not verified', async () => {
		const email = 'verify-gate@example.com';
		const agent = testAgent();
		await signUp(agent, email);
		const token = verificationToken();
		await agent
			.get(`/api/auth/verify-email?token=${token}&callbackURL=/`)
			.set('Origin', TRUSTED_ORIGIN);
		expect((await agent.get('/api/blocks')).status).toBe(200);

		await db.update(userTable).set({ emailVerified: false }).where(eq(userTable.email, email));
		const gated = await agent.get('/api/blocks');
		expect(gated.status).toBe(403);
		expect(JSON.stringify(gated.body)).toContain('not verified');

		await db.update(userTable).set({ emailVerified: true }).where(eq(userTable.email, email));
		expect((await agent.get('/api/blocks')).status).toBe(200);
	});
});

describe('password reset', () => {
	async function verifiedAgent(email: string) {
		const agent = testAgent();
		await signUp(agent, email);
		const token = verificationToken();
		const verified = await agent
			.get(`/api/auth/verify-email?token=${token}&callbackURL=/`)
			.set('Origin', TRUSTED_ORIGIN);
		expect([200, 302]).toContain(verified.status);
		sentEmails.length = 0;
		return agent;
	}

	it('resets the password via emailed link and invalidates the old one', async () => {
		const email = 'reset-me@example.com';
		const agent = await verifiedAgent(email);

		const requested = await agent
			.post('/api/auth/request-password-reset')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ email, redirectTo: '/reset-password' });
		expect(requested.status).toBe(200);
		expect(sentEmails).toHaveLength(1);
		expect(sentEmails[0].subject).toContain('Reset');

		const token = resetToken();
		const reset = await agent
			.post('/api/auth/reset-password')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ newPassword: 'newpassword456', token });
		expect(reset.status).toBe(200);

		const fresh = testAgent();
		const oldLogin = await fresh
			.post('/api/auth/sign-in/email')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ email, password: 'password123' });
		expect(oldLogin.status).not.toBe(200);

		const newLogin = await fresh
			.post('/api/auth/sign-in/email')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ email, password: 'newpassword456' });
		expect(newLogin.status).toBe(200);
	});

	it('does not reveal unknown emails and rejects reused tokens', async () => {
		const agent = testAgent();
		const res = await agent
			.post('/api/auth/request-password-reset')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ email: 'nobody-here@example.com', redirectTo: '/reset-password' });
		expect(res.status).toBe(200);
		expect(sentEmails).toHaveLength(0);

		const email = 'reset-reuse@example.com';
		await verifiedAgent(email);
		await agent
			.post('/api/auth/request-password-reset')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ email, redirectTo: '/reset-password' });
		const token = resetToken();
		const first = await agent
			.post('/api/auth/reset-password')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ newPassword: 'anotherpass789', token });
		expect(first.status).toBe(200);
		const second = await agent
			.post('/api/auth/reset-password')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ newPassword: 'yetanother000', token });
		expect(second.status).toBeGreaterThanOrEqual(400);
	});
});
