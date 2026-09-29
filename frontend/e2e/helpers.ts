import { expect, type Page } from '@playwright/test';

export function randomEmail(prefix = 'user') {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function signUp(page: Page, email: string, name = 'E2E User') {
	await page.goto('/signup');
	await page.getByLabel('Name').fill(name);
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password', { exact: true }).fill('password123');
	await page.getByLabel('Password Confirmation').fill('password123');
	await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
	await expect(page.getByText('Check your inbox')).toBeVisible();
}

function hrefFromHtml(html: string): string {
	const match = html.match(/href="([^"]+)"/);
	if (!match) throw new Error('No link found in email');
	return match[1];
}

/** Reads the backend test outbox (no real inbox in e2e) and follows the
 * latest emailed link for the given address. */
export async function followLatestEmailLink(page: Page, email: string) {
	const res = await page.request.get(`/api/test/outbox?to=${encodeURIComponent(email)}`);
	expect(res.ok()).toBeTruthy();
	const { emails } = await res.json();
	expect(emails.length).toBeGreaterThan(0);
	await page.goto(hrefFromHtml(emails[emails.length - 1].html));
}

export async function verifyEmail(page: Page, email: string) {
	await followLatestEmailLink(page, email);
	await expect(page.getByText('Your email is verified')).toBeVisible();
}

export async function signUpVerified(page: Page, email: string, name = 'E2E User') {
	await signUp(page, email, name);
	await verifyEmail(page, email);
}

export async function signIn(page: Page, email: string, password = 'password123') {
	await page.goto('/signin');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Sign In', exact: true }).click();
	await expect(page).toHaveURL('/me');
}

export async function signOut(page: Page) {
	await page.goto('/me');
	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page.getByRole('link', { name: 'Sign In' }).first()).toBeVisible();
}
