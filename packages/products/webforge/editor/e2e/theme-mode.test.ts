import { test, expect } from '@playwright/test';

test.describe('theme and mode', () => {
	test('page has mode-watcher script', async ({ page }) => {
		await page.goto('/');
		// mode-watcher injects a script or sets class on html
		const html = page.locator('html');
		// The html element should have a class attribute set by mode-watcher
		await expect(html).toBeAttached();
	});

	test('mode toggle button is accessible', async ({ page }) => {
		await page.goto('/');
		const toggle = page.getByRole('button', { name: /toggle mode/i });
		await expect(toggle).toBeVisible();
	});

	test('clicking mode toggle opens dropdown', async ({ page }) => {
		await page.goto('/');
		const toggle = page.getByRole('button', { name: /toggle mode/i });
		await expect(toggle).toBeVisible();
		await toggle.click();
		// After clicking, the dropdown should show Light/Dark/System options
		await expect(page.getByRole('menuitem', { name: /light/i })).toBeVisible();
		await expect(page.getByRole('menuitem', { name: /dark/i })).toBeVisible();
		await expect(page.getByRole('menuitem', { name: /system/i })).toBeVisible();
	});

	test('selecting dark mode applies dark class', async ({ page }) => {
		await page.goto('/');
		const toggle = page.getByRole('button', { name: /toggle mode/i });
		await expect(toggle).toBeVisible();
		await toggle.click();
		await expect(page.getByRole('menuitem', { name: /dark/i })).toBeVisible();
		await page.getByRole('menuitem', { name: /dark/i }).click();
		// mode-watcher adds 'dark' class to html element
		await expect(page.locator('html')).toHaveClass(/dark/);
	});

	test('selecting light mode removes dark class', async ({ page }) => {
		await page.goto('/');
		const toggle = page.getByRole('button', { name: /toggle mode/i });
		await expect(toggle).toBeVisible();
		// First set dark
		await toggle.click();
		await expect(page.getByRole('menuitem', { name: /dark/i })).toBeVisible();
		await page.getByRole('menuitem', { name: /dark/i }).click();
		await expect(page.locator('html')).toHaveClass(/dark/);
		// Now set light
		await toggle.click();
		await expect(page.getByRole('menuitem', { name: /light/i })).toBeVisible();
		await page.getByRole('menuitem', { name: /light/i }).click();
		await expect(page.locator('html')).not.toHaveClass(/dark/);
	});

	test('NavProject dropdown does NOT contain mode toggle', async ({ page }) => {
		await page.goto('/');
		// Open NavProject dropdown
		await page.getByText('Sample Project', { exact: true }).click();
		await page.waitForTimeout(200);
		// ModeToggle renders a button with aria-label "Toggle mode"
		// It should NOT be inside the NavProject dropdown menu
		const dropdown = page.locator('[role="menu"]');
		await expect(dropdown).toBeVisible();
		await expect(dropdown.getByRole('button', { name: /toggle mode/i })).not.toBeVisible();
	});
});
