import { expect, test } from '@playwright/test';
import { randomEmail, signUpVerified } from './helpers';

test('account page requires signing in', async ({ page }) => {
	await page.goto('/me');
	await expect(page).toHaveURL(/\/signin/);
});

test('signed-in user can add and list a block', async ({ page }) => {
	await signUpVerified(page, randomEmail('items'), 'Item User');
	await page.goto('/me');

	const blockName = `groceries-${Date.now()}`;
	await page.getByRole('button', { name: 'New Block' }).click();
	await page.getByLabel('block name').fill(blockName);
	await page.getByLabel('block value').fill('Groceries');
	await page.getByRole('button', { name: 'Create', exact: true }).click();
	await expect(page.getByText(blockName).first()).toBeVisible();
});
