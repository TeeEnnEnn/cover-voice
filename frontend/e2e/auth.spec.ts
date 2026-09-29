import { expect, test } from '@playwright/test';
import {
	followLatestEmailLink,
	randomEmail,
	signIn,
	signOut,
	signUp,
	signUpVerified
} from './helpers';

test('sign up requires verification, then sign out and back in', async ({ page }) => {
	const email = randomEmail('auth');

	await signUp(page, email, 'Auth User');

	// Unverified sign-in is rejected with a resend offer.
	await page.goto('/signin');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill('password123');
	await page.getByRole('button', { name: 'Sign In', exact: true }).click();
	await expect(page.getByText('Email not verified')).toBeVisible();
	await page.getByRole('button', { name: 'Resend verification email' }).click();
	await expect(page.getByText('Verification email sent')).toBeVisible();

	// Follow the latest link: verification auto-signs in.
	await followLatestEmailLink(page, email);
	await expect(page.getByText('Your email is verified')).toBeVisible();
	await page.goto('/me');
	await expect(page.getByText('Auth User').first()).toBeVisible();

	await signOut(page);

	await signIn(page, email);
	await expect(page.getByText('Auth User').first()).toBeVisible();
});

test('verified signup helper lands authenticated', async ({ page }) => {
	await signUpVerified(page, randomEmail('auth-helper'), 'Helper User');
	await page.goto('/me');
	await expect(page.getByText('Helper User').first()).toBeVisible();
});
