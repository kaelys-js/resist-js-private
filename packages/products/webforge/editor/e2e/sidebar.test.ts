import { test, expect } from '@playwright/test';

test.describe('sidebar', () => {
	test('sidebar renders with WebForge branding', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('WebForge', { exact: true }).first()).toBeVisible();
		await expect(page.getByText('RPG Editor', { exact: true })).toBeVisible();
	});

	test('scene list renders with default scenes', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Scenes')).toBeVisible();
		await expect(page.getByText('Overworld')).toBeVisible();
	});

	test('new scene button is present', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('New Scene')).toBeVisible();
	});

	test('assets section renders', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Assets')).toBeVisible();
		await expect(page.getByText('Tilesets')).toBeVisible();
	});

	test('sidebar toggle collapses sidebar', async ({ page }) => {
		await page.goto('/');
		const sidebarWrapper = page.locator('[data-slot="sidebar"]').first();
		await expect(sidebarWrapper).toHaveAttribute('data-state', 'expanded');

		// Ensure page is interactive before sending keyboard shortcut
		await page.locator('body').click();
		await page.keyboard.press('ControlOrMeta+b');
		await expect(sidebarWrapper).toHaveAttribute('data-state', 'collapsed');
	});
});
