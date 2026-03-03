import { test, expect } from '@playwright/test';

/**
 * Comprehensive head meta tag tests for both normal and error pages.
 * Every meta tag, favicon link, and OG property is verified on both page types.
 */

test.describe('head meta — normal page (/)', () => {
	test('charset is utf-8', async ({ page }) => {
		await page.goto('/');
		const charset = page.locator('meta[charset]');
		// oxlint-disable-next-line text-encoding-identifier-case -- HTML charset attribute uses "utf-8" per spec
		await expect(charset).toHaveAttribute('charset', 'utf-8');
	});

	test('viewport is width=device-width, initial-scale=1', async ({ page }) => {
		await page.goto('/');
		const viewport = page.locator('meta[name="viewport"]');
		await expect(viewport).toHaveAttribute('content', /width=device-width/);
	});

	test('color-scheme is light dark', async ({ page }) => {
		await page.goto('/');
		const colorScheme = page.locator('meta[name="color-scheme"]');
		await expect(colorScheme).toHaveAttribute('content', 'light dark');
	});

	test('robots has noindex and nofollow', async ({ page }) => {
		await page.goto('/');
		const robots = page.locator('meta[name="robots"]');
		await expect(robots).toHaveAttribute('content', /noindex/);
		await expect(robots).toHaveAttribute('content', /nofollow/);
	});

	test('title is WebForge', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle('WebForge');
	});

	test('description contains HD-2D', async ({ page }) => {
		await page.goto('/');
		const description = page.locator('meta[name="description"]');
		await expect(description).toHaveAttribute('content', /HD-2D/);
	});

	test('application-name is WebForge', async ({ page }) => {
		await page.goto('/');
		const appName = page.locator('meta[name="application-name"]');
		await expect(appName).toHaveAttribute('content', 'WebForge');
	});

	test('theme-color light is #ffffff', async ({ page }) => {
		await page.goto('/');
		const themeColor = page.locator(
			'meta[name="theme-color"][media="(prefers-color-scheme: light)"]',
		);
		await expect(themeColor).toHaveAttribute('content', '#ffffff');
	});

	test('theme-color dark is #0a0a0a', async ({ page }) => {
		await page.goto('/');
		const themeColor = page.locator(
			'meta[name="theme-color"][media="(prefers-color-scheme: dark)"]',
		);
		await expect(themeColor).toHaveAttribute('content', '#0a0a0a');
	});

	test('og:title is WebForge', async ({ page }) => {
		await page.goto('/');
		const ogTitle = page.locator('meta[property="og:title"]');
		await expect(ogTitle).toHaveAttribute('content', 'WebForge');
	});

	test('og:description contains HD-2D', async ({ page }) => {
		await page.goto('/');
		const ogDescription = page.locator('meta[property="og:description"]');
		await expect(ogDescription).toHaveAttribute('content', /HD-2D/);
	});

	test('og:type is website', async ({ page }) => {
		await page.goto('/');
		const ogType = page.locator('meta[property="og:type"]');
		await expect(ogType).toHaveAttribute('content', 'website');
	});

	test('og:locale defaults to en_US', async ({ page }) => {
		await page.goto('/');
		const ogLocale = page.locator('meta[property="og:locale"]');
		await expect(ogLocale).toHaveAttribute('content', 'en_US');
	});

	test('favicon SVG link is present', async ({ page }) => {
		await page.goto('/');
		const favicon = page.locator('link[rel="icon"][type="image/svg+xml"]');
		await expect(favicon).toBeAttached();
	});

	test('favicon PNG 32x32 link is present', async ({ page }) => {
		await page.goto('/');
		const favicon = page.locator('link[rel="icon"][type="image/png"][sizes="32x32"]');
		await expect(favicon).toBeAttached();
	});

	test('apple-touch-icon 180x180 link is present', async ({ page }) => {
		await page.goto('/');
		const icon = page.locator('link[rel="apple-touch-icon"][sizes="180x180"]');
		await expect(icon).toBeAttached();
	});
});

test.describe('head meta — error page (/test-error/404)', () => {
	test('charset is utf-8', async ({ page }) => {
		await page.goto('/test-error/404');
		const charset = page.locator('meta[charset]');
		// oxlint-disable-next-line text-encoding-identifier-case -- HTML charset attribute uses "utf-8" per spec
		await expect(charset).toHaveAttribute('charset', 'utf-8');
	});

	test('viewport is width=device-width', async ({ page }) => {
		await page.goto('/test-error/404');
		const viewport = page.locator('meta[name="viewport"]');
		await expect(viewport).toHaveAttribute('content', /width=device-width/);
	});

	test('color-scheme is light dark', async ({ page }) => {
		await page.goto('/test-error/404');
		const colorScheme = page.locator('meta[name="color-scheme"]');
		await expect(colorScheme).toHaveAttribute('content', 'light dark');
	});

	test('robots has noindex and nofollow', async ({ page }) => {
		await page.goto('/test-error/404');
		const robots = page.locator('meta[name="robots"][content*="noindex"]').first();
		await expect(robots).toBeAttached();
		await expect(robots).toHaveAttribute('content', /nofollow/);
	});

	test('title includes status code and WebForge', async ({ page }) => {
		await page.goto('/test-error/404');
		await expect(page).toHaveTitle(/page not found.*404.*WebForge/i);
	});

	test('description is inherited from layout', async ({ page }) => {
		await page.goto('/test-error/404');
		const description = page.locator('meta[name="description"]');
		await expect(description).toHaveAttribute('content', /HD-2D/);
	});

	test('application-name is inherited from layout', async ({ page }) => {
		await page.goto('/test-error/404');
		const appName = page.locator('meta[name="application-name"]');
		await expect(appName).toHaveAttribute('content', 'WebForge');
	});

	test('theme-color light is #ffffff', async ({ page }) => {
		await page.goto('/test-error/404');
		const themeColor = page.locator(
			'meta[name="theme-color"][media="(prefers-color-scheme: light)"]',
		);
		await expect(themeColor).toHaveAttribute('content', '#ffffff');
	});

	test('theme-color dark is #0a0a0a', async ({ page }) => {
		await page.goto('/test-error/404');
		const themeColor = page.locator(
			'meta[name="theme-color"][media="(prefers-color-scheme: dark)"]',
		);
		await expect(themeColor).toHaveAttribute('content', '#0a0a0a');
	});

	test('og:title is WebForge', async ({ page }) => {
		await page.goto('/test-error/404');
		const ogTitle = page.locator('meta[property="og:title"]');
		await expect(ogTitle).toHaveAttribute('content', 'WebForge');
	});

	test('og:description is inherited from layout', async ({ page }) => {
		await page.goto('/test-error/404');
		const ogDescription = page.locator('meta[property="og:description"]');
		await expect(ogDescription).toHaveAttribute('content', /HD-2D/);
	});

	test('og:type is website', async ({ page }) => {
		await page.goto('/test-error/404');
		const ogType = page.locator('meta[property="og:type"]');
		await expect(ogType).toHaveAttribute('content', 'website');
	});

	test('og:locale defaults to en_US', async ({ page }) => {
		await page.goto('/test-error/404');
		const ogLocale = page.locator('meta[property="og:locale"]');
		await expect(ogLocale).toHaveAttribute('content', 'en_US');
	});

	test('favicon SVG link is present', async ({ page }) => {
		await page.goto('/test-error/404');
		const favicon = page.locator('link[rel="icon"][type="image/svg+xml"]');
		await expect(favicon).toBeAttached();
	});

	test('favicon PNG 32x32 link is present', async ({ page }) => {
		await page.goto('/test-error/404');
		const favicon = page.locator('link[rel="icon"][type="image/png"][sizes="32x32"]');
		await expect(favicon).toBeAttached();
	});

	test('apple-touch-icon 180x180 link is present', async ({ page }) => {
		await page.goto('/test-error/404');
		const icon = page.locator('link[rel="apple-touch-icon"][sizes="180x180"]');
		await expect(icon).toBeAttached();
	});
});
