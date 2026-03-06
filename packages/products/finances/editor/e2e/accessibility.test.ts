import { test, expect } from '@playwright/test';

// =============================================================================
// WCAG 2.2 AA — Skip link & landmarks
// =============================================================================

test.describe('accessibility — skip link & landmarks', () => {
	test('skip link exists and is first focusable element', async ({ page }) => {
		await page.goto('/');
		// Tab to first focusable element
		await page.keyboard.press('Tab');
		const focused = page.locator(':focus');
		await expect(focused).toHaveAttribute('href', '#main-content');
		await expect(focused).toHaveText(/skip to main content/i);
	});

	test('skip link becomes visible on focus', async ({ page }) => {
		await page.goto('/');
		const skipLink = page.locator('a[href="#main-content"]');
		// Before focus: sr-only (visually hidden)
		await expect(skipLink).toBeAttached();
		// Focus it
		await page.keyboard.press('Tab');
		await expect(skipLink).toBeVisible();
	});

	test('main landmark exists with id="main-content"', async ({ page }) => {
		await page.goto('/');
		const main = page.locator('main#main-content');
		await expect(main).toBeAttached();
	});

	test('aria-live polite region exists', async ({ page }) => {
		await page.goto('/');
		const liveRegion = page.locator('[aria-live="polite"][aria-atomic="true"]');
		await expect(liveRegion).toBeAttached();
	});

	test('sidebar has aria-label', async ({ page }) => {
		await page.goto('/');
		// aria-label is spread via restProps onto the sidebar-container div
		const sidebar = page.locator('[data-slot="sidebar-container"][aria-label]');
		await expect(sidebar.first()).toBeAttached();
		const label = await sidebar.first().getAttribute('aria-label');
		expect(label).toBeTruthy();
	});
});

// =============================================================================
// WCAG 2.2 AA — SiteHeader & NavUser
// =============================================================================

test.describe('accessibility — header & navigation', () => {
	test('SiteHeader separator has role="separator"', async ({ page }) => {
		await page.goto('/');
		const separator = page.locator('header [role="separator"]');
		await expect(separator.first()).toBeAttached();
	});

	test('ModeToggle button has localized aria-label', async ({ page }) => {
		await page.goto('/');
		const modeToggle = page
			.locator('button')
			.filter({ has: page.locator('[class*="lucide-sun"], [class*="lucide-moon"]') });
		// The button should have an aria-label (not empty)
		const label = await modeToggle.first().getAttribute('aria-label');
		expect(label).toBeTruthy();
	});
});

// =============================================================================
// WCAG 2.2 AA — Active state indicators
// =============================================================================

test.describe('accessibility — active state indicators', () => {
	test('active scene has aria-current="page"', async ({ page }) => {
		await page.goto('/');
		// The active scene should have aria-current="page"
		const activeScene = page.locator('[data-active="true"][aria-current="page"]');
		await expect(activeScene.first()).toBeAttached();
	});
});

// =============================================================================
// WCAG 2.2 AA — DevToolbar accessibility
// =============================================================================

test.describe('accessibility — dev toolbar', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/?wf.debug=true');
		// Wait for trigger pill, then click to expand
		await page.locator('[data-testid="dev-toolbar-trigger"]').waitFor({ state: 'visible' });
		await page.locator('[data-testid="dev-toolbar-trigger"]').click();
		await page.locator('[data-testid="dev-toolbar-bar"]').waitFor({ state: 'visible' });
		// Move mouse away to dismiss tooltips
		await page.mouse.move(0, 0);
	});

	test('toolbar has aria-label and role="toolbar"', async ({ page }) => {
		const toolbar = page.locator('[data-testid="dev-toolbar-bar"]');
		await expect(toolbar).toHaveAttribute('role', 'toolbar');
		await expect(toolbar).toHaveAttribute('aria-label');
	});

	test('only one toolbar button has tabindex="0" (roving tabindex)', async ({ page }) => {
		const buttons = page.locator('[data-testid="dev-toolbar-bar"] button[tabindex="0"]');
		await expect(buttons).toHaveCount(1);
	});

	test('ArrowRight moves focus to next toolbar button', async ({ page }) => {
		// Focus first button
		const firstBtn = page.locator('[data-testid="toolbar-btn-flags"]');
		await firstBtn.focus();
		await expect(firstBtn).toBeFocused();
		// Press ArrowRight
		await page.keyboard.press('ArrowRight');
		const secondBtn = page.locator('[data-testid="toolbar-btn-app"]');
		await expect(secondBtn).toBeFocused();
	});

	test('Escape closes toolbar when no panel is active', async ({ page }) => {
		const toolbar = page.locator('[data-testid="dev-toolbar-bar"]');
		await expect(toolbar).toBeVisible();
		// Press Escape with no panel open
		await page.keyboard.press('Escape');
		await expect(toolbar).not.toBeVisible();
	});

	test('Switch elements do NOT have scale-75 class', async ({ page }) => {
		// Dismiss tooltip, then open feature flags panel
		await page.mouse.move(0, 0);
		await page.locator('[data-testid="toolbar-btn-flags"]').click();
		await page.waitForSelector('[data-testid="dev-toolbar-flags"]');
		const switches = page.locator('[data-testid="dev-toolbar-flags"] button[role="switch"]');
		const count = await switches.count();
		expect(count).toBeGreaterThan(0);
		for (let i = 0; i < count; i++) {
			const cls = await switches.nth(i).getAttribute('class');
			expect(cls).not.toContain('scale-75');
		}
	});

	test('search input has aria-label', async ({ page }) => {
		// Dismiss tooltip, then open feature flags panel
		await page.mouse.move(0, 0);
		await page.locator('[data-testid="toolbar-btn-flags"]').click();
		await page.waitForSelector('[data-testid="dev-toolbar-flags"]');
		const searchInput = page.locator('[data-testid="dev-toolbar-flags"] input[type="text"]');
		await expect(searchInput).toHaveAttribute('aria-label');
	});
});
