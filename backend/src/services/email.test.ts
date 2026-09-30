import { describe, it, expect } from 'vitest';
import { emailOutbox, sendPasswordResetEmail, sendVerificationEmail } from './email.js';

describe('email templates', () => {
	it('verification mail links straight to the backend mount', async () => {
		await sendVerificationEmail({
			to: 'a@example.com',
			url: 'http://localhost/api/auth/verify-email?token=t'
		});
		const last = emailOutbox[emailOutbox.length - 1];
		expect(last.to).toBe('a@example.com');
		expect(last.subject).toContain('Verify');
		expect(last.html).toContain('http://localhost/api/auth/verify-email?token=t');
	});

	it('reset mail links straight to the backend mount with expiry note', async () => {
		await sendPasswordResetEmail({
			to: 'b@example.com',
			url: 'http://localhost/api/auth/reset-password/t'
		});
		const last = emailOutbox[emailOutbox.length - 1];
		expect(last.to).toBe('b@example.com');
		expect(last.subject).toContain('Reset');
		expect(last.html).toContain('http://localhost/api/auth/reset-password/t');
		expect(last.html).toContain('one hour');
	});
});
