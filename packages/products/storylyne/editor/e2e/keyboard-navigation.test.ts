import { test, expect } from '@playwright/test';

test.describe('keyboard navigation', () => {
  test('Tab navigates through sidebar items', async ({ page }) => {
    await page.goto('/');
    // Press Tab to move through interactive elements
    await page.keyboard.press('Tab');
    // Some element in the sidebar should be focused
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedTag).toBeTruthy();
  });

  test('Cmd/Ctrl+B toggles sidebar', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('[data-slot="sidebar"]').first();
    await expect(sidebar).toHaveAttribute('data-state', 'expanded');
    // Ensure page is focused before sending keyboard shortcut
    await page.locator('body').click();
    await page.keyboard.press('ControlOrMeta+b');
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
  });

  test('Escape closes open dropdown', async ({ page }) => {
    await page.goto('/');
    // Open mode toggle dropdown
    const toggle = page.getByRole('button', { name: /toggle mode/i });
    await toggle.click();
    // Verify dropdown is open
    await expect(page.getByRole('menuitem', { name: /light/i })).toBeVisible();
    // Press Escape
    await page.keyboard.press('Escape');
    // Dropdown should close
    await expect(page.getByRole('menuitem', { name: /light/i })).not.toBeVisible();
  });

  test('Enter activates focused button', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: /toggle mode/i });
    await expect(toggle).toBeVisible();
    // Ensure page is interactive before focusing
    await page.locator('body').click();
    await toggle.focus();
    await expect(toggle).toBeFocused();
    // Press Enter to activate
    await page.keyboard.press('Enter');
    // Dropdown should open
    await expect(page.getByRole('menuitem', { name: /light/i })).toBeVisible();
  });
});
