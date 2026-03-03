import { test, expect } from '@playwright/test';

test.describe('theme switcher', () => {
	test('opens user menu and shows theme sub-menu', async ({ page }) => {
		await page.goto('/');
		await page.getByText('WebForge Project').click();
		// Wait for dropdown content to render
		await expect(page.getByText('Open Project')).toBeVisible();
		await expect(page.getByText('Theme', { exact: true })).toBeVisible();
	});

	test('theme sub-menu shows theme options with color dots', async ({ page }) => {
		await page.goto('/');
		await page.getByText('WebForge Project').click();
		await expect(page.getByText('Open Project')).toBeVisible();
		await page.getByText('Theme', { exact: true }).hover();
		await page.waitForTimeout(300);
		// Verify several theme names are visible
		await expect(page.getByRole('menuitem', { name: /Default/ })).toBeVisible();
		await expect(page.getByRole('menuitem', { name: /Midnight/ })).toBeVisible();
		await expect(page.getByRole('menuitem', { name: /Forest/ })).toBeVisible();
	});

	test('selecting a theme updates data-theme attribute', async ({ page }) => {
		await page.goto('/');
		await page.getByText('WebForge Project').click();
		await expect(page.getByText('Open Project')).toBeVisible();
		await page.getByText('Theme', { exact: true }).hover();
		await page.waitForTimeout(300);
		await page.getByRole('menuitem', { name: /Midnight/ }).click();
		// data-theme should be set on html element
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');
	});

	test('selecting default theme clears data-theme', async ({ page }) => {
		await page.goto('/');
		// First set a theme
		await page.getByText('WebForge Project').click();
		await expect(page.getByText('Open Project')).toBeVisible();
		await page.getByText('Theme', { exact: true }).hover();
		await page.waitForTimeout(300);
		await page.getByRole('menuitem', { name: /Midnight/ }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');
		// Now set default
		await page.getByText('WebForge Project').click();
		await expect(page.getByText('Open Project')).toBeVisible();
		await page.getByText('Theme', { exact: true }).hover();
		await page.waitForTimeout(300);
		await page.getByRole('menuitem', { name: /Default/ }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', '');
	});
});
