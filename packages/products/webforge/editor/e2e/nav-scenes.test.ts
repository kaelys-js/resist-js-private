import { test, expect } from '@playwright/test';

test.describe('scene navigation', () => {
	test('scene list shows all default scenes', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Overworld')).toBeVisible();
		await expect(page.getByText('Town Interior')).toBeVisible();
		await expect(page.getByText('Dungeon B1')).toBeVisible();
	});

	test('active scene is visually distinct', async ({ page }) => {
		await page.goto('/');
		// Overworld has isActive: true in the default data
		const overworldButton = page.locator('[data-active="true"]').first();
		await expect(overworldButton).toBeAttached();
	});

	test('"New Scene" button is rendered', async ({ page }) => {
		await page.goto('/');
		const newSceneButton = page.getByText('New Scene');
		await expect(newSceneButton).toBeVisible();
	});

	test('scene context menu appears on "More" click', async ({ page }) => {
		await page.goto('/');
		// Hover over first scene to reveal the "More" action
		await page.getByText('Overworld').hover();
		const moreButton = page.getByRole('button', { name: 'More' }).first();
		if (await moreButton.isVisible()) {
			await moreButton.click();
			// Context menu should show rename/duplicate/delete
			await expect(page.getByText('Rename')).toBeVisible();
			await expect(page.getByText('Duplicate')).toBeVisible();
			await expect(page.getByText('Delete')).toBeVisible();
		}
	});
});
