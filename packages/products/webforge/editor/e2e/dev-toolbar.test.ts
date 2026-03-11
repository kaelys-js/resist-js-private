import { test, expect, type Page } from '@playwright/test';
import { URL_PARAM_PREFIX } from '../src/lib/config/app-meta';

/**
 * Navigate with debug enabled and wait for trigger to appear.
 *
 * @param page - Playwright page
 */
async function gotoWithDebug(page: Page): Promise<void> {
  await page.goto(`/?${URL_PARAM_PREFIX}debug=true`);
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

  test(`trigger pill visible with ?${URL_PARAM_PREFIX}debug=true`, async ({ page }) => {
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

  test('Ctrl+1 toggles flags panel', async ({ page }) => {
    await expandToolbar(page);
    await page.keyboard.press('Control+Digit1');
    await expect(page.locator('[data-testid="dev-toolbar-flags"]')).toBeVisible();
    await page.keyboard.press('Control+Digit1');
    await expect(page.locator('[data-testid="dev-toolbar-flags"]')).not.toBeAttached();
  });

  test('Ctrl+2 toggles app state panel', async ({ page }) => {
    await expandToolbar(page);
    await page.keyboard.press('Control+Digit2');
    await expect(page.locator('[data-testid="dev-toolbar-app-state"]')).toBeVisible();
    await page.keyboard.press('Control+Digit2');
    await expect(page.locator('[data-testid="dev-toolbar-app-state"]')).not.toBeAttached();
  });

  test('Ctrl+3 toggles debug panel', async ({ page }) => {
    await expandToolbar(page);
    await page.keyboard.press('Control+Digit3');
    await expect(page.locator('[data-testid="dev-toolbar-debug"]')).toBeVisible();
    await page.keyboard.press('Control+Digit3');
    await expect(page.locator('[data-testid="dev-toolbar-debug"]')).not.toBeAttached();
  });

  test('Ctrl+5 cycles mode', async ({ page }) => {
    await expandToolbar(page);
    // Read initial mode from the mode button aria-label
    const modeBtn = page.locator('[data-testid="toolbar-btn-mode"]');
    const initialLabel: string = (await modeBtn.getAttribute('aria-label')) ?? '';
    // Click body to ensure no button captures the key
    await page.mouse.click(10, 10);
    await page.keyboard.press('Control+Digit5');
    // Button label should change (mode cycles light→dark→system)
    await expect
      .poll(async () => {
        return (await modeBtn.getAttribute('aria-label')) ?? '';
      })
      .not.toBe(initialLabel);
  });

  test('bare number keys do NOT trigger panel shortcuts', async ({ page }) => {
    await expandToolbar(page);
    // Press bare 1 — flags panel should NOT open (Ctrl required now)
    await page.keyboard.press('Digit1');
    await expect(page.locator('[data-testid="dev-toolbar-flags"]')).not.toBeAttached();
  });

  test('shortcuts do not fire when typing in search input', async ({ page }) => {
    await expandToolbar(page);
    await clickToolbarButton(page, 'toolbar-btn-flags');
    await expect(page.locator('[data-testid="dev-toolbar-flags"]')).toBeVisible();

    // Focus the search input inside the flags panel
    const searchInput = page.locator('[data-testid="dev-toolbar-flags"] input[type="text"]');
    await searchInput.click();
    await searchInput.fill('test');

    // The flags panel should still be visible (shortcut didn't close it)
    await expect(page.locator('[data-testid="dev-toolbar-flags"]')).toBeVisible();
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
    await page.goto(`/?${URL_PARAM_PREFIX}debug=true`);
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

    await page.goto(`/?${URL_PARAM_PREFIX}debug=true`);
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

// =============================================================================
// Keyboard shortcut hints in tooltips
// =============================================================================

test.describe('dev toolbar — shortcut hints in tooltips', () => {
  test('toolbar trigger tooltip shows Ctrl+Shift+D hint', async ({ page }) => {
    await gotoWithDebug(page);
    const trigger = page.locator('[data-testid="dev-toolbar-trigger"]');
    await trigger.hover();
    // bits-ui v1.8.0 does not set role="tooltip" — use data-slot attribute
    const kbd = page.locator('[data-slot="tooltip-content"] kbd');
    await expect(kbd).toBeVisible({ timeout: 3000 });
    const text: string = (await kbd.textContent()) ?? '';
    // Should show platform-appropriate modifier + Shift + D
    expect(text).toMatch(/Ctrl\+Shift\+D|⌃\+Shift\+D/);
  });

  test('panel button tooltips show Ctrl+number hints', async ({ page }) => {
    await expandToolbar(page);
    // Hover over flags button to see its tooltip
    await page.locator('[data-testid="toolbar-btn-flags"]').hover();
    const kbd = page.locator('[data-slot="tooltip-content"] kbd');
    await expect(kbd).toBeVisible({ timeout: 3000 });
    const text: string = (await kbd.textContent()) ?? '';
    // Should show Ctrl+1 or ⌃+1
    expect(text).toMatch(/Ctrl\+1|⌃\+1/);
  });
});

// =============================================================================
// Sidebar toggle keyboard shortcut
// =============================================================================

test.describe('sidebar — keyboard shortcut', () => {
  test('Ctrl/Cmd+B toggles sidebar visibility', async ({ page }) => {
    await page.goto('/');
    // Use .first() — there are two sidebar elements (desktop + mobile)
    const sidebar = page.locator('[data-slot="sidebar"]').first();
    await expect(sidebar).toHaveAttribute('data-state', 'expanded');

    // Press Ctrl/Cmd+B to close (ControlOrMeta sends Meta on Mac, Ctrl on Win/Linux)
    await page.locator('body').click();
    await page.keyboard.press('ControlOrMeta+b');
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed');

    // Press Ctrl/Cmd+B to open again
    await page.keyboard.press('ControlOrMeta+b');
    await expect(sidebar).toHaveAttribute('data-state', 'expanded');
  });

  test('sidebar toggle tooltip shows Ctrl+b or ⌘b hint', async ({ page }) => {
    await page.goto('/');
    // Hover over the sidebar trigger button
    const trigger = page.locator('[data-sidebar="trigger"]');
    await trigger.hover();
    const kbd = page.locator('[data-slot="tooltip-content"] kbd');
    await expect(kbd).toBeVisible({ timeout: 3000 });
    const text: string = (await kbd.textContent()) ?? '';
    // cmdOrCtrl formats as ⌘b on Mac, Ctrl+b on PC
    expect(text).toMatch(/Ctrl\+b|⌘b/);
  });
});

// =============================================================================
// Performance panel
// =============================================================================

test.describe('dev toolbar — performance panel', () => {
  test('perf button visible in expanded toolbar', async ({ page }) => {
    await expandToolbar(page);
    await expect(page.locator('[data-testid="toolbar-btn-perf"]')).toBeVisible();
  });

  test('perf panel opens with Web Vitals section', async ({ page }) => {
    await expandToolbar(page);
    await clickToolbarButton(page, 'toolbar-btn-perf');
    const panel = page.locator('[data-testid="dev-toolbar-perf"]');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Performance')).toBeVisible();
    await expect(panel.locator('[data-testid="dev-toolbar-perf-vitals"]')).toBeVisible();
  });

  test('perf panel shows Device & Connection section', async ({ page }) => {
    await expandToolbar(page);
    await clickToolbarButton(page, 'toolbar-btn-perf');
    const panel = page.locator('[data-testid="dev-toolbar-perf"]');
    await expect(panel.locator('[data-testid="dev-toolbar-perf-device"]')).toBeVisible();
  });

  test('perf panel shows Beacon section', async ({ page }) => {
    await expandToolbar(page);
    await clickToolbarButton(page, 'toolbar-btn-perf');
    const panel = page.locator('[data-testid="dev-toolbar-perf"]');
    await expect(panel.locator('[data-testid="dev-toolbar-perf-beacon"]')).toBeVisible();
  });

  test('perf panel shows "No data yet" for vitals before metrics arrive', async ({ page }) => {
    await expandToolbar(page);
    await clickToolbarButton(page, 'toolbar-btn-perf');
    const panel = page.locator('[data-testid="dev-toolbar-perf"]');
    // On initial load before metrics populate, may show "No data yet"
    // OR metrics may have already arrived — either is valid
    const noData = panel.locator('[data-testid="perf-no-data"]');
    const metrics = panel.locator('[data-testid^="perf-metric-"]');
    // Either no data placeholder or at least one metric should be present
    const noDataVisible: boolean = await noData.isVisible().catch(() => false);
    const metricsCount: number = await metrics.count();
    expect(noDataVisible || metricsCount > 0).toBe(true);
  });

  test('device section shows Connection Quality with colored dot', async ({ page }) => {
    await expandToolbar(page);
    await clickToolbarButton(page, 'toolbar-btn-perf');
    const qualityEl = page.locator('[data-testid="perf-quality"]');
    await expect(qualityEl).toBeVisible();
    // Should contain a colored dot (span with bg-* class)
    const dot = qualityEl.locator('span.rounded-full');
    await expect(dot).toBeVisible();
  });

  test('device section shows Network Speed', async ({ page }) => {
    await expandToolbar(page);
    await clickToolbarButton(page, 'toolbar-btn-perf');
    await expect(page.locator('[data-testid="perf-effective-type"]')).toBeVisible();
  });

  test('device section shows Device Memory', async ({ page }) => {
    await expandToolbar(page);
    await clickToolbarButton(page, 'toolbar-btn-perf');
    await expect(page.locator('[data-testid="perf-device-memory"]')).toBeVisible();
  });

  test('device section shows CPU Cores', async ({ page }) => {
    await expandToolbar(page);
    await clickToolbarButton(page, 'toolbar-btn-perf');
    await expect(page.locator('[data-testid="perf-hw-concurrency"]')).toBeVisible();
  });

  test('beacon section shows queue count', async ({ page }) => {
    await expandToolbar(page);
    await clickToolbarButton(page, 'toolbar-btn-perf');
    const queueEl = page.locator('[data-testid="perf-beacon-queued"]');
    await expect(queueEl).toBeVisible();
    // Should show format like "N/10"
    const text: string = (await queueEl.textContent()) ?? '';
    expect(text).toMatch(/\d+\/\d+/);
  });

  test('beacon section shows session ID (truncated)', async ({ page }) => {
    await expandToolbar(page);
    await clickToolbarButton(page, 'toolbar-btn-perf');
    const sessionEl = page.locator('[data-testid="perf-beacon-session"]');
    await expect(sessionEl).toBeVisible();
    // Session ID is truncated to 8 chars + ellipsis
    const text: string = (await sessionEl.textContent()) ?? '';
    expect(text).toMatch(/.{8}…/);
  });

  test('beacon section shows last sent time', async ({ page }) => {
    await expandToolbar(page);
    await clickToolbarButton(page, 'toolbar-btn-perf');
    const flushEl = page.locator('[data-testid="perf-beacon-flush"]');
    await expect(flushEl).toBeVisible();
    // Should show "Never" or a time string
    const text: string = (await flushEl.textContent()) ?? '';
    expect(text.length).toBeGreaterThan(0);
  });

  test('perf panel close button closes it', async ({ page }) => {
    await expandToolbar(page);
    await clickToolbarButton(page, 'toolbar-btn-perf');
    await expect(page.locator('[data-testid="dev-toolbar-perf"]')).toBeVisible();
    await page.locator('[data-testid="panel-close-perf"]').click();
    await expect(page.locator('[data-testid="dev-toolbar-perf"]')).not.toBeAttached();
    // Toolbar bar remains open
    await expect(page.locator('[data-testid="dev-toolbar-bar"]')).toBeVisible();
  });

  test('clicking perf button again closes panel', async ({ page }) => {
    await expandToolbar(page);
    await clickToolbarButton(page, 'toolbar-btn-perf');
    await expect(page.locator('[data-testid="dev-toolbar-perf"]')).toBeVisible();
    await clickToolbarButton(page, 'toolbar-btn-perf');
    await expect(page.locator('[data-testid="dev-toolbar-perf"]')).not.toBeAttached();
  });

  test('switching from perf to another panel closes perf', async ({ page }) => {
    await expandToolbar(page);
    await clickToolbarButton(page, 'toolbar-btn-perf');
    await expect(page.locator('[data-testid="dev-toolbar-perf"]')).toBeVisible();
    await clickToolbarButton(page, 'toolbar-btn-flags');
    await expect(page.locator('[data-testid="dev-toolbar-perf"]')).not.toBeAttached();
    await expect(page.locator('[data-testid="dev-toolbar-flags"]')).toBeVisible();
  });
});

// =============================================================================
// Performance panel — keyboard shortcut
// =============================================================================

test.describe('dev toolbar — perf keyboard shortcut', () => {
  test('Ctrl+4 toggles perf panel', async ({ page }) => {
    await expandToolbar(page);
    await page.keyboard.press('Control+Digit4');
    await expect(page.locator('[data-testid="dev-toolbar-perf"]')).toBeVisible();
    await page.keyboard.press('Control+Digit4');
    await expect(page.locator('[data-testid="dev-toolbar-perf"]')).not.toBeAttached();
  });
});
