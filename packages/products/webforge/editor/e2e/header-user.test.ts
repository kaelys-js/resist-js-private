import { test, expect, type Page } from '@playwright/test';

const STORAGE_KEY = 'app:editor-state';

/**
 * Sets feature flags in localStorage before navigating.
 * Flags not specified default to true (schema defaults).
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
// HeaderUser — visibility and trigger
// =============================================================================

test.describe('header user dropdown', () => {
	test('user avatar trigger is visible in header', async ({ page }) => {
		await page.goto('/');
		const trigger = page.getByTestId('header-user-trigger');
		await expect(trigger).toBeVisible();
	});

	test('clicking trigger opens dropdown menu', async ({ page }) => {
		await page.goto('/');
		const trigger = page.getByTestId('header-user-trigger');
		await trigger.click();

		// Dropdown content should appear
		const content = page.locator('[data-slot="dropdown-menu-content"]');
		await expect(content).toBeVisible();
	});

	test('dropdown shows user info label with mock user name', async ({ page }) => {
		await page.goto('/');
		const trigger = page.getByTestId('header-user-trigger');
		await trigger.click();

		// Wait for dropdown content to appear
		const content = page.locator('[data-slot="dropdown-menu-content"]');
		await expect(content).toBeVisible();
		// User label with name and email — use toContainText on the label div
		const label = content.locator('[data-slot="dropdown-menu-label"]');
		await expect(label).toBeVisible();
		await expect(label).toContainText('Coleb');
		await expect(label).toContainText('coleb@example.com');
	});

	test('all 7 menu items visible in dropdown', async ({ page }) => {
		await page.goto('/');
		const trigger = page.getByTestId('header-user-trigger');
		await trigger.click();

		const content = page.locator('[data-slot="dropdown-menu-content"]');
		await expect(content.getByText('Account')).toBeVisible();
		await expect(content.getByText('Subscription')).toBeVisible();
		await expect(content.getByText('Notifications')).toBeVisible();
		await expect(content.getByText('Keyboard Shortcuts')).toBeVisible();
		await expect(content.getByText('Settings')).toBeVisible();
		await expect(content.getByText("What's New")).toBeVisible();
		await expect(content.getByText('Log Out')).toBeVisible();
	});

	test('pressing Escape closes dropdown', async ({ page }) => {
		await page.goto('/');
		const trigger = page.getByTestId('header-user-trigger');
		await trigger.click();

		const content = page.locator('[data-slot="dropdown-menu-content"]');
		await expect(content).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(content).not.toBeVisible();
	});

	test('Log Out item has destructive styling', async ({ page }) => {
		await page.goto('/');
		const trigger = page.getByTestId('header-user-trigger');
		await trigger.click();

		const content = page.locator('[data-slot="dropdown-menu-content"]');
		const logOutItem = content.locator('[data-slot="dropdown-menu-item"]', {
			hasText: 'Log Out',
		});
		await expect(logOutItem).toHaveClass(/text-destructive/);
	});

	test('headerUserDropdown=false hides trigger via URL override', async ({ page }) => {
		await page.goto('/?wf.debug=true&wf.ff.headerUserDropdown=false');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		const trigger = page.getByTestId('header-user-trigger');
		await expect(trigger).not.toBeAttached();
	});
});
