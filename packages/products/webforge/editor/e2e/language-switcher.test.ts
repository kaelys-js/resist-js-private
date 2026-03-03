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

	test('language sub-menu shows dual display names (endonym + exonym)', async ({ page }) => {
		await page.goto('/');
		await page.getByText('WebForge Project').click();
		await expect(page.getByText('Language')).toBeVisible();
		await page.getByText('Language').hover();
		await page.waitForTimeout(300);
		// Non-English languages show endonym + exonym in parentheses
		// Japanese: 日本語 (Japanese)
		await expect(page.getByText('日本語')).toBeVisible();
		await expect(page.getByText(/Japanese/)).toBeVisible();
		// French: Français (French)
		await expect(page.getByText('Français')).toBeVisible();
		await expect(page.getByText(/French/)).toBeVisible();
		// English should NOT show exonym since endonym === exonym
		await expect(page.getByText('(English)')).not.toBeVisible();
	});

	test('switching locale updates exonym language format', async ({ page }) => {
		await page.goto('/');
		// Switch to French
		await page.getByText('WebForge Project').click();
		await expect(page.getByText('Language')).toBeVisible();
		await page.getByText('Language').hover();
		await page.waitForTimeout(300);
		await page.getByText('Français').click();
		await page.waitForTimeout(500);
		// Verify locale changed
		await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

		// Re-open language sub-menu — trigger text is now in French
		// Use .first() because Bits UI popover may still have a duplicate text node
		await page.getByText('WebForge Project').first().click();
		const langTrigger = page.locator('[role="menuitem"]').filter({ hasText: /Langue|Language/ });
		await expect(langTrigger).toBeVisible();
		await langTrigger.hover();
		await page.waitForTimeout(300);
		// Japanese exonym in French locale should be "japonais"
		await expect(page.getByText(/japonais/i)).toBeVisible();
	});
});
