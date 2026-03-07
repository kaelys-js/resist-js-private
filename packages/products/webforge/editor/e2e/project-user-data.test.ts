import { test, expect } from '@playwright/test';
import { URL_PARAM_PREFIX } from '../src/lib/config/app-meta';

// =============================================================================
// Default state — logged in with mock data
// =============================================================================

test.describe('project & user data — default state', () => {
	test('project name "Sample Project" visible in sidebar footer', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Sample Project', { exact: true })).toBeVisible();
	});

	test('project subtitle visible in sidebar footer', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Sample Project Description')).toBeVisible();
	});

	test('3 scenes visible — Overworld, Town Interior, Dungeon B1', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Overworld')).toBeVisible();
		await expect(page.getByText('Town Interior')).toBeVisible();
		await expect(page.getByText('Dungeon B1')).toBeVisible();
	});

	test('HeaderUser trigger visible', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByTestId('header-user-trigger')).toBeVisible();
	});
});

// =============================================================================
// Auth override — ?${URL_PARAM_PREFIX}auth=false (logged out)
// =============================================================================

test.describe(`project & user data — auth override (?${URL_PARAM_PREFIX}auth=false)`, () => {
	test('HeaderUser trigger hidden when logged out', async ({ page }) => {
		await page.goto(`/?${URL_PARAM_PREFIX}auth=false`);
		await expect(page.getByTestId('header-user-trigger')).not.toBeAttached();
	});

	test('project dropdown hidden when logged out', async ({ page }) => {
		await page.goto(`/?${URL_PARAM_PREFIX}auth=false`);
		await expect(page.getByText('Sample Project', { exact: true })).not.toBeAttached();
	});

	test('scene list hidden when logged out', async ({ page }) => {
		await page.goto(`/?${URL_PARAM_PREFIX}auth=false`);
		await expect(page.getByText('Overworld')).not.toBeAttached();
	});

	test('Settings hidden when logged out', async ({ page }) => {
		await page.goto(`/?${URL_PARAM_PREFIX}auth=false`);
		const sidebar = page.locator('[data-slot="sidebar"]').first();
		await expect(sidebar.getByText('Settings')).not.toBeAttached();
	});

	test('Help still visible when logged out', async ({ page }) => {
		await page.goto(`/?${URL_PARAM_PREFIX}auth=false`);
		await expect(page.getByText('Help')).toBeVisible();
	});

	test('breadcrumb still visible when logged out', async ({ page }) => {
		await page.goto(`/?${URL_PARAM_PREFIX}auth=false`);
		const header = page.locator('header');
		await expect(header.getByText('Home')).toBeVisible();
	});
});
