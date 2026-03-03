import { test, expect } from '@playwright/test';

/**
 * Verifies security response headers are present on both normal and error pages.
 */

test.describe('security headers — normal page (/)', () => {
	test('X-Frame-Options is DENY', async ({ page }) => {
		const response = await page.goto('/');
		expect(response?.headers()['x-frame-options']).toBe('DENY');
	});

	test('X-Content-Type-Options is nosniff', async ({ page }) => {
		const response = await page.goto('/');
		expect(response?.headers()['x-content-type-options']).toBe('nosniff');
	});

	test('Referrer-Policy is strict-origin-when-cross-origin', async ({ page }) => {
		const response = await page.goto('/');
		expect(response?.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
	});

	test('Permissions-Policy is present', async ({ page }) => {
		const response = await page.goto('/');
		const policy = response?.headers()['permissions-policy'];
		expect(policy).toBeTruthy();
		expect(policy).toContain('camera=()');
	});

	test('Cross-Origin-Opener-Policy is same-origin', async ({ page }) => {
		const response = await page.goto('/');
		expect(response?.headers()['cross-origin-opener-policy']).toBe('same-origin');
	});
});

test.describe('security headers — error page (/test-error/404)', () => {
	test('X-Frame-Options is DENY', async ({ page }) => {
		const response = await page.goto('/test-error/404');
		expect(response?.headers()['x-frame-options']).toBe('DENY');
	});

	test('X-Content-Type-Options is nosniff', async ({ page }) => {
		const response = await page.goto('/test-error/404');
		expect(response?.headers()['x-content-type-options']).toBe('nosniff');
	});

	test('Referrer-Policy is strict-origin-when-cross-origin', async ({ page }) => {
		const response = await page.goto('/test-error/404');
		expect(response?.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
	});

	test('Permissions-Policy is present', async ({ page }) => {
		const response = await page.goto('/test-error/404');
		const policy = response?.headers()['permissions-policy'];
		expect(policy).toBeTruthy();
		expect(policy).toContain('camera=()');
	});

	test('Cross-Origin-Opener-Policy is same-origin', async ({ page }) => {
		const response = await page.goto('/test-error/404');
		expect(response?.headers()['cross-origin-opener-policy']).toBe('same-origin');
	});
});
