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

	test('title is Storyline', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle('Storyline');
	});

	test('description contains HD-2D', async ({ page }) => {
		await page.goto('/');
		const description = page.locator('meta[name="description"]');
		await expect(description).toHaveAttribute('content', /HD-2D/);
	});

	test('application-name is Storyline', async ({ page }) => {
		await page.goto('/');
		const appName = page.locator('meta[name="application-name"]');
		await expect(appName).toHaveAttribute('content', 'Storyline');
	});

	test('theme-color light is #ffffff', async ({ page }) => {
		await page.goto('/');
		const themeColor = page.locator(
			'meta[name="theme-color"][media="(prefers-color-scheme: light)"]',
		);
		await expect(themeColor).toHaveAttribute('content', '#ffffff');
	});

	test('theme-color dark is #242424', async ({ page }) => {
		await page.goto('/');
		const themeColor = page.locator(
			'meta[name="theme-color"][media="(prefers-color-scheme: dark)"]',
		);
		await expect(themeColor).toHaveAttribute('content', '#242424');
	});

	test('og:title is Storyline', async ({ page }) => {
		await page.goto('/');
		const ogTitle = page.locator('meta[property="og:title"]');
		await expect(ogTitle).toHaveAttribute('content', 'Storyline');
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

	test('favicon ICO link is present', async ({ page }) => {
		await page.goto('/');
		const favicon = page.locator('link[rel="icon"][sizes="32x32"]');
		await expect(favicon).toBeAttached();
		await expect(favicon).toHaveAttribute('href', /favicon\.ico/);
	});

	test('favicon SVG link is present', async ({ page }) => {
		await page.goto('/');
		const favicon = page.locator('link[rel="icon"][type="image/svg+xml"]');
		await expect(favicon).toBeAttached();
	});

	test('apple-touch-icon link is present', async ({ page }) => {
		await page.goto('/');
		const icon = page.locator('link[rel="apple-touch-icon"]');
		await expect(icon).toBeAttached();
	});

	test('manifest link is present', async ({ page }) => {
		await page.goto('/');
		const manifest = page.locator('link[rel="manifest"]');
		await expect(manifest).toBeAttached();
		await expect(manifest).toHaveAttribute('href', /manifest\.webmanifest/);
	});

	test('format-detection disables telephone linking', async ({ page }) => {
		await page.goto('/');
		const formatDetection = page.locator('meta[name="format-detection"]');
		await expect(formatDetection).toHaveAttribute('content', 'telephone=no');
	});

	test('mobile-web-app-capable is yes', async ({ page }) => {
		await page.goto('/');
		const meta = page.locator('meta[name="mobile-web-app-capable"]');
		await expect(meta).toHaveAttribute('content', 'yes');
	});

	test('apple-mobile-web-app-status-bar-style is default', async ({ page }) => {
		await page.goto('/');
		const meta = page.locator('meta[name="apple-mobile-web-app-status-bar-style"]');
		await expect(meta).toHaveAttribute('content', 'default');
	});

	test('apple-mobile-web-app-title is Storyline', async ({ page }) => {
		await page.goto('/');
		const meta = page.locator('meta[name="apple-mobile-web-app-title"]');
		await expect(meta).toHaveAttribute('content', 'Storyline');
	});
});

/* oxlint-disable no-undef -- page.evaluate callbacks run in browser context where getComputedStyle is a global */
test.describe('mobile CSS hardening', () => {
	test('body has user-select: none', async ({ page }) => {
		await page.goto('/');
		const userSelect = await page.evaluate(() =>
			getComputedStyle(document.body).getPropertyValue('user-select'),
		);
		expect(userSelect).toBe('none');
	});

	test('input elements have user-select: text', async ({ page }) => {
		await page.goto('/');
		const userSelect = await page.evaluate(() => {
			const input = document.createElement('input');
			document.body.append(input);
			const value = getComputedStyle(input).getPropertyValue('user-select');
			input.remove();
			return value;
		});
		expect(userSelect).toBe('text');
	});

	test('html has overscroll-behavior: none', async ({ page }) => {
		await page.goto('/');
		const overscroll = await page.evaluate(() =>
			getComputedStyle(document.documentElement).getPropertyValue('overscroll-behavior'),
		);
		expect(overscroll).toBe('none');
	});

	test('body has touch-action: manipulation', async ({ page }) => {
		await page.goto('/');
		const touchAction = await page.evaluate(() =>
			getComputedStyle(document.body).getPropertyValue('touch-action'),
		);
		expect(touchAction).toBe('manipulation');
	});

	test('tap highlight is transparent', async ({ page }) => {
		await page.goto('/');
		const color = await page.evaluate(() =>
			getComputedStyle(document.body).getPropertyValue('-webkit-tap-highlight-color'),
		);
		expect(color).toMatch(/transparent|rgba\(0,\s*0,\s*0,\s*0\)/);
	});
});
/* oxlint-enable no-undef */

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

	test('title includes error text and Storyline', async ({ page }) => {
		await page.goto('/test-error/404');
		await expect(page).toHaveTitle(/page not found.*Storyline/i);
	});

	test('description is inherited from layout', async ({ page }) => {
		await page.goto('/test-error/404');
		const description = page.locator('meta[name="description"]');
		await expect(description).toHaveAttribute('content', /HD-2D/);
	});

	test('application-name is inherited from layout', async ({ page }) => {
		await page.goto('/test-error/404');
		const appName = page.locator('meta[name="application-name"]');
		await expect(appName).toHaveAttribute('content', 'Storyline');
	});

	test('theme-color light is #ffffff', async ({ page }) => {
		await page.goto('/test-error/404');
		const themeColor = page.locator(
			'meta[name="theme-color"][media="(prefers-color-scheme: light)"]',
		);
		await expect(themeColor).toHaveAttribute('content', '#ffffff');
	});

	test('theme-color dark is #242424', async ({ page }) => {
		await page.goto('/test-error/404');
		const themeColor = page.locator(
			'meta[name="theme-color"][media="(prefers-color-scheme: dark)"]',
		);
		await expect(themeColor).toHaveAttribute('content', '#242424');
	});

	test('og:title is Storyline', async ({ page }) => {
		await page.goto('/test-error/404');
		const ogTitle = page.locator('meta[property="og:title"]');
		await expect(ogTitle).toHaveAttribute('content', 'Storyline');
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

	test('favicon ICO link is present', async ({ page }) => {
		await page.goto('/test-error/404');
		const favicon = page.locator('link[rel="icon"][sizes="32x32"]');
		await expect(favicon).toBeAttached();
		await expect(favicon).toHaveAttribute('href', /favicon\.ico/);
	});

	test('favicon SVG link is present', async ({ page }) => {
		await page.goto('/test-error/404');
		const favicon = page.locator('link[rel="icon"][type="image/svg+xml"]');
		await expect(favicon).toBeAttached();
	});

	test('apple-touch-icon link is present', async ({ page }) => {
		await page.goto('/test-error/404');
		const icon = page.locator('link[rel="apple-touch-icon"]');
		await expect(icon).toBeAttached();
	});

	test('manifest link is present', async ({ page }) => {
		await page.goto('/test-error/404');
		const manifest = page.locator('link[rel="manifest"]');
		await expect(manifest).toBeAttached();
		await expect(manifest).toHaveAttribute('href', /manifest\.webmanifest/);
	});

	test('mobile-web-app-capable is yes', async ({ page }) => {
		await page.goto('/test-error/404');
		const meta = page.locator('meta[name="mobile-web-app-capable"]');
		await expect(meta).toHaveAttribute('content', 'yes');
	});

	test('apple-mobile-web-app-status-bar-style is default', async ({ page }) => {
		await page.goto('/test-error/404');
		const meta = page.locator('meta[name="apple-mobile-web-app-status-bar-style"]');
		await expect(meta).toHaveAttribute('content', 'default');
	});

	test('apple-mobile-web-app-title is Storyline', async ({ page }) => {
		await page.goto('/test-error/404');
		const meta = page.locator('meta[name="apple-mobile-web-app-title"]');
		await expect(meta).toHaveAttribute('content', 'Storyline');
	});
});
