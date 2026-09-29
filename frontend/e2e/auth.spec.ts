import { expect, test } from '@playwright/test';
import { randomEmail, signIn, signUp } from './helpers';

test('sign up, sign out, and sign back in', async ({ page }) => {
	const email = randomEmail('auth');

	await signUp(page, email, 'Auth User');

	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page.getByRole('link', { name: 'Sign In' }).first()).toBeVisible();

	await signIn(page, email);
	await expect(page.getByText('Auth User').first()).toBeVisible();
});
