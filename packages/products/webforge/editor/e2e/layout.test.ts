import { test, expect } from '@playwright/test';

test.describe('layout', () => {
	test('page loads with correct title', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle('WebForge');
	});

	test('meta description is present', async ({ page }) => {
		await page.goto('/');
		const description = page.locator('meta[name="description"]');
		await expect(description).toHaveAttribute('content', /HD-2D/);
	});

	test('meta application-name is WebForge', async ({ page }) => {
		await page.goto('/');
		const appName = page.locator('meta[name="application-name"]');
		await expect(appName).toHaveAttribute('content', 'WebForge');
	});

	test('og:locale defaults to en_US', async ({ page }) => {
		await page.goto('/');
		const ogLocale = page.locator('meta[property="og:locale"]');
		await expect(ogLocale).toHaveAttribute('content', 'en_US');
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
