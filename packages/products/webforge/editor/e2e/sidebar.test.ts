import { test, expect } from '@playwright/test';

test.describe('sidebar', () => {
	test('sidebar renders with Storyline branding', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Storyline', { exact: true }).first()).toBeVisible();
		await expect(page.getByText('RPG Editor', { exact: true })).toBeVisible();
	});

	test('scene list renders with default scenes', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Scenes')).toBeVisible();
		await expect(page.getByText('Overworld')).toBeVisible();
	});

	test('new scene button is present', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('New Scene')).toBeVisible();
	});

	test('scenes list is collapsible', async ({ page }) => {
		await page.goto('/');
		// Scenes section starts open by default
		await expect(page.getByText('Overworld')).toBeVisible();

		// Click the Scenes group label (collapsible trigger) to close
		const trigger = page.locator('[data-slot="sidebar-group-label"]').first();
		await trigger.click();

		// Scene items should be hidden
		await expect(page.getByText('Overworld')).not.toBeVisible();
		await expect(page.getByText('New Scene')).not.toBeVisible();

		// Click again to reopen
		await trigger.click();
		await expect(page.getByText('Overworld')).toBeVisible();
	});

	test('sidebar toggle collapses sidebar', async ({ page }) => {
		await page.goto('/');
		const sidebarWrapper = page.locator('[data-slot="sidebar"]').first();
		await expect(sidebarWrapper).toHaveAttribute('data-state', 'expanded');

		// Ensure page is interactive before sending keyboard shortcut
		await page.locator('body').click();
		await page.keyboard.press('ControlOrMeta+b');
		await expect(sidebarWrapper).toHaveAttribute('data-state', 'collapsed');
	});
});

test.describe('resizable sidebar', () => {
	test('resize handle is visible between sidebar and content', async ({ page }) => {
		await page.goto('/');
		const handle = page.locator('[data-slot="resizable-handle"]');
		await expect(handle).toBeAttached();
	});

	test('sidebar can be resized by dragging handle', async ({ page }) => {
		await page.goto('/');
		const handle = page.locator('[data-slot="resizable-handle"]');
		await expect(handle).toBeAttached();

		const sidebar = page.locator('[data-slot="sidebar"]').first();
		const initialBox = await sidebar.boundingBox();
		expect(initialBox).toBeTruthy();
		const initialWidth = initialBox!.width;

		const handleBox = await handle.boundingBox();
		expect(handleBox).toBeTruthy();
		const cx = handleBox!.x + handleBox!.width / 2;
		const cy = handleBox!.y + handleBox!.height / 2;

		await page.mouse.move(cx, cy);
		await page.mouse.down();
		await page.mouse.move(cx + 100, cy);
		await page.mouse.up();
		await page.waitForTimeout(200);

		const newBox = await sidebar.boundingBox();
		expect(newBox).toBeTruthy();
		expect(newBox!.width).toBeGreaterThan(initialWidth + 50);
	});

	test('sidebar resize persists across reload', async ({ page }) => {
		await page.goto('/');
		const handle = page.locator('[data-slot="resizable-handle"]');
		await expect(handle).toBeAttached();

		const handleBox = await handle.boundingBox();
		expect(handleBox).toBeTruthy();
		const cx = handleBox!.x + handleBox!.width / 2;
		const cy = handleBox!.y + handleBox!.height / 2;

		// Drag to resize sidebar wider
		await page.mouse.move(cx, cy);
		await page.mouse.down();
		await page.mouse.move(cx + 100, cy);
		await page.mouse.up();
		await page.waitForTimeout(200);

		const sidebar = page.locator('[data-slot="sidebar"]').first();
		const widthBefore = (await sidebar.boundingBox())!.width;

		// Reload and verify width persisted
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await expect(page.locator('[data-slot="resizable-handle"]')).toBeAttached();
		await page.waitForTimeout(200);

		const widthAfter = (await sidebar.boundingBox())!.width;
		expect(Math.abs(widthAfter - widthBefore)).toBeLessThan(10);
	});

	test('Ctrl+B toggles sidebar with resizable layout', async ({ page }) => {
		await page.goto('/');
		// Verify PaneForge resizable layout is active
		await expect(page.locator('[data-slot="resizable-handle"]')).toBeAttached();

		const sidebarSlot = page.locator('[data-slot="sidebar"]').first();
		await expect(sidebarSlot).toHaveAttribute('data-state', 'expanded');

		await page.locator('body').click();
		await page.keyboard.press('ControlOrMeta+b');
		await expect(sidebarSlot).toHaveAttribute('data-state', 'collapsed');

		// Verify resize handle still exists after collapse
		await expect(page.locator('[data-slot="resizable-handle"]')).toBeAttached();
	});
});
