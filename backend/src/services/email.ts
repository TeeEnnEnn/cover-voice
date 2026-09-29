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

let sender: EmailSender | null = null;

/** Test hook: replaces the Resend sender (e.g. with an in-memory collector). */
export function setEmailSender(fake: EmailSender | null): void {
	sender = fake;
}

function getSender(): EmailSender {
	if (!sender) sender = createResendSender();
	return sender;
}

function layout(title: string, body: string): string {
	return `<div style="font-family:system-ui,sans-serif;max-width:32rem;margin:0 auto;padding:1rem">
<h2>${title}</h2>
${body}
<p style="color:#666;font-size:0.85rem">— Cover Voice</p>
</div>`;
}

export async function sendVerificationEmail(input: { to: string; url: string }): Promise<void> {
	await getSender()({
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
	await getSender()({
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
