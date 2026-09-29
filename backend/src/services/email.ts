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

function logoUrl(): string | null {
	const base = (process.env.BETTER_AUTH_URL ?? '').replace(/\/+$/, '');
	return base ? `${base}/Cover-Voice_100x100.png` : null;
}

function layout(title: string, body: string): string {
	const logo = logoUrl();
	return `<div style="font-family:system-ui,sans-serif;background-color:#0c0f0a;margin:0;padding:2rem 1rem">
<div style="max-width:32rem;margin:0 auto;text-align:center">${
		logo
			? `<img src="${logo}" alt="Cover Voice" width="72" height="72" style="border-radius:12px;display:block;margin:0 auto 1rem;" />`
			: ''
	}</div>
<div style="font-family:system-ui,sans-serif;max-width:32rem;margin:0 auto;padding:1.5rem;background-color:#ffffff;border-radius:12px">
<h2 style="color:#0c0f0a;margin-top:0">${title}</h2>
${body}
<p style="color:#666;font-size:0.85rem">— Cover Voice</p>
</div>
</div>`;
}

function ctaButton(url: string, label: string): string {
	return `<p><a href="${url}" style="display:inline-block;background-color:#ff206e;color:#ffffff;text-decoration:none;padding:0.75rem 1.5rem;border-radius:8px;font-weight:600">${label}</a></p>`;
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
			`<p style="color:#333">Click the button below to verify your email address:</p>
${ctaButton(input.url, 'Verify email')}
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
			`<p style="color:#333">Click the button below to reset your password. It expires in one hour:</p>
${ctaButton(input.url, 'Reset password')}
<p style="color:#666;font-size:0.85rem">If you did not request this, you can ignore this email.</p>`
		)
	});
}
