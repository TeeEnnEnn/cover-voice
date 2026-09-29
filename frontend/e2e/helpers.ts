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
	await expect(page).toHaveURL('/me');
	await expect(page.getByText(name).first()).toBeVisible();
	// The header session lags one navigation behind client-side auth
	// (layout load runs before the session cookie lands), so reload once.
	await page.reload();
	await expect(page.getByText(name).first()).toBeVisible();
}

export async function signIn(page: Page, email: string) {
	await page.goto('/signin');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill('password123');
	await page.getByRole('button', { name: 'Sign In', exact: true }).click();
	await expect(page).toHaveURL('/me');
	await page.reload();
}
