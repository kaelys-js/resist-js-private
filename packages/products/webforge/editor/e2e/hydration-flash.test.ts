import { test, expect } from '@playwright/test';
import { storageKey } from '../src/lib/config/app-meta';

// =============================================================================
// Hydration flash prevention — sidebar width cookie
// =============================================================================

test.describe('hydration flash — sidebar width', () => {
	test('sidebar-px cookie injects data-sidebar-width attribute on first paint', async ({
		page,
		context,
	}) => {
		// Set the preference cookie before navigating
		await context.addCookies([
			{
				name: storageKey('sidebar-px'),
				value: '350',
				domain: '127.0.0.1',
				path: '/',
			},
		]);

		await page.goto('/');

		// The data-sidebar-width attribute should be set on <html> from SSR
		const html = page.locator('html');
		await expect(html).toHaveAttribute('data-sidebar-width', '350');
	});

	test('no sidebar cookie uses empty data-sidebar-width (default)', async ({ page }) => {
		await page.goto('/');

		// Without cookie, SSR should produce empty attribute (default width)
		const html = page.locator('html');
		await expect(html).toHaveAttribute('data-sidebar-width', '');
	});

	test('invalid sidebar cookie value falls back to empty attribute', async ({ page, context }) => {
		// Set an invalid cookie value (non-numeric / XSS attempt)
		await context.addCookies([
			{
				name: storageKey('sidebar-px'),
				value: '"><script>alert(1)</script>',
				domain: '127.0.0.1',
				path: '/',
			},
		]);

		await page.goto('/');

		// Invalid value should be sanitized — falls back to empty
		const html = page.locator('html');
		await expect(html).toHaveAttribute('data-sidebar-width', '');
	});

	test('out-of-range sidebar cookie value falls back to empty attribute', async ({
		page,
		context,
	}) => {
		// 50 is below minimum (100)
		await context.addCookies([
			{
				name: storageKey('sidebar-px'),
				value: '50',
				domain: '127.0.0.1',
				path: '/',
			},
		]);

		await page.goto('/');

		const html = page.locator('html');
		await expect(html).toHaveAttribute('data-sidebar-width', '');
	});
});

// =============================================================================
// Hydration flash prevention — theme cookie
// =============================================================================

test.describe('hydration flash — theme', () => {
	test('theme cookie injects data-theme attribute in SSR response', async ({
		request,
		context,
	}) => {
		// Set the preference cookie before the request
		await context.addCookies([
			{
				name: storageKey('theme'),
				value: 'midnight',
				domain: '127.0.0.1',
				path: '/',
			},
		]);

		// Fetch raw SSR HTML — this verifies the server injects the attribute.
		// We check the SSR response (not the DOM after hydration) because
		// ModeWatcher syncs the theme from localStorage on mount, which may
		// reset data-theme when localStorage doesn't match the cookie.
		// The cookie-based injection is what prevents the visual flash on first paint.
		const response = await request.get('/', {
			headers: {
				cookie: `${storageKey('theme')}=midnight`,
			},
		});
		const body = await response.text();
		const htmlTagMatch = body.match(/<html[^>]*>/);
		expect(htmlTagMatch).not.toBeNull();
		expect(htmlTagMatch?.[0]).toContain('data-theme="midnight"');
	});

	test('no theme cookie uses empty data-theme (default)', async ({ request }) => {
		const response = await request.get('/');
		const body = await response.text();
		const htmlTagMatch = body.match(/<html[^>]*>/);
		expect(htmlTagMatch).not.toBeNull();
		expect(htmlTagMatch?.[0]).toContain('data-theme=""');
	});

	test('invalid theme cookie value falls back to empty attribute', async ({ request }) => {
		// 'neon' is not a supported theme
		const response = await request.get('/', {
			headers: {
				cookie: `${storageKey('theme')}=neon`,
			},
		});
		const body = await response.text();
		const htmlTagMatch = body.match(/<html[^>]*>/);
		expect(htmlTagMatch).not.toBeNull();
		expect(htmlTagMatch?.[0]).toContain('data-theme=""');
	});

	test('XSS theme cookie value is sanitized', async ({ request }) => {
		const response = await request.get('/', {
			headers: {
				cookie: `${storageKey('theme')}="><img src=x onerror=alert(1)>`,
			},
		});
		const body = await response.text();
		const htmlTagMatch = body.match(/<html[^>]*>/);
		expect(htmlTagMatch).not.toBeNull();
		// XSS attempt should be rejected — falls back to empty
		expect(htmlTagMatch?.[0]).toContain('data-theme=""');
	});
});
