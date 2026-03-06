import { test, expect } from '@playwright/test';

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

	test('name is Storylyne', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		expect(manifest.name).toBe('Storylyne');
	});

	test('short_name is Storylyne', async ({ request }) => {
		const response = await request.get('/manifest.webmanifest');
		const manifest = await response.json();
		expect(manifest.short_name).toBe('Storylyne');
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
