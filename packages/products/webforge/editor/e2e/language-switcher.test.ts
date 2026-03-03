import { test, expect } from '@playwright/test';

test.describe('language switcher', () => {
	test('opens user menu and shows language sub-menu', async ({ page }) => {
		await page.goto('/');
		// Click user menu in sidebar footer
		const userButton = page.getByText('WebForge Project');
		await userButton.click();
		// Language sub-trigger should appear
		await expect(page.getByText('Language')).toBeVisible();
	});

	test('language sub-menu shows all 7 languages', async ({ page }) => {
		await page.goto('/');
		const userButton = page.getByText('WebForge Project');
		await userButton.click();
		// Wait for dropdown to render, then hover Language sub-trigger
		await expect(page.getByText('Language')).toBeVisible();
		await page.getByText('Language').hover();
		await page.waitForTimeout(300);
		// All 7 languages should be visible
		await expect(page.getByText('English')).toBeVisible();
		await expect(page.getByText('日本語')).toBeVisible();
		await expect(page.getByText('中文')).toBeVisible();
		await expect(page.getByText('한국어')).toBeVisible();
		await expect(page.getByText('Français')).toBeVisible();
		await expect(page.getByText('Deutsch')).toBeVisible();
		await expect(page.getByText('Español')).toBeVisible();
	});

	test('switching language updates html lang attribute', async ({ page }) => {
		await page.goto('/');
		// Verify default is English
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
		// Open user menu → Language → Japanese
		await page.getByText('WebForge Project').click();
		await expect(page.getByText('Language')).toBeVisible();
		await page.getByText('Language').hover();
		await page.waitForTimeout(300);
		await page.getByText('日本語').click();
		// html[lang] should update
		await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
	});

	test('switching language sets locale cookie', async ({ page }) => {
		await page.goto('/');
		await page.getByText('WebForge Project').click();
		await expect(page.getByText('Language')).toBeVisible();
		await page.getByText('Language').hover();
		await page.waitForTimeout(300);
		await page.getByText('Français').click();
		await page.waitForTimeout(200);
		// Check the cookie was set via document.cookie
		const cookie = await page.evaluate(() => document.cookie);
		expect(cookie).toContain('locale=fr');
	});
});
