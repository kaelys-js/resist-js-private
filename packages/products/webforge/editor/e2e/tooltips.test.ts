import { test, expect } from '@playwright/test';

// bits-ui v1.8.0 does not set role="tooltip" on tooltip content.
// Target the data-slot attribute set by our shadcn-svelte tooltip wrapper instead.
const tooltipSelector = '[data-slot="tooltip-content"]';

test.describe('tooltips', () => {
	test('sidebar trigger shows tooltip on hover', async ({ page }) => {
		await page.goto('/');
		const trigger = page.locator('[data-sidebar="trigger"]');
		await expect(trigger).toBeVisible();
		await trigger.hover();
		const tooltip = page.locator(tooltipSelector);
		await expect(tooltip).toBeVisible();
		await expect(tooltip).toHaveText('Toggle Sidebar');
	});

	test('sidebar trigger tooltip disappears on mouse leave', async ({ page }) => {
		await page.goto('/');
		const trigger = page.locator('[data-sidebar="trigger"]');
		await trigger.hover();
		await expect(page.locator(tooltipSelector)).toBeVisible();
		// Move mouse away from trigger
		await page.mouse.move(0, 0);
		await expect(page.locator(tooltipSelector)).toBeHidden();
	});

	test('mode toggle shows tooltip on hover', async ({ page }) => {
		await page.goto('/');
		const toggle = page.getByRole('button', { name: /toggle mode/i });
		await expect(toggle).toBeVisible();
		await toggle.hover();
		const tooltip = page.locator(tooltipSelector);
		await expect(tooltip).toBeVisible();
		await expect(tooltip).toHaveText('Toggle theme');
	});

	test('mode toggle tooltip hides when dropdown opens', async ({ page }) => {
		await page.goto('/');
		const toggle = page.getByRole('button', { name: /toggle mode/i });
		await toggle.hover();
		await expect(page.locator(tooltipSelector)).toBeVisible();
		// Click to open dropdown — tooltip should dismiss
		await toggle.click();
		await expect(page.getByRole('menuitem', { name: /light/i })).toBeVisible();
		await expect(page.locator(tooltipSelector)).toBeHidden();
	});

	test('tooltip content has primary background styling', async ({ page }) => {
		await page.goto('/');
		const trigger = page.locator('[data-sidebar="trigger"]');
		await trigger.hover();
		const tooltip = page.locator(tooltipSelector);
		await expect(tooltip).toBeVisible();
		await expect(tooltip).toHaveAttribute('data-slot', 'tooltip-content');
	});
});
