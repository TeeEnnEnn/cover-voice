import { expect, test } from '@playwright/test';

test('backend reports healthy with database reachable', async ({ request }) => {
	const res = await request.get('/api/health');
	expect(res.ok()).toBeTruthy();
	const body = await res.json();
	expect(body.status).toBe('ok');
	expect(body.db).toBe('ok');
});

test('landing page renders hero, steps, faq, and CTAs', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: /Write it once/ })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Frequently asked questions' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Get started' }).first()).toBeVisible();
	// FAQ accordion expands.
	await page.getByText('What are blocks and variables?').click();
	await expect(page.getByText('Reusable chunks of text', { exact: false }).first()).toBeVisible();
});
