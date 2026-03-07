import { test, expect } from '@playwright/test';

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
		await expect(label).toContainText('Test User');
		await expect(label).toContainText('test-user@example.com');
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

	test('Log Out item has destructive variant', async ({ page }) => {
		await page.goto('/');
		const trigger = page.getByTestId('header-user-trigger');
		await trigger.click();

		const content = page.locator('[data-slot="dropdown-menu-content"]');
		const logOutItem = content.locator('[data-slot="dropdown-menu-item"]', {
			hasText: 'Log Out',
		});
		await expect(logOutItem).toHaveAttribute('data-variant', 'destructive');
	});

	test('headerUserDropdown=false hides trigger via URL override', async ({ page }) => {
		await page.goto('/?sl.debug=true&sl.ff.headerUserDropdown=false');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(200);
		const trigger = page.getByTestId('header-user-trigger');
		await expect(trigger).not.toBeAttached();
	});
});
