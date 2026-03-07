import { test, expect, type Page } from '@playwright/test';
import { URL_PARAM_PREFIX } from '../src/lib/config/app-meta';

const STORAGE_KEY = 'storylyne:editor-state';

/**
 * Sets feature flags in localStorage before navigating.
 * Flags not specified default to true (schema defaults).
 *
 * @param page - Playwright page instance
 * @param flags - Feature flag overrides to apply
 */
async function setFlags(page: Page, flags: Record<string, boolean>): Promise<void> {
	await page.goto('/');
	await page.evaluate(
		({ key, flagOverrides }) => {
			const raw: string | null = localStorage.getItem(key);
			const state = raw ? JSON.parse(raw) : { app: {}, features: {} };
			state.features = { ...state.features, ...flagOverrides };
			localStorage.setItem(key, JSON.stringify(state));
		},
		{ key: STORAGE_KEY, flagOverrides: flags },
	);
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
}

// =============================================================================
// Default state: all flags enabled
// =============================================================================

test.describe('feature flags — default state', () => {
	test('all UI elements visible with default flags', async ({ page }) => {
		await page.goto('/');

		// SiteHeader: breadcrumb visible (scoped to header)
		// On home route, only "Home" shows (no active scene)
		const header = page.locator('header');
		await expect(header.getByText('Home')).toBeVisible();

		// SiteHeader: sidebar trigger visible
		const trigger = page.locator('button[data-sidebar="trigger"]');
		await expect(trigger).toBeAttached();

		// SiteHeader: mode toggle visible
		await expect(page.getByRole('button', { name: /toggle mode/i })).toBeVisible();

		// AppSidebar: branding visible
		await expect(page.getByText('Storylyne', { exact: true }).first()).toBeVisible();
		await expect(
			page.locator('[data-slot="sidebar"]').getByText('Your Story, Rendered', { exact: true }),
		).toBeVisible();

		// AppSidebar: Help visible
		await expect(page.getByText('Help')).toBeVisible();

		// AppSidebar: Settings visible
		await expect(page.getByText('Settings').first()).toBeVisible();

		// AppSidebar: NavUser / project dropdown visible
		await expect(page.getByText('Sample Project', { exact: true })).toBeVisible();

		// SiteHeader: user dropdown trigger visible
		await expect(page.getByTestId('header-user-trigger')).toBeVisible();
	});
});

// =============================================================================
// Individual flag toggles
// =============================================================================

test.describe('feature flags — individual toggles', () => {
	test('breadcrumb=false hides breadcrumb', async ({ page }) => {
		await setFlags(page, { breadcrumb: false });
		const header = page.locator('header');
		await expect(header.getByText('Home')).not.toBeVisible();
	});

	test('sidebarToggle=false hides sidebar trigger', async ({ page }) => {
		await setFlags(page, { sidebarToggle: false });
		const trigger = page.locator('button[data-sidebar="trigger"]');
		await expect(trigger).not.toBeAttached();
	});

	test('modeToggle=false hides mode toggle button', async ({ page }) => {
		await setFlags(page, { modeToggle: false });
		await expect(page.getByRole('button', { name: /toggle mode/i })).not.toBeAttached();
	});

	test('sidebarHelp=false hides Help in sidebar', async ({ page }) => {
		await setFlags(page, { sidebarHelp: false });
		await expect(page.getByText('Help')).not.toBeAttached();
	});

	test('appIconInSidebar=false hides logo in sidebar header', async ({ page }) => {
		await setFlags(page, { appIconInSidebar: false });
		const logoContainer = page.locator('.bg-sidebar-primary.text-sidebar-primary-foreground');
		await expect(logoContainer).not.toBeAttached();
	});

	test('appNameInSidebar=false hides name text in sidebar header', async ({ page }) => {
		await setFlags(page, { appNameInSidebar: false });
		await expect(
			page.locator('[data-slot="sidebar"]').getByText('Your Story, Rendered', { exact: true }),
		).not.toBeAttached();
	});

	test('projectDropdown=false hides NavUser in sidebar footer', async ({ page }) => {
		await setFlags(page, { projectDropdown: false });
		await expect(page.getByText('Sample Project', { exact: true })).not.toBeAttached();
	});

	test('settings=false hides Settings in sidebar secondary nav', async ({ page }) => {
		await setFlags(page, { settings: false });
		// Settings link should not appear in the sidebar secondary nav
		const sidebarNav = page.locator('[data-slot="sidebar"]');
		await expect(sidebarNav.getByText('Settings')).not.toBeAttached();
	});
});

// =============================================================================
// Flag persistence across reload
// =============================================================================

test.describe('feature flags — persistence', () => {
	test('disabled flag persists across page reload', async ({ page }) => {
		await setFlags(page, { breadcrumb: false });
		const header = page.locator('header');
		// Verify hidden
		await expect(header.getByText('Home')).not.toBeVisible();

		// Reload
		await page.reload();
		await page.waitForLoadState('domcontentloaded');

		// Still hidden
		await expect(header.getByText('Home')).not.toBeVisible();
	});

	test('re-enabling flag after reload restores element', async ({ page }) => {
		const header = page.locator('header');
		// First disable
		await setFlags(page, { breadcrumb: false });
		await expect(header.getByText('Home')).not.toBeVisible();

		// Re-enable
		await setFlags(page, { breadcrumb: true });
		await expect(header.getByText('Home')).toBeVisible();
	});
});

// =============================================================================
// Multiple flags disabled simultaneously
// =============================================================================

test.describe('feature flags — combined', () => {
	test('multiple flags disabled simultaneously — layout remains functional', async ({ page }) => {
		await setFlags(page, {
			breadcrumb: false,
			sidebarToggle: false,
			modeToggle: false,
			sidebarHelp: false,
			appIconInSidebar: false,
			appNameInSidebar: false,
			projectDropdown: false,
			settings: false,
		});

		// Page should load without errors
		await expect(page).toHaveTitle('Storylyne - Home - Your Story, Rendered');

		// Header should still render (even if empty of controlled content)
		const header = page.locator('header');
		await expect(header).toBeAttached();

		// Sidebar should still render
		const sidebar = page.locator('[data-slot="sidebar"]').first();
		await expect(sidebar).toBeAttached();

		// Controlled elements should all be absent
		await expect(header.getByText('Home')).not.toBeVisible();
		await expect(page.locator('button[data-sidebar="trigger"]')).not.toBeAttached();
		await expect(page.getByRole('button', { name: /toggle mode/i })).not.toBeAttached();
		await expect(page.getByText('Help')).not.toBeAttached();
		await expect(page.getByText('Sample Project', { exact: true })).not.toBeAttached();
	});
});

// =============================================================================
// URL override for feature flags
// =============================================================================

test.describe('feature flags — URL overrides', () => {
	test(`${URL_PARAM_PREFIX}ff.breadcrumb=false disables breadcrumb via URL`, async ({ page }) => {
		await page.goto(`/?${URL_PARAM_PREFIX}debug=true&${URL_PARAM_PREFIX}ff.breadcrumb=false`);
		await page.waitForLoadState('domcontentloaded');
		// Wait for client-side hydration to apply URL overrides
		await page.waitForTimeout(200);
		const header = page.locator('header');
		await expect(header.getByText('Home')).not.toBeVisible();
	});

	test(`${URL_PARAM_PREFIX}ff.modeToggle=false disables mode toggle via URL`, async ({ page }) => {
		await page.goto(`/?${URL_PARAM_PREFIX}debug=true&${URL_PARAM_PREFIX}ff.modeToggle=false`);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		await expect(page.getByRole('button', { name: /toggle mode/i })).not.toBeAttached();
	});
});
