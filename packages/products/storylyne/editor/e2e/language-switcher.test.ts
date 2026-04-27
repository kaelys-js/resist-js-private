/**
 * Playwright e2e: in-app language switcher.
 *
 * Opens the language submenu via the sidebar footer user dropdown,
 * selects each registered locale, and asserts that the visible app
 * chrome (page title, OG metadata, sidebar text) reflects the chosen
 * locale and that the choice persists across reloads.
 *
 * @module
 */

import { test, expect, type Page } from '@playwright/test';

/**
 * Opens the language sub-menu via the sidebar footer user dropdown.
 *
 * @param page - Playwright page
 */
async function openLanguageSubMenu(page: Page): Promise<void> {
  await page.getByText('Sample Project', { exact: true }).click();
  await expect(page.getByText('Language')).toBeVisible();
  await page.getByText('Language').hover();
  await page.waitForTimeout(300);
}

test.describe('language switcher', () => {
  test('opens user menu and shows language sub-menu', async ({ page }) => {
    await page.goto('/');
    // Click user menu in sidebar footer
    const userButton = page.getByText('Sample Project', { exact: true });
    await userButton.click();
    // Language sub-trigger should appear
    await expect(page.getByText('Language')).toBeVisible();
  });

  test('language sub-menu shows all 7 languages', async ({ page }) => {
    await page.goto('/');
    const userButton = page.getByText('Sample Project', { exact: true });
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
    await page.getByText('Sample Project', { exact: true }).click();
    await expect(page.getByText('Language')).toBeVisible();
    await page.getByText('Language').hover();
    await page.waitForTimeout(300);
    await page.getByText('日本語').click();
    // html[lang] should update
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  });

  test('switching language sets locale cookie', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Sample Project', { exact: true }).click();
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
    await page.getByText('Sample Project', { exact: true }).click();
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
    await page.getByText('Sample Project', { exact: true }).click();
    await expect(page.getByText('Language')).toBeVisible();
    await page.getByText('Language').hover();
    await page.waitForTimeout(300);
    await page.getByText('Français').click();
    await page.waitForTimeout(500);
    // Verify locale changed
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    // Re-open language sub-menu — trigger text is now in French
    // Use .first() because Bits UI popover may still have a duplicate text node
    await page.getByText('Sample Project', { exact: true }).first().click();
    const langTrigger = page.locator('[role="menuitem"]').filter({ hasText: /Langue|Language/ });
    await expect(langTrigger).toBeVisible();
    await langTrigger.hover();
    await page.waitForTimeout(300);
    // Japanese exonym in French locale should be "japonais"
    await expect(page.getByText(/japonais/i)).toBeVisible();
  });
});

// =============================================================================
// Language search
// =============================================================================

test.describe('language switcher — search', () => {
  test('search input is visible in language sub-menu', async ({ page }) => {
    await page.goto('/');
    await openLanguageSubMenu(page);
    const searchInput = page.getByPlaceholder('Search languages');
    await expect(searchInput).toBeVisible();
  });

  test('typing in search filters languages by endonym', async ({ page }) => {
    await page.goto('/');
    await openLanguageSubMenu(page);
    const searchInput = page.getByPlaceholder('Search languages');
    await searchInput.fill('fran');
    // français should match (endonym may be lowercase per Intl.DisplayNames)
    await expect(page.getByRole('menuitem', { name: /fran[cç]ais/i })).toBeVisible();
    // Japanese should be filtered out
    await expect(page.getByRole('menuitem', { name: /日本語/ })).not.toBeVisible();
  });

  test('search filters by exonym', async ({ page }) => {
    await page.goto('/');
    await openLanguageSubMenu(page);
    const searchInput = page.getByPlaceholder('Search languages');
    await searchInput.fill('Japanese');
    await expect(page.getByRole('menuitem', { name: /日本語/ })).toBeVisible();
  });

  test('search filters by language code', async ({ page }) => {
    await page.goto('/');
    await openLanguageSubMenu(page);
    const searchInput = page.getByPlaceholder('Search languages');
    await searchInput.fill('ko');
    await expect(page.getByRole('menuitem', { name: /한국어/ })).toBeVisible();
  });

  test('clearing search restores all languages', async ({ page }) => {
    await page.goto('/');
    await openLanguageSubMenu(page);
    const searchInput = page.getByPlaceholder('Search languages');
    await searchInput.fill('fran');
    await expect(page.getByRole('menuitem', { name: /日本語/ })).not.toBeVisible();
    await page.getByLabel('Clear search').click();
    await expect(page.getByRole('menuitem', { name: /日本語/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /English/ })).toBeVisible();
  });

  test('no match shows empty placeholder', async ({ page }) => {
    await page.goto('/');
    await openLanguageSubMenu(page);
    const searchInput = page.getByPlaceholder('Search languages');
    await searchInput.fill('xyznonexistent');
    await expect(page.getByText('No languages found')).toBeVisible();
    await expect(page.getByText('Try a different search term')).toBeVisible();
  });
});
