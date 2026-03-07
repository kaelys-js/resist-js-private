import { test, expect, type Page } from '@playwright/test';
import { URL_PARAM_PREFIX } from '../src/lib/config/app-meta';

const STORAGE_KEY = 'storylyne:editor-state';

/**
 * Feature flags that the free plan disables (10 flags).
 */
const FREE_PLAN_FLAGS: Record<string, boolean> = {
	settings: false,
	themeSelection: false,
	languageSelection: false,
	resizableSidebar: false,
	projectDropdown: false,
	projectDropdownSettings: false,
	projectDropdownIcon: false,
	headerUserNotifications: false,
	headerUserShortcuts: false,
	headerUserSettings: false,
};

/**
 * Sets subscription plan and corresponding feature flag overrides in localStorage.
 *
 * @param page - Playwright page instance
 * @param plan - Plan tier to set (e.g. 'free', 'pro')
 * @param flagOverrides - Feature flag overrides that correspond to the plan
 */
async function setPlanWithFlags(
	page: Page,
	plan: string,
	flagOverrides: Record<string, boolean>,
): Promise<void> {
	await page.goto('/');
	await page.evaluate(
		({ key, planTier, flags }) => {
			const raw: string | null = localStorage.getItem(key);
			const state = raw ? JSON.parse(raw) : { app: {}, features: {} };
			state.app = { ...state.app, subscriptionPlan: planTier };
			state.features = { ...state.features, ...flags };
			localStorage.setItem(key, JSON.stringify(state));
		},
		{ key: STORAGE_KEY, planTier: plan, flags: flagOverrides },
	);
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
}

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
// Dev toolbar — subscription plan picker
// =============================================================================

test.describe('subscription plan — dev toolbar', () => {
	test('subscription plan picker appears in User section of app state panel', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-app');
		const panel = page.locator('[data-testid="dev-toolbar-app-state"]');
		await expect(panel).toBeVisible();
		await expect(panel.getByText('Subscription Plan')).toBeVisible();
	});

	test('plan picker shows Pro as default value', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-app');
		const panel = page.locator('[data-testid="dev-toolbar-app-state"]');
		// Default plan is 'pro' — the combobox trigger should display "Pro"
		const combobox = panel.locator('button[role="combobox"]').filter({ hasText: 'Pro' });
		await expect(combobox).toBeVisible();
	});

	test('plan picker dropdown shows all 4 plan options', async ({ page }) => {
		await expandToolbar(page);
		await clickToolbarButton(page, 'toolbar-btn-app');
		const panel = page.locator('[data-testid="dev-toolbar-app-state"]');
		// Click the subscription plan combobox to open it
		const combobox = panel.locator('button[role="combobox"]').filter({ hasText: 'Pro' });
		await combobox.click();

		// The popover command list should display all 4 plans
		const listbox = page.locator('[data-slot="command-list"]').last();
		await expect(listbox.getByText('Free', { exact: true })).toBeVisible();
		await expect(listbox.getByText('Starter', { exact: true })).toBeVisible();
		await expect(listbox.getByText('Pro', { exact: true }).first()).toBeVisible();
		await expect(listbox.getByText('Enterprise', { exact: true })).toBeVisible();
	});
});

// =============================================================================
// Subscription plan — feature flag integration
// =============================================================================

test.describe('subscription plan — feature flag integration', () => {
	test('free plan hides Settings from sidebar', async ({ page }) => {
		await setPlanWithFlags(page, 'free', FREE_PLAN_FLAGS);
		const sidebar = page.locator('[data-slot="sidebar"]');
		await expect(sidebar.getByText('Settings')).not.toBeAttached();
	});

	test('free plan hides project dropdown from sidebar footer', async ({ page }) => {
		await setPlanWithFlags(page, 'free', FREE_PLAN_FLAGS);
		await expect(page.getByText('Sample Project', { exact: true })).not.toBeAttached();
	});

	test('free plan hides Keyboard Shortcuts from user dropdown', async ({ page }) => {
		await setPlanWithFlags(page, 'free', FREE_PLAN_FLAGS);
		const trigger = page.getByTestId('header-user-trigger');
		await trigger.click();
		const content = page.locator('[data-slot="dropdown-menu-content"]');
		await expect(content).toBeVisible();
		await expect(content.getByText('Keyboard Shortcuts')).not.toBeAttached();
	});

	test('free plan hides Notifications from user dropdown', async ({ page }) => {
		await setPlanWithFlags(page, 'free', FREE_PLAN_FLAGS);
		const trigger = page.getByTestId('header-user-trigger');
		await trigger.click();
		const content = page.locator('[data-slot="dropdown-menu-content"]');
		await expect(content).toBeVisible();
		await expect(content.getByText('Notifications')).not.toBeAttached();
	});

	test('pro plan keeps all features enabled', async ({ page }) => {
		await setPlanWithFlags(page, 'pro', {});
		// Settings should be visible in sidebar
		const sidebar = page.locator('[data-slot="sidebar"]');
		await expect(sidebar.getByText('Settings').first()).toBeVisible();
		// Project dropdown should be visible
		await expect(page.getByText('Sample Project', { exact: true })).toBeVisible();
	});
});

// =============================================================================
// Subscription plan — persistence
// =============================================================================

test.describe('subscription plan — persistence', () => {
	test('plan setting persists across page reload', async ({ page }) => {
		await setPlanWithFlags(page, 'free', FREE_PLAN_FLAGS);
		// Settings should be hidden on free plan
		const sidebar = page.locator('[data-slot="sidebar"]');
		await expect(sidebar.getByText('Settings')).not.toBeAttached();

		// Reload
		await page.reload();
		await page.waitForLoadState('domcontentloaded');

		// Still hidden after reload
		await expect(sidebar.getByText('Settings')).not.toBeAttached();
	});

	test('switching from free to pro re-enables features', async ({ page }) => {
		// Start with free plan
		await setPlanWithFlags(page, 'free', FREE_PLAN_FLAGS);
		const sidebar = page.locator('[data-slot="sidebar"]');
		await expect(sidebar.getByText('Settings')).not.toBeAttached();

		// Switch to pro (re-enable all flags)
		await setPlanWithFlags(page, 'pro', {
			settings: true,
			themeSelection: true,
			languageSelection: true,
			resizableSidebar: true,
			projectDropdown: true,
			projectDropdownSettings: true,
			projectDropdownIcon: true,
			headerUserNotifications: true,
			headerUserShortcuts: true,
			headerUserSettings: true,
		});
		await expect(sidebar.getByText('Settings').first()).toBeVisible();
		await expect(page.getByText('Sample Project', { exact: true })).toBeVisible();
	});
});
