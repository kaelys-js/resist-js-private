import { test, expect } from '@playwright/test';

test.describe('Error pages', () => {
	test.describe('400 Bad Request', () => {
		test('shows bad request title', async ({ page }) => {
			await page.goto('/test-error/400');
			await expect(page.getByText(/bad request/i)).toBeVisible();
			await expect(page.getByRole('link', { name: /go to homepage/i })).toBeVisible();
		});

		test('has friendly description', async ({ page }) => {
			await page.goto('/test-error/400');
			await expect(page.getByText(/something in that request/i)).toBeVisible();
		});

		test('does not show try again button', async ({ page }) => {
			await page.goto('/test-error/400');
			await expect(page.getByRole('button', { name: /try again/i })).not.toBeVisible();
		});

		test('page title includes status code', async ({ page }) => {
			await page.goto('/test-error/400');
			await expect(page).toHaveTitle(/bad request.*400.*WebForge/i);
		});
	});

	test.describe('403 Forbidden', () => {
		test('shows access denied title', async ({ page }) => {
			await page.goto('/test-error/403');
			await expect(page.getByText(/access denied/i)).toBeVisible();
			await expect(page.getByRole('link', { name: /go to homepage/i })).toBeVisible();
		});

		test('has friendly description', async ({ page }) => {
			await page.goto('/test-error/403');
			await expect(page.getByText(/permission/i)).toBeVisible();
		});

		test('does not show try again button', async ({ page }) => {
			await page.goto('/test-error/403');
			await expect(page.getByRole('button', { name: /try again/i })).not.toBeVisible();
		});

		test('page title includes status code', async ({ page }) => {
			await page.goto('/test-error/403');
			await expect(page).toHaveTitle(/access denied.*403.*WebForge/i);
		});
	});

	test.describe('404 Not Found', () => {
		test('shows not found title', async ({ page }) => {
			await page.goto('/test-error/404');
			await expect(page.getByText(/page not found/i)).toBeVisible();
			await expect(page.getByRole('link', { name: /go to homepage/i })).toBeVisible();
		});

		test('has friendly description', async ({ page }) => {
			await page.goto('/test-error/404');
			await expect(page.getByText(/we looked everywhere/i)).toBeVisible();
		});

		test('does not show try again button', async ({ page }) => {
			await page.goto('/test-error/404');
			await expect(page.getByRole('button', { name: /try again/i })).not.toBeVisible();
		});

		test('page title includes status code', async ({ page }) => {
			await page.goto('/test-error/404');
			await expect(page).toHaveTitle(/page not found.*404.*WebForge/i);
		});

		test('nonexistent route shows 404 page', async ({ page }) => {
			await page.goto('/this-route-does-not-exist');
			await expect(page.getByText(/page not found/i)).toBeVisible();
		});
	});

	test.describe('500 Server Error', () => {
		test('shows server error title and try again button', async ({ page }) => {
			await page.goto('/test-error/500');
			await expect(page.getByText(/something went wrong/i)).toBeVisible();
			await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
		});

		test('has friendly description', async ({ page }) => {
			await page.goto('/test-error/500');
			await expect(page.getByText(/something broke on our end/i)).toBeVisible();
		});

		test('page title includes status code', async ({ page }) => {
			await page.goto('/test-error/500');
			await expect(page).toHaveTitle(/something went wrong.*500.*WebForge/i);
		});

		test('homepage link navigates home from 500 page', async ({ page }) => {
			await page.goto('/test-error/500');
			await page.getByRole('link', { name: /go to homepage/i }).click();
			await expect(page).toHaveURL('/');
		});

		test('try again button reloads the page', async ({ page }) => {
			await page.goto('/test-error/500');
			await expect(page.getByText(/something went wrong/i)).toBeVisible();

			await Promise.all([
				page.waitForEvent('load'),
				page.getByRole('button', { name: /try again/i }).click(),
			]);

			await expect(page).toHaveURL(/test-error\/500/);
			await expect(page.getByText(/something went wrong/i)).toBeVisible();
		});
	});

	test.describe('Unexpected error (error ID)', () => {
		test('shows 500 page with error ID text', async ({ page }) => {
			await page.goto('/test-error/unexpected');
			await expect(page.getByText(/something went wrong/i)).toBeVisible();
			await expect(page.getByText(/error id/i)).toBeVisible();
		});

		test('x-error-id response header is a valid UUID', async ({ page }) => {
			const response = await page.goto('/test-error/unexpected');
			const errorId: string | null = (await response?.headerValue('x-error-id')) ?? null;
			expect(errorId).toBeTruthy();
			expect(errorId).toMatch(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/);
		});

		test('displayed error ID matches x-error-id response header', async ({ page }) => {
			const response = await page.goto('/test-error/unexpected');
			const headerErrorId: string | null = (await response?.headerValue('x-error-id')) ?? null;
			expect(headerErrorId).toBeTruthy();

			const errorIdText = page.getByText(/error id/i);
			await expect(errorIdText).toBeVisible();
			await expect(errorIdText).toContainText(headerErrorId!);
		});
	});

	test.describe('Navigation', () => {
		test('homepage link navigates home from 404', async ({ page }) => {
			await page.goto('/test-error/404');
			await page.getByRole('link', { name: /go to homepage/i }).click();
			await expect(page).toHaveURL('/');
		});
	});

	test.describe('Accessibility', () => {
		test('error page breadcrumb shows "Error" instead of "Scene"', async ({ page }) => {
			await page.goto('/test-error/404');
			await expect(page.getByText('Error', { exact: true })).toBeVisible();
		});

		test('error page has alert role', async ({ page }) => {
			await page.goto('/test-error/404');
			await expect(page.locator('[role="alert"]')).toBeVisible();
		});

		test('error page has h1 heading', async ({ page }) => {
			await page.goto('/test-error/404');
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		});

		test('error page renders an icon', async ({ page }) => {
			await page.goto('/test-error/404');
			const alertContainer = page.locator('[role="alert"]');
			const icon = alertContainer.locator('svg').first();
			await expect(icon).toBeVisible();
		});
	});
});
