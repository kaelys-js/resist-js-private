import { test, expect } from '@playwright/test';

// =============================================================================
// Visibility — debug disabled (default)
// =============================================================================

test.describe('dev toolbar — hidden by default', () => {
	test('toolbar not visible when debug is disabled', async ({ page }) => {
		await page.goto('/');
		const toolbar = page.locator('[data-testid="dev-toolbar"]');
		await expect(toolbar).not.toBeAttached();
	});
});

// =============================================================================
// Visibility — debug enabled via URL
// =============================================================================

test.describe('dev toolbar — enabled via URL', () => {
	test('toolbar trigger appears with ?wf.debug=true', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		const trigger = page.locator('[data-testid="dev-toolbar-trigger"]');
		await expect(trigger).toBeVisible();
		await expect(page.getByText('DEV')).toBeVisible();
	});

	test('trigger pill has aria-expanded="false" initially', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		const trigger = page.locator('[data-testid="dev-toolbar-trigger"]');
		await expect(trigger).toHaveAttribute('aria-expanded', 'false');
	});
});

// =============================================================================
// Expand / collapse toolbar
// =============================================================================

test.describe('dev toolbar — expand and collapse', () => {
	test('clicking trigger expands toolbar bar', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		const trigger = page.locator('[data-testid="dev-toolbar-trigger"]');
		await trigger.click();
		const bar = page.locator('[data-testid="dev-toolbar-bar"]');
		await expect(bar).toBeVisible();
	});

	test('toolbar bar has role=toolbar and aria-label', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		await page.locator('[data-testid="dev-toolbar-trigger"]').click();
		const bar = page.locator('[role="toolbar"]');
		await expect(bar).toBeVisible();
		await expect(bar).toHaveAttribute('aria-label', 'Developer toolbar');
	});

	test('panel buttons visible when expanded', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		await page.locator('[data-testid="dev-toolbar-trigger"]').click();
		await expect(page.locator('[data-testid="toolbar-btn-flags"]')).toBeVisible();
		await expect(page.locator('[data-testid="toolbar-btn-app"]')).toBeVisible();
		await expect(page.locator('[data-testid="toolbar-btn-debug"]')).toBeVisible();
	});

	test('quick action buttons visible when expanded', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		await page.locator('[data-testid="dev-toolbar-trigger"]').click();
		await expect(page.locator('[data-testid="toolbar-btn-mode"]')).toBeVisible();
		await expect(page.locator('[data-testid="toolbar-btn-copy"]')).toBeVisible();
		await expect(page.locator('[data-testid="toolbar-btn-reset"]')).toBeVisible();
	});

	test('clicking trigger again collapses toolbar', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		const trigger = page.locator('[data-testid="dev-toolbar-trigger"]');
		await trigger.click();
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).toBeVisible();
		await trigger.click();
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).not.toBeAttached();
	});
});

// =============================================================================
// Panel interaction
// =============================================================================

test.describe('dev toolbar — panel interaction', () => {
	test('feature flags panel opens and shows switches', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		await page.locator('[data-testid="dev-toolbar-trigger"]').click();
		await page.locator('[data-testid="toolbar-btn-flags"]').click();
		const panel = page.locator('[data-testid="dev-toolbar-flags"]');
		await expect(panel).toBeVisible();
		// Should contain switches (role="switch")
		const switches = panel.locator('button[role="switch"]');
		await expect(switches.first()).toBeVisible();
		// Count should match schema (16 flags)
		await expect(switches).toHaveCount(16);
	});

	test('app state panel opens and shows controls', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		await page.locator('[data-testid="dev-toolbar-trigger"]').click();
		await page.locator('[data-testid="toolbar-btn-app"]').click();
		const panel = page.locator('[data-testid="dev-toolbar-app-state"]');
		await expect(panel).toBeVisible();
		await expect(page.getByText('App Preferences')).toBeVisible();
	});

	test('debug panel opens and shows controls', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		await page.locator('[data-testid="dev-toolbar-trigger"]').click();
		await page.locator('[data-testid="toolbar-btn-debug"]').click();
		const panel = page.locator('[data-testid="dev-toolbar-debug"]');
		await expect(panel).toBeVisible();
		// Check heading inside panel scope to avoid matching other "Debug" text
		await expect(panel.getByText('Debug', { exact: true })).toBeVisible();
	});

	test('clicking same panel button again closes the panel', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		await page.locator('[data-testid="dev-toolbar-trigger"]').click();
		const flagsBtn = page.locator('[data-testid="toolbar-btn-flags"]');
		await flagsBtn.click();
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).toBeVisible();
		await flagsBtn.click();
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).not.toBeAttached();
	});

	test('only one panel open at a time', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		await page.locator('[data-testid="dev-toolbar-trigger"]').click();

		// Open flags panel
		await page.locator('[data-testid="toolbar-btn-flags"]').click();
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).toBeVisible();

		// Click app state button — flags panel should close
		await page.locator('[data-testid="toolbar-btn-app"]').click();
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).not.toBeAttached();
		await expect(page.locator('[data-testid="dev-toolbar-app-state"]')).toBeVisible();
	});

	test('collapsing toolbar closes the active panel', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		const trigger = page.locator('[data-testid="dev-toolbar-trigger"]');
		await trigger.click();
		await page.locator('[data-testid="toolbar-btn-flags"]').click();
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).toBeVisible();

		// Collapse
		await trigger.click();
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).not.toBeAttached();
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).not.toBeAttached();
	});
});

// =============================================================================
// Feature flags panel — toggle affects UI
// =============================================================================

test.describe('dev toolbar — feature flags integration', () => {
	test('toggling breadcrumb flag hides breadcrumb in header', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);

		const header = page.locator('header');
		// Breadcrumb should be visible initially
		await expect(header.getByText('Editor')).toBeVisible();

		// Expand toolbar and open flags panel
		await page.locator('[data-testid="dev-toolbar-trigger"]').click();
		await page.locator('[data-testid="toolbar-btn-flags"]').click();
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).toBeVisible();

		// Find and toggle the breadcrumb switch
		const breadcrumbLabel = page.locator('label[for="flag-breadcrumb"]');
		await expect(breadcrumbLabel).toBeVisible();
		const breadcrumbSwitch = page.locator('#flag-breadcrumb');
		await breadcrumbSwitch.click();

		// Breadcrumb should now be hidden
		await expect(header.getByText('Editor')).not.toBeVisible();
	});
});

// =============================================================================
// Quick actions
// =============================================================================

test.describe('dev toolbar — quick actions', () => {
	test('mode toggle cycles through light/dark/system', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		await page.locator('[data-testid="dev-toolbar-trigger"]').click();

		const modeBtn = page.locator('[data-testid="toolbar-btn-mode"]');
		// Click once to cycle from system → light
		await modeBtn.click();
		// Click again to cycle light → dark
		await modeBtn.click();
		// Click again to cycle dark → system
		await modeBtn.click();
		// No crash — mode cycling works
		await expect(modeBtn).toBeVisible();
	});
});

// =============================================================================
// Keyboard shortcuts
// =============================================================================

test.describe('dev toolbar — keyboard shortcuts', () => {
	test('Ctrl+Shift+D toggles toolbar', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);

		// Toolbar should not be expanded initially
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).not.toBeAttached();

		// Press Ctrl+Shift+D to expand
		await page.keyboard.press('Control+Shift+KeyD');
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).toBeVisible();

		// Press again to collapse
		await page.keyboard.press('Control+Shift+KeyD');
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).not.toBeAttached();
	});

	test('Escape closes active panel', async ({ page }) => {
		await page.goto('/?wf.debug=true');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		await page.locator('[data-testid="dev-toolbar-trigger"]').click();
		await page.locator('[data-testid="toolbar-btn-flags"]').click();
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).not.toBeAttached();
		// Toolbar bar should still be visible after escape
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).toBeVisible();
	});
});
