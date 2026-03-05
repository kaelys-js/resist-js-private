import { test, expect, type Page } from '@playwright/test';

/**
 * Navigate with debug enabled and wait for trigger to appear.
 *
 * @param page - Playwright page
 */
async function gotoWithDebug(page: Page): Promise<void> {
	await page.goto('/?wf.debug=true');
	await page.locator('[data-testid="dev-toolbar-trigger"]').waitFor({ state: 'visible' });
}

/**
 * Expand the toolbar bar and dismiss any lingering tooltips.
 *
 * @param page - Playwright page
 */
async function expandToolbar(page: Page): Promise<void> {
	await gotoWithDebug(page);
	await page.locator('[data-testid="dev-toolbar-trigger"]').click();
	await page.locator('[data-testid="dev-toolbar-bar"]').waitFor({ state: 'visible' });
	// Move mouse away from toolbar to dismiss tooltips that could intercept clicks
	await page.mouse.move(0, 0);
}

/**
 * Click a toolbar button, dismissing any tooltip that might overlay it.
 *
 * @param page - Playwright page
 * @param testId - data-testid of the button
 */
async function clickToolbarButton(page: Page, testId: string): Promise<void> {
	await page.mouse.move(0, 0);
	await page.locator(`[data-testid="${testId}"]`).click();
}

// =============================================================================
// Visibility
// =============================================================================

test.describe('dev toolbar — visibility', () => {
	test('hidden when debug is disabled', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('[data-testid="dev-toolbar"]')).not.toBeAttached();
	});

	test('trigger pill visible with ?wf.debug=true', async ({ page }) => {
		await gotoWithDebug(page);
		await expect(page.locator('[data-testid="dev-toolbar-trigger"]')).toBeVisible();
	});

	test('trigger has aria-expanded="false" initially', async ({ page }) => {
		await gotoWithDebug(page);
		await expect(page.locator('[data-testid="dev-toolbar-trigger"]')).toHaveAttribute(
			'aria-expanded',
			'false',
		);
	});
});

// =============================================================================
// Expand / collapse
// =============================================================================

test.describe('dev toolbar — expand and collapse', () => {
	test('clicking trigger expands toolbar bar with panel buttons', async ({ page }) => {
		await expandToolbar(page);
		await expect(page.locator('[data-testid="toolbar-btn-flags"]')).toBeVisible();
		await expect(page.locator('[data-testid="toolbar-btn-app"]')).toBeVisible();
		await expect(page.locator('[data-testid="toolbar-btn-debug"]')).toBeVisible();
	});

	test('toolbar bar has role="toolbar"', async ({ page }) => {
		await expandToolbar(page);
		const bar = page.locator('[data-testid="dev-toolbar-bar"]');
		await expect(bar).toHaveAttribute('role', 'toolbar');
		await expect(bar).toHaveAttribute('aria-label', 'Developer Toolbar');
	});

	test('quick action buttons visible when expanded', async ({ page }) => {
		await expandToolbar(page);
		await expect(page.locator('[data-testid="toolbar-btn-mode"]')).toBeVisible();
		await expect(page.locator('[data-testid="toolbar-btn-copy"]')).toBeVisible();
		await expect(page.locator('[data-testid="toolbar-btn-reset"]')).toBeVisible();
	});

	test('clicking trigger again collapses toolbar', async ({ page }) => {
		await expandToolbar(page);
		await page.locator('[data-testid="dev-toolbar-trigger"]').click();
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).not.toBeAttached();
	});
});

// =============================================================================
// Panel interaction
// =============================================================================

test.describe('dev toolbar — panels', () => {
	test('feature flags panel opens with switches', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-flags');
		const panel = page.locator('[data-testid="dev-toolbar-flags"]');
		await expect(panel).toBeVisible();
		await expect(panel.getByText('Feature Flags')).toBeVisible();
		// 28 flags from schema (24 original + sidebarHome, authGatedUi, emptyScenePlaceholder, skeletonLoading)
		await expect(panel.locator('button[role="switch"]')).toHaveCount(28);
	});

	test('app state panel opens with preferences', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-app');
		const panel = page.locator('[data-testid="dev-toolbar-app-state"]');
		await expect(panel).toBeVisible();
		await expect(panel.getByText('App Preferences')).toBeVisible();
	});

	test('debug panel opens with settings', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-debug');
		const panel = page.locator('[data-testid="dev-toolbar-debug"]');
		await expect(panel).toBeVisible();
		await expect(panel.getByText('Debug Settings')).toBeVisible();
		await expect(panel.getByText('Quick Actions')).toBeVisible();
	});

	test('clicking same panel button closes it', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-flags');
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).toBeVisible();
		await clickToolbarButton(page, 'toolbar-btn-flags');
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).not.toBeAttached();
	});

	test('switching panels closes the previous one', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-flags');
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).toBeVisible();

		await clickToolbarButton(page, 'toolbar-btn-app');
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).not.toBeAttached();
		await expect(page.locator('[data-testid="dev-toolbar-app-state"]')).toBeVisible();
	});

	test('collapsing toolbar closes active panel', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-flags');
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).toBeVisible();

		await page.mouse.move(0, 0);
		await page.locator('[data-testid="dev-toolbar-trigger"]').click();
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).not.toBeAttached();
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).not.toBeAttached();
	});
});

// =============================================================================
// Feature flag integration
// =============================================================================

test.describe('dev toolbar — feature flag toggle', () => {
	test('toggling breadcrumb flag hides breadcrumb in header', async ({ page }) => {
		await expandToolbar(page);

		// Breadcrumb should be visible initially
		const header = page.locator('header');
		await expect(header.getByText('Home')).toBeVisible();

		// Open flags panel and toggle breadcrumb off
		await clickToolbarButton(page, 'toolbar-btn-flags');
		await page.locator('#flag-breadcrumb').click();

		// Breadcrumb should now be hidden
		await expect(header.getByText('Home')).not.toBeVisible();
	});
});

// =============================================================================
// Panel close buttons
// =============================================================================

test.describe('dev toolbar — panel close buttons', () => {
	test('flags panel close button closes it', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-flags');
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).toBeVisible();
		await page.locator('[data-testid="panel-close-flags"]').click();
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).not.toBeAttached();
		// Toolbar bar remains open
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).toBeVisible();
	});

	test('app state panel close button closes it', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-app');
		await expect(page.locator('[data-testid="dev-toolbar-app-state"]')).toBeVisible();
		await page.locator('[data-testid="panel-close-app"]').click();
		await expect(page.locator('[data-testid="dev-toolbar-app-state"]')).not.toBeAttached();
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).toBeVisible();
	});

	test('debug panel close button closes it', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-debug');
		await expect(page.locator('[data-testid="dev-toolbar-debug"]')).toBeVisible();
		await page.locator('[data-testid="panel-close-debug"]').click();
		await expect(page.locator('[data-testid="dev-toolbar-debug"]')).not.toBeAttached();
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).toBeVisible();
	});
});

// =============================================================================
// Keyboard shortcuts
// =============================================================================

test.describe('dev toolbar — keyboard shortcuts', () => {
	test('Ctrl+Shift+D toggles toolbar', async ({ page }) => {
		await gotoWithDebug(page);
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).not.toBeAttached();

		await page.keyboard.press('Control+Shift+KeyD');
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).toBeVisible();

		await page.keyboard.press('Control+Shift+KeyD');
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).not.toBeAttached();
	});

	test('Escape closes active panel but keeps toolbar open', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-flags');
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).not.toBeAttached();
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).toBeVisible();
	});

	test('Escape closes toolbar when no panel is active', async ({ page }) => {
		await expandToolbar(page);
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(page.locator('[data-testid="dev-toolbar-bar"]')).not.toBeAttached();
	});

	test('number key 1 toggles flags panel', async ({ page }) => {
		await expandToolbar(page);
		await page.keyboard.press('Digit1');
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).toBeVisible();
		await page.keyboard.press('Digit1');
		await expect(page.locator('[data-testid="dev-toolbar-flags"]')).not.toBeAttached();
	});

	test('number key 2 toggles app state panel', async ({ page }) => {
		await expandToolbar(page);
		await page.keyboard.press('Digit2');
		await expect(page.locator('[data-testid="dev-toolbar-app-state"]')).toBeVisible();
		await page.keyboard.press('Digit2');
		await expect(page.locator('[data-testid="dev-toolbar-app-state"]')).not.toBeAttached();
	});

	test('number key 3 toggles debug panel', async ({ page }) => {
		await expandToolbar(page);
		await page.keyboard.press('Digit3');
		await expect(page.locator('[data-testid="dev-toolbar-debug"]')).toBeVisible();
		await page.keyboard.press('Digit3');
		await expect(page.locator('[data-testid="dev-toolbar-debug"]')).not.toBeAttached();
	});

	test('number key 4 cycles mode', async ({ page }) => {
		await expandToolbar(page);
		// Read initial mode from the mode button aria-label
		const modeBtn = page.locator('[data-testid="toolbar-btn-mode"]');
		const initialLabel: string = (await modeBtn.getAttribute('aria-label')) ?? '';
		// Click body to ensure no button captures the key
		await page.mouse.click(10, 10);
		await page.keyboard.press('Digit4');
		// Button label should change (mode cycles light→dark→system)
		await expect
			.poll(async () => {
				return (await modeBtn.getAttribute('aria-label')) ?? '';
			})
			.not.toBe(initialLabel);
	});
});

// =============================================================================
// Quick actions
// =============================================================================

test.describe('dev toolbar — quick actions', () => {
	test('mode toggle cycles without error', async ({ page }) => {
		await expandToolbar(page);
		// Cycle through all 3 modes: system → light → dark → system
		await clickToolbarButton(page, 'toolbar-btn-mode');
		await clickToolbarButton(page, 'toolbar-btn-mode');
		await clickToolbarButton(page, 'toolbar-btn-mode');
		await expect(page.locator('[data-testid="toolbar-btn-mode"]')).toBeVisible();
	});
});

// =============================================================================
// Build Info section
// =============================================================================

test.describe('dev toolbar — build info', () => {
	test('debug panel shows build info section', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-debug');
		const panel = page.locator('[data-testid="dev-toolbar-debug"]');
		await expect(panel.locator('[data-testid="build-info"]')).toBeVisible();
		await expect(panel.getByRole('heading', { name: 'Build Info' })).toBeVisible();
	});

	test('build info shows version, commit, branch, dirty, built', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-debug');
		const buildInfo = page.locator('[data-testid="build-info"]');
		await expect(buildInfo.getByText('Version')).toBeVisible();
		await expect(buildInfo.getByText('Commit')).toBeVisible();
		await expect(buildInfo.getByText('Branch')).toBeVisible();
		await expect(buildInfo.getByText('Dirty')).toBeVisible();
		await expect(buildInfo.getByText('Built')).toBeVisible();
	});
});

// =============================================================================
// Copy feedback — Copy Build Info
// =============================================================================

test.describe('dev toolbar — copy build info feedback', () => {
	test('Copy Build Info shows checkmark on success', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-debug');
		const btn = page.locator('[data-testid="copy-build-info"]');
		await expect(btn).toContainText('Copy Build Info');
		await btn.click();
		await expect(btn).toContainText(/copied/i);
	});

	test('Copy Build Info reverts after timeout', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-debug');
		const btn = page.locator('[data-testid="copy-build-info"]');
		await btn.click();
		await expect(btn).toContainText(/copied/i);
		await expect(btn).toContainText('Copy Build Info', { timeout: 5000 });
	});

	test('Copy Build Info copies text to clipboard', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-debug');
		await page.locator('[data-testid="copy-build-info"]').click();
		const clipboardText: string = await page.evaluate(() => navigator.clipboard.readText());
		expect(clipboardText).toContain('Version:');
		expect(clipboardText).toContain('Branch:');
	});
});

// =============================================================================
// Copy feedback — Copy Debug URL
// =============================================================================

test.describe('dev toolbar — copy debug url feedback', () => {
	test('Copy Debug URL shows checkmark on success', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-debug');
		const btn = page.locator('[data-testid="copy-debug-url"]');
		await expect(btn).toContainText('Copy Debug URL');
		await btn.click();
		await expect(btn).toContainText(/copied/i);
	});

	test('Copy Debug URL reverts after timeout', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-debug');
		const btn = page.locator('[data-testid="copy-debug-url"]');
		await btn.click();
		await expect(btn).toContainText(/copied/i);
		await expect(btn).toContainText('Copy Debug URL', { timeout: 5000 });
	});

	test('Copy Debug URL has link icon', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-debug');
		const btn = page.locator('[data-testid="copy-debug-url"]');
		// Button should have an SVG icon (the link icon)
		await expect(btn.locator('svg')).toBeVisible();
	});
});

// =============================================================================
// Viewport resize — toolbar stays visible
// =============================================================================

test.describe('dev toolbar — viewport resize', () => {
	test('toolbar clamps to visible area when viewport shrinks', async ({ page }) => {
		// Start at a wide viewport
		await page.setViewportSize({ width: 1200, height: 800 });

		// Place toolbar near the right edge via localStorage before navigating
		await page.goto('/');
		await page.evaluate(() => {
			localStorage.setItem('dev-toolbar-pos', JSON.stringify({ x: 1100, b: 16 }));
		});

		// Navigate with debug — toolbar loads at x=1100
		await page.goto('/?wf.debug=true');
		await page.locator('[data-testid="dev-toolbar-trigger"]').waitFor({ state: 'visible' });

		// Shrink viewport so x=1100 is offscreen
		await page.setViewportSize({ width: 600, height: 800 });

		// Poll until the resize listener clamps posX — trigger should be within viewport
		const trigger = page.locator('[data-testid="dev-toolbar-trigger"]');
		await expect
			.poll(async () => {
				const box = await trigger.boundingBox();
				return box ? box.x + box.width : 9999;
			})
			.toBeLessThanOrEqual(600);
		await expect
			.poll(async () => {
				const box = await trigger.boundingBox();
				return box ? box.x : -9999;
			})
			.toBeGreaterThanOrEqual(0);
	});

	test('toolbar clamps vertically when viewport height shrinks', async ({ page }) => {
		await page.setViewportSize({ width: 1200, height: 800 });

		await page.goto('/');
		await page.evaluate(() => {
			localStorage.setItem('dev-toolbar-pos', JSON.stringify({ x: 600, b: 700 }));
		});

		await page.goto('/?wf.debug=true');
		await page.locator('[data-testid="dev-toolbar-trigger"]').waitFor({ state: 'visible' });

		// Shrink height so bottom=700 is offscreen
		await page.setViewportSize({ width: 1200, height: 400 });

		// Poll until the resize listener clamps posBottom — trigger should be visible
		const trigger = page.locator('[data-testid="dev-toolbar-trigger"]');
		await expect
			.poll(async () => {
				const box = await trigger.boundingBox();
				return box ? box.y + box.height : 9999;
			})
			.toBeLessThanOrEqual(400);
		await expect
			.poll(async () => {
				const box = await trigger.boundingBox();
				return box ? box.y : -9999;
			})
			.toBeGreaterThanOrEqual(0);
	});
});
