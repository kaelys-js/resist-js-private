import { test, expect } from '@playwright/test';

// =============================================================================
// Collapsed sidebar — state & content
// =============================================================================

test.describe('collapsed sidebar — state', () => {
  test('sidebar collapses to icon mode via keyboard shortcut', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('[data-slot="sidebar"]').first();
    await expect(sidebar).toHaveAttribute('data-state', 'expanded');

    await page.locator('body').click();
    await page.keyboard.press('ControlOrMeta+b');
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
    await expect(sidebar).toHaveAttribute('data-collapsible', 'icon');
  });

  test('sidebar toggle button remains visible when collapsed', async ({ page }) => {
    await page.goto('/');
    await page.locator('body').click();
    await page.keyboard.press('ControlOrMeta+b');

    const trigger = page.locator('button[data-sidebar="trigger"]');
    await expect(trigger).toBeVisible();
  });

  test('breadcrumb and header remain visible when sidebar collapsed', async ({ page }) => {
    await page.goto('/');
    await page.locator('body').click();
    await page.keyboard.press('ControlOrMeta+b');

    const header = page.locator('header');
    await expect(header.getByText('Home')).toBeVisible();
  });

  test('toggle back expands sidebar and shows text labels', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('[data-slot="sidebar"]').first();
    await page.locator('body').click();

    // Collapse
    await page.keyboard.press('ControlOrMeta+b');
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed');

    // Expand
    await page.keyboard.press('ControlOrMeta+b');
    await expect(sidebar).toHaveAttribute('data-state', 'expanded');
    await expect(sidebar).toHaveAttribute('data-collapsible', '');

    // Text labels visible again
    await expect(page.getByText('Scenes')).toBeVisible();
    await expect(page.getByText('Overworld')).toBeVisible();
  });

  test('collapsed sidebar state persists across reload', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('[data-slot="sidebar"]').first();
    await page.locator('body').click();

    // Collapse
    await page.keyboard.press('ControlOrMeta+b');
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed');

    // Reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Still collapsed
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
  });
});

// =============================================================================
// Collapsed sidebar — scenes popover
// =============================================================================

test.describe('collapsed sidebar — scenes popover', () => {
  test('collapsed sidebar shows a map icon trigger for scenes', async ({ page }) => {
    await page.goto('/');
    await page.locator('body').click();

    // Collapse sidebar
    await page.keyboard.press('ControlOrMeta+b');
    const sidebar = page.locator('[data-slot="sidebar"]').first();
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed');

    // The scenes popover trigger should be visible
    const popoverTrigger = page.locator('[data-testid="scenes-popover-trigger"]');
    await expect(popoverTrigger).toBeVisible();
  });

  test('clicking map icon opens scenes popover', async ({ page }) => {
    await page.goto('/');
    await page.locator('body').click();

    // Collapse sidebar
    await page.keyboard.press('ControlOrMeta+b');
    const sidebar = page.locator('[data-slot="sidebar"]').first();
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed');

    // Click the popover trigger (first menu button in the sidebar content area)
    const popoverTrigger = page.locator('[data-testid="scenes-popover-trigger"]');
    await popoverTrigger.click();

    // Popover should open with scene names
    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover).toBeVisible();
    await expect(popover.getByText('Overworld')).toBeVisible();
    await expect(popover.getByText('Dungeon B1')).toBeVisible();
    await expect(popover.getByText('New Scene')).toBeVisible();
  });

  test('popover closes when clicking outside', async ({ page }) => {
    await page.goto('/');
    await page.locator('body').click();

    // Collapse sidebar
    await page.keyboard.press('ControlOrMeta+b');
    const sidebar = page.locator('[data-slot="sidebar"]').first();
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed');

    // Open popover
    const popoverTrigger = page.locator('[data-testid="scenes-popover-trigger"]');
    await popoverTrigger.click();
    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover).toBeVisible();

    // Focus inside the popover, then press Escape to dismiss
    await popover.focus();
    await page.keyboard.press('Escape');
    await expect(popover).not.toBeVisible();
  });

  test('expanding sidebar after using popover restores normal collapsible view', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('body').click();

    // Collapse
    await page.keyboard.press('ControlOrMeta+b');
    const sidebar = page.locator('[data-slot="sidebar"]').first();
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed');

    // Expand
    await page.keyboard.press('ControlOrMeta+b');
    await expect(sidebar).toHaveAttribute('data-state', 'expanded');

    // Normal collapsible view should be back
    await expect(page.getByText('Scenes')).toBeVisible();
    await expect(page.getByText('Overworld')).toBeVisible();
    const groupLabel = page.locator('[data-slot="sidebar-group-label"]').first();
    await expect(groupLabel).toBeVisible();
  });
});

// =============================================================================
// Collapsed sidebar — tooltips
// =============================================================================

test.describe('collapsed sidebar — tooltips', () => {
  test('tooltips are hidden when sidebar is expanded', async ({ page }) => {
    await page.goto('/');

    // Sidebar is expanded by default — hover a menu button with tooltipContent
    const sceneButton = page
      .locator('[data-sidebar="menu-button"]')
      .filter({ hasText: 'Overworld' });
    await sceneButton.hover();

    // Tooltip should NOT be visible (hidden prop = true when expanded)
    const tooltip = page.locator('[data-slot="tooltip-content"]');
    await expect(tooltip).not.toBeVisible();
  });
});
