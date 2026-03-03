import { test, expect } from '@playwright/test';

test.describe('layout', () => {
	test('page loads with correct title', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle('WebForge');
	});

	test('sidebar is visible on desktop', async ({ page }) => {
		await page.goto('/');
		const sidebar = page.locator('[data-slot="sidebar"]');
		await expect(sidebar.first()).toBeAttached();
	});

	test('breadcrumb contains Editor and Scene', async ({ page }) => {
		await page.goto('/');
		const breadcrumb = page.locator('nav[aria-label="breadcrumb"], ol');
		await expect(breadcrumb.getByText('Editor')).toBeVisible();
		await expect(breadcrumb.getByText('Scene')).toBeVisible();
	});
});
