import { test, expect } from '@playwright/test';

test.describe('layout', () => {
	test('page loads with correct title', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle('Storylyne - Scene - Your Story, Rendered');
	});

	test('sidebar is visible on desktop', async ({ page }) => {
		await page.goto('/');
		const sidebar = page.locator('[data-slot="sidebar"]');
		await expect(sidebar.first()).toBeAttached();
	});

	test('breadcrumb contains Editor and Scene', async ({ page }) => {
		await page.goto('/');
		const breadcrumb = page.locator('nav[aria-label="breadcrumb"], ol');
		await expect(breadcrumb.getByText('Editor')).toBeVisible();
		await expect(breadcrumb.getByText('Scene')).toBeVisible();
	});
});

// =============================================================================
// Minimum viewport width
// =============================================================================

test.describe('layout — minimum viewport width', () => {
	test('layout enforces 450px minimum width', async ({ page }) => {
		await page.setViewportSize({ width: 400, height: 800 });
		await page.goto('/');

		const wrapper = page.locator('[data-slot="sidebar-wrapper"]');
		const minWidth: string = await wrapper.evaluate(
			// eslint-disable-next-line no-undef -- runs in browser context
			(el) => window.getComputedStyle(el).minWidth,
		);
		expect(minWidth).toBe('450px');
	});

	test('layout wrapper is wider than viewport at 400px', async ({ page }) => {
		await page.setViewportSize({ width: 400, height: 800 });
		await page.goto('/');

		const wrapper = page.locator('[data-slot="sidebar-wrapper"]');
		const wrapperWidth: number = await wrapper.evaluate((el) => el.scrollWidth);
		expect(wrapperWidth).toBeGreaterThanOrEqual(450);
	});
});

// =============================================================================
// No horizontal scrollbar on content pane
// =============================================================================

test.describe('layout — no horizontal scrollbar', () => {
	test('content pane clips horizontal overflow at 1002px width', async ({ page }) => {
		await page.setViewportSize({ width: 1002, height: 800 });
		await page.goto('/');

		// The content pane is the second Resizable.Pane (contains Sidebar.Inset)
		const contentPane = page.locator('[data-pane-group] > [data-pane-id]').last();
		// eslint-disable-next-line no-undef -- runs in browser context
		const overflowX: string = await contentPane.evaluate(
			(el) => window.getComputedStyle(el).overflowX,
		);
		expect(overflowX).toBe('hidden');
	});

	test('content pane clips horizontal overflow at 768px width', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 800 });
		await page.goto('/');

		const contentPane = page.locator('[data-pane-group] > [data-pane-id]').last();
		// eslint-disable-next-line no-undef -- runs in browser context
		const overflowX: string = await contentPane.evaluate(
			(el) => window.getComputedStyle(el).overflowX,
		);
		expect(overflowX).toBe('hidden');
	});
});
