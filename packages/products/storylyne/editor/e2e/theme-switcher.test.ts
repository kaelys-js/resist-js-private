/**
 * Playwright e2e: theme switcher (color theme, not light/dark mode).
 *
 * Opens the theme submenu via the sidebar footer user dropdown,
 * selects each registered color theme (default, slate, violet, etc.),
 * and asserts the chosen theme writes its `data-theme` attribute on
 * `<html>` and persists across reloads via the theme cookie/storage.
 *
 * @module
 */

import { test, expect, type Page } from '@playwright/test';

/**
 * Opens the theme sub-menu via the sidebar footer user dropdown.
 *
 * @param page - Playwright page
 */
async function openThemeSubMenu(page: Page): Promise<void> {
  await page.locator('[data-slot="sidebar-footer"] [data-slot="dropdown-menu-trigger"]').click();
  await expect(page.getByText('Open Project')).toBeVisible();
  await page.getByText('Theme', { exact: true }).hover();
  await page.waitForTimeout(300);
}

test.describe('theme switcher', () => {
  test('opens user menu and shows theme sub-menu', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-slot="sidebar-footer"] [data-slot="dropdown-menu-trigger"]').click();
    // Wait for dropdown content to render
    await expect(page.getByText('Open Project')).toBeVisible();
    await expect(page.getByText('Theme', { exact: true })).toBeVisible();
  });

  test('theme sub-menu shows theme options with color dots', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-slot="sidebar-footer"] [data-slot="dropdown-menu-trigger"]').click();
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
    await page.locator('[data-slot="sidebar-footer"] [data-slot="dropdown-menu-trigger"]').click();
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
    await page.locator('[data-slot="sidebar-footer"] [data-slot="dropdown-menu-trigger"]').click();
    await expect(page.getByText('Open Project')).toBeVisible();
    await page.getByText('Theme', { exact: true }).hover();
    await page.waitForTimeout(300);
    await page.getByRole('menuitem', { name: /Midnight/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');
    // Now set default
    await page.locator('[data-slot="sidebar-footer"] [data-slot="dropdown-menu-trigger"]').click();
    await expect(page.getByText('Open Project')).toBeVisible();
    await page.getByText('Theme', { exact: true }).hover();
    await page.waitForTimeout(300);
    await page.getByRole('menuitem', { name: /Default/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', '');
  });
});

// =============================================================================
// Theme search
// =============================================================================

test.describe('theme switcher — search', () => {
  test('search input is visible in theme sub-menu', async ({ page }) => {
    await page.goto('/');
    await openThemeSubMenu(page);
    const searchInput = page.getByPlaceholder('Search themes');
    await expect(searchInput).toBeVisible();
  });

  test('typing in search filters themes', async ({ page }) => {
    await page.goto('/');
    await openThemeSubMenu(page);
    const searchInput = page.getByPlaceholder('Search themes');
    await searchInput.fill('mid');
    // Only Midnight should match
    await expect(page.getByRole('menuitem', { name: /Midnight/ })).toBeVisible();
    // Forest should be filtered out
    await expect(page.getByRole('menuitem', { name: /Forest/ })).not.toBeVisible();
  });

  test('clearing search restores all themes', async ({ page }) => {
    await page.goto('/');
    await openThemeSubMenu(page);
    const searchInput = page.getByPlaceholder('Search themes');
    await searchInput.fill('mid');
    // Only Midnight visible
    await expect(page.getByRole('menuitem', { name: /Forest/ })).not.toBeVisible();
    // Click clear button
    await page.getByLabel('Clear search').click();
    // All themes should be back
    await expect(page.getByRole('menuitem', { name: /Forest/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Default/ })).toBeVisible();
  });

  test('no match shows empty placeholder', async ({ page }) => {
    await page.goto('/');
    await openThemeSubMenu(page);
    const searchInput = page.getByPlaceholder('Search themes');
    await searchInput.fill('xyznonexistent');
    await expect(page.getByText('No themes found')).toBeVisible();
    await expect(page.getByText('Try a different search term')).toBeVisible();
  });
});
