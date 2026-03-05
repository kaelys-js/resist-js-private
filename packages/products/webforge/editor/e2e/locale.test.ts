import { test, expect } from '@playwright/test';

test.describe('locale', () => {
	test('defaults to lang="en"', async ({ page }) => {
		await page.goto('/');
		const lang = await page.locator('html').getAttribute('lang');
		expect(lang).toBe('en');
	});

	test('cookie sets locale on page load', async ({ context, page }) => {
		await context.addCookies([{ name: 'locale', value: 'ja', url: 'http://127.0.0.1:4173' }]);
		await page.goto('/');
		const lang = await page.locator('html').getAttribute('lang');
		expect(lang).toBe('ja');
	});

	test('og:locale updates with locale cookie', async ({ context, page }) => {
		await context.addCookies([{ name: 'locale', value: 'fr', url: 'http://127.0.0.1:4173' }]);
		await page.goto('/');
		const ogLocale = page.locator('meta[property="og:locale"]');
		await expect(ogLocale).toHaveAttribute('content', 'fr_FR');
	});

	test('meta description changes with locale', async ({ context, page }) => {
		await context.addCookies([{ name: 'locale', value: 'ja', url: 'http://127.0.0.1:4173' }]);
		await page.goto('/');
		const description = page.locator('meta[name="description"]');
		const content = await description.getAttribute('content');
		// Japanese description should contain Storyline but differ from English
		expect(content).toContain('Storyline');
		expect(content).toMatch(/[\u3000-\u9FFF]/);
	});

	test('dir attribute defaults to ltr', async ({ page }) => {
		await page.goto('/');
		const dir = await page.locator('html').getAttribute('dir');
		expect(dir).toBe('ltr');
	});
});
