import { test, expect } from '@playwright/test';
import { APP_NAME, APP_SHORT_NAME } from '../src/lib/config/app-meta';

/**
 * Web manifest integration tests.
 * Verifies the manifest.webmanifest route returns valid JSON with all
 * required PWA fields and that icon paths resolve to real files.
 */

test.describe('manifest.webmanifest', () => {
	test('returns 200', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		expect(response.status()).toBe(200);
	});

	test('has JSON content type', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const contentType = response.headers()['content-type'] ?? '';
		expect(contentType).toMatch(/application\/(manifest\+)?json/);
	});

	test('is valid JSON', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const text = await response.text();
		expect(() => JSON.parse(text)).not.toThrow();
	});

	test(`name is ${APP_NAME}`, async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		expect(manifest.name).toBe(APP_NAME);
	});

	test(`short_name is ${APP_SHORT_NAME}`, async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		expect(manifest.short_name).toBe(APP_SHORT_NAME);
	});

	test('description is non-empty', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		expect(manifest.description.length).toBeGreaterThan(0);
	});

	test('start_url is /', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		expect(manifest.start_url).toBe('/');
	});

	test('id is /', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		expect(manifest.id).toBe('/');
	});

	test('scope is /', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		expect(manifest.scope).toBe('/');
	});

	test('display is standalone', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		expect(manifest.display).toBe('standalone');
	});

	test('background_color is valid hex', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/);
	});

	test('theme_color is valid hex', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/);
	});

	test('categories is non-empty array', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		expect(Array.isArray(manifest.categories)).toBe(true);
		expect(manifest.categories.length).toBeGreaterThan(0);
	});

	test('display_override starts with window-controls-overlay', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		expect(Array.isArray(manifest.display_override)).toBe(true);
		expect(manifest.display_override.length).toBeGreaterThanOrEqual(2);
		expect(manifest.display_override[0]).toBe('window-controls-overlay');
		expect(manifest.display_override[1]).toBe('standalone');
	});

	test('has 2 screenshot entries', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		expect(manifest.screenshots).toHaveLength(2);
	});

	test('has wide screenshot with form_factor', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		const wide = manifest.screenshots.find(
			(s: { form_factor: string }) => s.form_factor === 'wide',
		);
		expect(wide).toBeTruthy();
		expect(wide.type).toBe('image/png');
		expect(wide.sizes).toMatch(/^\d+x\d+$/);
		expect(wide.label).toBeTruthy();
	});

	test('has narrow screenshot with form_factor', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		const narrow = manifest.screenshots.find(
			(s: { form_factor: string }) => s.form_factor === 'narrow',
		);
		expect(narrow).toBeTruthy();
		expect(narrow.type).toBe('image/png');
		expect(narrow.sizes).toMatch(/^\d+x\d+$/);
		expect(narrow.label).toBeTruthy();
	});

	test('all screenshot src paths resolve to 200', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		for (const screenshot of manifest.screenshots) {
			const screenshotResponse = await request.get(screenshot.src);
			expect(screenshotResponse.status(), `${screenshot.src} should return 200`).toBe(200);
		}
	});

	test('has 4 icon entries', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		expect(manifest.icons).toHaveLength(4);
	});

	test('has 192x192 icon', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		const icon = manifest.icons.find(
			(i: { sizes: string; purpose?: string }) => i.sizes === '192x192' && !i.purpose,
		);
		expect(icon).toBeTruthy();
		expect(icon.type).toBe('image/png');
	});

	test('has 512x512 icon', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		const icon = manifest.icons.find(
			(i: { sizes: string; purpose?: string }) => i.sizes === '512x512' && !i.purpose,
		);
		expect(icon).toBeTruthy();
		expect(icon.type).toBe('image/png');
	});

	test('has 192x192 maskable icon', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		const icon = manifest.icons.find(
			(i: { sizes: string; purpose?: string }) => i.sizes === '192x192' && i.purpose === 'maskable',
		);
		expect(icon).toBeTruthy();
		expect(icon.type).toBe('image/png');
	});

	test('has 512x512 maskable icon', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		const icon = manifest.icons.find(
			(i: { sizes: string; purpose?: string }) => i.sizes === '512x512' && i.purpose === 'maskable',
		);
		expect(icon).toBeTruthy();
		expect(icon.type).toBe('image/png');
	});

	test('all icon src paths resolve to 200', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		for (const icon of manifest.icons) {
			const iconResponse = await request.get(icon.src);
			expect(iconResponse.status(), `${icon.src} should return 200`).toBe(200);
		}
	});
});
