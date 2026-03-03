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
		await expect(header.getByText('Editor')).toBeVisible();
		await expect(header.getByText('Scene')).toBeVisible();
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
		await expect(page.getByText('Assets')).toBeVisible();
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
// Collapsed sidebar — tooltips
// =============================================================================

test.describe('collapsed sidebar — tooltips', () => {
	test('hovering scene item in collapsed sidebar shows tooltip', async ({ page }) => {
		await page.goto('/');
		await page.locator('body').click();

		// Collapse sidebar
		await page.keyboard.press('ControlOrMeta+b');
		const sidebar = page.locator('[data-slot="sidebar"]').first();
		await expect(sidebar).toHaveAttribute('data-state', 'collapsed');

		// Hover the first scene menu button (Overworld)
		const sceneButton = page
			.locator('[data-sidebar="menu-button"]')
			.filter({ hasText: 'Overworld' });
		await sceneButton.hover();

		// Tooltip should appear with scene title
		const tooltip = page.locator('[data-slot="tooltip-content"]');
		await expect(tooltip).toBeVisible();
		await expect(tooltip).toContainText('Overworld');
	});

	test('hovering asset item in collapsed sidebar shows tooltip', async ({ page }) => {
		await page.goto('/');
		await page.locator('body').click();

		// Collapse sidebar
		await page.keyboard.press('ControlOrMeta+b');
		await expect(page.locator('[data-slot="sidebar"]').first()).toHaveAttribute(
			'data-state',
			'collapsed',
		);

		// Hover the Tilesets menu button
		const assetButton = page
			.locator('[data-sidebar="menu-button"]')
			.filter({ hasText: 'Tilesets' });
		await assetButton.hover();

		// Tooltip should appear
		const tooltip = page.locator('[data-slot="tooltip-content"]');
		await expect(tooltip).toBeVisible();
		await expect(tooltip).toContainText('Tilesets');
	});

	test('tooltip disappears on mouse leave', async ({ page }) => {
		await page.goto('/');
		await page.locator('body').click();

		// Collapse sidebar
		await page.keyboard.press('ControlOrMeta+b');
		await expect(page.locator('[data-slot="sidebar"]').first()).toHaveAttribute(
			'data-state',
			'collapsed',
		);

		// Hover to show tooltip
		const sceneButton = page
			.locator('[data-sidebar="menu-button"]')
			.filter({ hasText: 'Overworld' });
		await sceneButton.hover();
		const tooltip = page.locator('[data-slot="tooltip-content"]');
		await expect(tooltip).toBeVisible();

		// Move mouse away
		await page.mouse.move(0, 0);
		await expect(tooltip).not.toBeVisible();
	});

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
