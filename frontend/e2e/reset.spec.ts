import { expect, test } from '@playwright/test';
import { randomEmail, signIn, signOut, signUpVerified } from './helpers';

function resetTokenFromHtml(html: string): string {
	const match = html.match(/href="([^"]+)"/);
	if (!match) throw new Error('No link found in email');
	const url = new URL(match[1]);
	const segments = url.pathname.split('/');
	return segments[segments.length - 1];
}

test('password reset loop works end to end', async ({ page }) => {
	const email = randomEmail('reset');
	await signUpVerified(page, email, 'Reset User');
	await signOut(page);

	await page.goto('/forgot-password');
	await page.getByLabel('Email').fill(email);
	await page.getByRole('button', { name: 'Send reset link' }).click();
	await expect(page.getByText('a reset link is on its way')).toBeVisible();

	const res = await page.request.get(`/api/test/outbox?to=${encodeURIComponent(email)}`);
	const { emails } = await res.json();
	const token = resetTokenFromHtml(emails[emails.length - 1].html);

	await page.goto(`/reset-password?token=${token}`);
	await page.getByLabel('New password', { exact: true }).fill('newpassword456');
	await page.getByLabel('Confirm new password').fill('newpassword456');
	await page.getByRole('button', { name: 'Set new password' }).click();
	await expect(page).toHaveURL('/signin');

	await signIn(page, email, 'newpassword456');
	await expect(page.getByText('Reset User').first()).toBeVisible();
});

test('unknown emails get a neutral response', async ({ page }) => {
	await page.goto('/forgot-password');
	await page.getByLabel('Email').fill(`nobody-${Date.now()}@example.com`);
	await page.getByRole('button', { name: 'Send reset link' }).click();
	await expect(page.getByText('a reset link is on its way')).toBeVisible();
});
