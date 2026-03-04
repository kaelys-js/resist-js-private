import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 375, height: 812 };

// =============================================================================
// Mobile sidebar — open / close / toggle
// =============================================================================

test.describe('mobile sidebar — open/close/toggle', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize(MOBILE_VIEWPORT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('sidebar is not visible on mobile initial load', async ({ page }) => {
		// On mobile, the sidebar renders as a Sheet that starts closed
		const mobileSidebar = page.locator('[data-mobile="true"][data-sidebar="sidebar"]');
		await expect(mobileSidebar).not.toBeVisible();
	});

	test('sidebar trigger button is visible on mobile', async ({ page }) => {
		const trigger = page.locator('button[data-sidebar="trigger"]');
		await expect(trigger).toBeVisible();
	});

	test('clicking trigger opens sidebar as Sheet modal', async ({ page }) => {
		const trigger = page.locator('button[data-sidebar="trigger"]');
		await trigger.click();

		// Sheet sidebar should appear with data-mobile="true"
		const mobileSidebar = page.locator('[data-mobile="true"][data-sidebar="sidebar"]');
		await expect(mobileSidebar).toBeVisible();
	});

	test('mobile sidebar shows full content', async ({ page }) => {
		const trigger = page.locator('button[data-sidebar="trigger"]');
		await trigger.click();

		const mobileSidebar = page.locator('[data-mobile="true"][data-sidebar="sidebar"]');
		await expect(mobileSidebar).toBeVisible();

		// Branding (use .first() because "Storyline" appears in header and footer)
		await expect(mobileSidebar.getByText('Storyline', { exact: true }).first()).toBeVisible();
		await expect(mobileSidebar.getByText('RPG Editor', { exact: true })).toBeVisible();

		// Scenes
		await expect(mobileSidebar.getByText('Scenes')).toBeVisible();
		await expect(mobileSidebar.getByText('Overworld')).toBeVisible();

		// Footer
		await expect(mobileSidebar.getByText('Project')).toBeVisible();
	});

	test('clicking overlay closes mobile sidebar', async ({ page }) => {
		// Open sidebar
		const trigger = page.locator('button[data-sidebar="trigger"]');
		await trigger.click();
		const mobileSidebar = page.locator('[data-mobile="true"][data-sidebar="sidebar"]');
		await expect(mobileSidebar).toBeVisible();

		// Click the Sheet overlay to close
		const overlay = page.locator('[data-slot="sheet-overlay"]');
		await overlay.click({ force: true });

		// Sidebar should close
		await expect(mobileSidebar).not.toBeVisible();
	});

	test('opening and closing sidebar multiple times works', async ({ page }) => {
		const trigger = page.locator('button[data-sidebar="trigger"]');
		const mobileSidebar = page.locator('[data-mobile="true"][data-sidebar="sidebar"]');
		const overlay = page.locator('[data-slot="sheet-overlay"]');

		// First cycle: open → close
		await trigger.click();
		await expect(mobileSidebar).toBeVisible();
		await overlay.click({ force: true });
		await expect(mobileSidebar).not.toBeVisible();
		// Wait for close animation to fully complete before next open
		await page.waitForTimeout(350);

		// Second cycle: open → close
		await trigger.click();
		await expect(mobileSidebar).toBeVisible();
		await overlay.click({ force: true });
		await expect(mobileSidebar).not.toBeVisible();
	});

	test('header and breadcrumb leaf visible on mobile', async ({ page }) => {
		const header = page.locator('header');
		await expect(header).toBeVisible();

		// On mobile, only the leaf breadcrumb "Scene" is visible
		// ("Editor" breadcrumb has class="hidden md:block")
		await expect(header.getByText('Scene')).toBeVisible();
	});
});

// =============================================================================
// Mobile sidebar — keyboard shortcuts
// =============================================================================

test.describe('mobile sidebar — keyboard shortcuts', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize(MOBILE_VIEWPORT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		// Ensure page has focus for keyboard shortcuts
		await page.locator('body').click();
	});

	test('Ctrl/Cmd+B opens mobile sidebar', async ({ page }) => {
		const mobileSidebar = page.locator('[data-mobile="true"][data-sidebar="sidebar"]');
		await expect(mobileSidebar).not.toBeVisible();

		await page.keyboard.press('ControlOrMeta+b');
		await expect(mobileSidebar).toBeVisible();
	});

	test('Ctrl/Cmd+B toggles mobile sidebar closed', async ({ page }) => {
		const mobileSidebar = page.locator('[data-mobile="true"][data-sidebar="sidebar"]');

		// Open
		await page.keyboard.press('ControlOrMeta+b');
		await expect(mobileSidebar).toBeVisible();

		// Close
		await page.keyboard.press('ControlOrMeta+b');
		await expect(mobileSidebar).not.toBeVisible();
	});

	test('Escape closes mobile sidebar', async ({ page }) => {
		const mobileSidebar = page.locator('[data-mobile="true"][data-sidebar="sidebar"]');

		// Open via trigger
		const trigger = page.locator('button[data-sidebar="trigger"]');
		await trigger.click();
		await expect(mobileSidebar).toBeVisible();

		// Close via Escape
		await page.keyboard.press('Escape');
		await expect(mobileSidebar).not.toBeVisible();
	});

	test('Ctrl/Cmd+B full open-close-open cycle', async ({ page }) => {
		const mobileSidebar = page.locator('[data-mobile="true"][data-sidebar="sidebar"]');

		// Start closed
		await expect(mobileSidebar).not.toBeVisible();

		// Open
		await page.keyboard.press('ControlOrMeta+b');
		await expect(mobileSidebar).toBeVisible();

		// Close
		await page.keyboard.press('ControlOrMeta+b');
		await expect(mobileSidebar).not.toBeVisible();

		// Open again
		await page.keyboard.press('ControlOrMeta+b');
		await expect(mobileSidebar).toBeVisible();
	});
});
