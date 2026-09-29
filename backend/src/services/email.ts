import { Resend } from 'resend';

export type EmailSender = (input: { to: string; subject: string; html: string }) => Promise<void>;

function createResendSender(): EmailSender {
	const apiKey = process.env.RESEND_API_KEY;
	const from = process.env.EMAIL_FROM;
	if (!apiKey || !from) {
		throw new Error('RESEND_API_KEY and EMAIL_FROM are required to send email');
	}
	const resend = new Resend(apiKey);
	return async ({ to, subject, html }) => {
		const { error } = await resend.emails.send({ from, to, subject, html });
		if (error) throw new Error(`Failed to send email: ${error.message}`);
	};
}

function getSender(): EmailSender {
	return createResendSender();
}

export type SentEmail = { to: string; subject: string; html: string };

/** In-memory copy of every delivered email. Only populated when
 * COLLECT_SENT_EMAILS=true (tests); in that mode nothing is sent for real. */
export const emailOutbox: Array<SentEmail> = [];

async function deliver(input: SentEmail): Promise<void> {
	if (process.env.COLLECT_SENT_EMAILS === 'true') {
		emailOutbox.push(input);
		return;
	}
	await getSender()(input);
}

function layout(title: string, body: string): string {
	return `<div style="font-family:system-ui,sans-serif;max-width:32rem;margin:0 auto;padding:1rem">
<h2>${title}</h2>
${body}
<p style="color:#666;font-size:0.85rem">— Cover Voice</p>
</div>`;
}

/**
 * NOTE: no URL rewriting is needed. better-auth already builds email links
 * under its mount path (`${BETTER_AUTH_URL}/api/auth/verify-email...`),
 * which reaches the backend through the same-origin /api proxy (Vite dev,
 * preview) and Caddy in production.
 */
export async function sendVerificationEmail(input: { to: string; url: string }): Promise<void> {
	await deliver({
		to: input.to,
		subject: 'Verify your Cover Voice email',
		html: layout(
			'Verify your email',
			`<p>Click the link below to verify your email address:</p>
<p><a href="${input.url}">Verify email</a></p>
<p style="color:#666;font-size:0.85rem">If you did not create this account, you can ignore this email.</p>`
		)
	});
}

export async function sendPasswordResetEmail(input: { to: string; url: string }): Promise<void> {
	await deliver({
		to: input.to,
		subject: 'Reset your Cover Voice password',
		html: layout(
			'Reset your password',
			`<p>Click the link below to reset your password. It expires in one hour:</p>
<p><a href="${input.url}">Reset password</a></p>
<p style="color:#666;font-size:0.85rem">If you did not request this, you can ignore this email.</p>`
		)
	});
}
