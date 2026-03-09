import { test, expect } from '@playwright/test';
import { APP_NAME, APP_TAGLINE } from '../src/lib/config/app-meta';

test.describe('Error pages', () => {
	test.describe('400 Bad Request', () => {
		test('shows bad request title', async ({ page }) => {
			await page.goto('/test-error/400');
			await expect(page.getByText(/bad request/i)).toBeVisible();
			await expect(page.getByRole('link', { name: /go to homepage/i })).toBeVisible();
		});

		test('has friendly description', async ({ page }) => {
			await page.goto('/test-error/400');
			await expect(page.getByText(/something in that request/i)).toBeVisible();
		});

		test('does not show try again button', async ({ page }) => {
			await page.goto('/test-error/400');
			await expect(page.getByRole('button', { name: /try again/i })).not.toBeVisible();
		});

		test('page title includes error text', async ({ page }) => {
			await page.goto('/test-error/400');
			await expect(page).toHaveTitle(new RegExp(`${APP_NAME}.*Bad request.*${APP_TAGLINE}`, 'i'));
		});
	});

	test.describe('403 Forbidden', () => {
		test('shows access denied title', async ({ page }) => {
			await page.goto('/test-error/403');
			await expect(page.getByText(/access denied/i)).toBeVisible();
			await expect(page.getByRole('link', { name: /go to homepage/i })).toBeVisible();
		});

		test('has friendly description', async ({ page }) => {
			await page.goto('/test-error/403');
			await expect(page.getByText(/permission/i)).toBeVisible();
		});

		test('does not show try again button', async ({ page }) => {
			await page.goto('/test-error/403');
			await expect(page.getByRole('button', { name: /try again/i })).not.toBeVisible();
		});

		test('page title includes error text', async ({ page }) => {
			await page.goto('/test-error/403');
			await expect(page).toHaveTitle(new RegExp(`${APP_NAME}.*Access denied.*${APP_TAGLINE}`, 'i'));
		});
	});

	test.describe('404 Not Found', () => {
		test('shows not found title', async ({ page }) => {
			await page.goto('/test-error/404');
			await expect(page.getByText(/page not found/i)).toBeVisible();
			await expect(page.getByRole('link', { name: /go to homepage/i })).toBeVisible();
		});

		test('has friendly description', async ({ page }) => {
			await page.goto('/test-error/404');
			await expect(page.getByText(/we looked everywhere/i)).toBeVisible();
		});

		test('does not show try again button', async ({ page }) => {
			await page.goto('/test-error/404');
			await expect(page.getByRole('button', { name: /try again/i })).not.toBeVisible();
		});

		test('page title includes error text', async ({ page }) => {
			await page.goto('/test-error/404');
			await expect(page).toHaveTitle(
				new RegExp(`${APP_NAME}.*Page not found.*${APP_TAGLINE}`, 'i'),
			);
		});

		test('nonexistent route shows 404 page', async ({ page }) => {
			await page.goto('/this-route-does-not-exist');
			await expect(page.getByText(/page not found/i)).toBeVisible();
		});
	});

	test.describe('500 Server Error', () => {
		test('shows server error title and try again button', async ({ page }) => {
			await page.goto('/test-error/500');
			await expect(page.getByText(/something went wrong/i)).toBeVisible();
			await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
		});

		test('has friendly description', async ({ page }) => {
			await page.goto('/test-error/500');
			await expect(page.getByText(/something broke on our end/i)).toBeVisible();
		});

		test('page title includes error text', async ({ page }) => {
			await page.goto('/test-error/500');
			await expect(page).toHaveTitle(
				new RegExp(`${APP_NAME}.*Something went wrong.*${APP_TAGLINE}`, 'i'),
			);
		});

		test('homepage link navigates home from 500 page', async ({ page }) => {
			await page.goto('/test-error/500');
			await page.getByRole('link', { name: /go to homepage/i }).click();
			await expect(page).toHaveURL('/');
		});

		test('try again button reloads the page', async ({ page }) => {
			await page.goto('/test-error/500');
			await expect(page.getByText(/something went wrong/i)).toBeVisible();

			await Promise.all([
				page.waitForEvent('load'),
				page.getByRole('button', { name: /try again/i }).click(),
			]);

			await expect(page).toHaveURL(/test-error\/500/);
			await expect(page.getByText(/something went wrong/i)).toBeVisible();
		});
	});

	test.describe('Unexpected error (reference ID)', () => {
		test('shows 500 page with reference text', async ({ page }) => {
			await page.goto('/test-error/unexpected');
			await expect(page.getByText(/something went wrong/i)).toBeVisible();
			await expect(page.getByText(/reference/i)).toBeVisible();
		});

		test('x-error-id response header is a valid UUID', async ({ page }) => {
			const response = await page.goto('/test-error/unexpected');
			const errorId: string | null = (await response?.headerValue('x-error-id')) ?? null;
			expect(errorId).toBeTruthy();
			expect(errorId).toMatch(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/);
		});

		test('displayed reference matches x-error-id response header', async ({ page }) => {
			const response = await page.goto('/test-error/unexpected');
			const headerErrorId: string | null = (await response?.headerValue('x-error-id')) ?? null;
			expect(headerErrorId).toBeTruthy();

			const errorIdText = page.getByText(/reference/i);
			await expect(errorIdText).toBeVisible();
			await expect(errorIdText).toContainText(headerErrorId!);
		});
	});

	test.describe('Navigation', () => {
		test('homepage link navigates home from 404', async ({ page }) => {
			await page.goto('/test-error/404');
			await page.getByRole('link', { name: /go to homepage/i }).click();
			await expect(page).toHaveURL('/');
		});

		test('title reverts to app name after navigating home from 404', async ({ page }) => {
			await page.goto('/test-error/404');
			await expect(page).toHaveTitle(/Page not found/i);
			await page.getByRole('link', { name: /go to homepage/i }).click();
			await expect(page).toHaveURL('/');
			await expect(page).toHaveTitle(`${APP_NAME} - Home - ${APP_TAGLINE}`);
		});

		test('title reverts to app name after navigating home from 500', async ({ page }) => {
			await page.goto('/test-error/500');
			await expect(page).toHaveTitle(/Something went wrong/i);
			await page.getByRole('link', { name: /go to homepage/i }).click();
			await expect(page).toHaveURL('/');
			await expect(page).toHaveTitle(`${APP_NAME} - Home - ${APP_TAGLINE}`);
		});

		test('og:title reverts after navigating home from error page', async ({ page }) => {
			await page.goto('/test-error/404');
			await page.getByRole('link', { name: /go to homepage/i }).click();
			await expect(page).toHaveURL('/');
			const ogTitle = page.locator('meta[property="og:title"]');
			await expect(ogTitle).toHaveAttribute('content', APP_NAME);
		});

		test('description meta persists after navigating home from error page', async ({ page }) => {
			await page.goto('/test-error/404');
			await page.getByRole('link', { name: /go to homepage/i }).click();
			await expect(page).toHaveURL('/');
			const description = page.locator('meta[name="description"]');
			await expect(description).toHaveAttribute('content', new RegExp(APP_TAGLINE));
		});
	});

	test.describe('Accessibility', () => {
		test('error page breadcrumb shows "Error" instead of scene name', async ({ page }) => {
			await page.goto('/test-error/404');
			await expect(page.getByText('Error', { exact: true })).toBeVisible();
		});

		test('error page has alert role', async ({ page }) => {
			await page.goto('/test-error/404');
			await expect(page.locator('[role="alert"]')).toBeVisible();
		});

		test('error page has h1 heading', async ({ page }) => {
			await page.goto('/test-error/404');
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		});

		test('error page renders an icon', async ({ page }) => {
			await page.goto('/test-error/404');
			const alertContainer = page.locator('[role="alert"]');
			const icon = alertContainer.locator('svg').first();
			await expect(icon).toBeVisible();
		});
	});

	test.describe('Click-to-copy error ID (Svelte)', () => {
		test('clicking error ID copies to clipboard', async ({ page, context }) => {
			await context.grantPermissions(['clipboard-read', 'clipboard-write']);
			await page.goto('/test-error/unexpected');
			const btn = page.locator('[data-error-id]');
			await expect(btn).toBeVisible();
			await btn.click();
			const clipboardText: string = await page.evaluate(() => navigator.clipboard.readText());
			const errorId: string | null = await btn.getAttribute('data-error-id');
			expect(clipboardText).toBe(errorId);
		});

		test('shows "Copied!" feedback after clicking reference', async ({ page, context }) => {
			await context.grantPermissions(['clipboard-read', 'clipboard-write']);
			await page.goto('/test-error/unexpected');
			const btn = page.locator('[data-error-id]');
			await expect(btn).toBeVisible();
			await expect(btn).toContainText(/reference/i);
			await btn.click();
			await expect(btn).toContainText(/copied/i);
		});

		test('"Copied!" reverts to reference after timeout', async ({ page, context }) => {
			await context.grantPermissions(['clipboard-read', 'clipboard-write']);
			await page.goto('/test-error/unexpected');
			const btn = page.locator('[data-error-id]');
			await btn.click();
			await expect(btn).toContainText(/copied/i);
			// Wait for the 2s revert timeout
			await expect(btn).toContainText(/reference/i, { timeout: 5000 });
		});

		test('tooltip shows on hover', async ({ page }) => {
			await page.goto('/test-error/unexpected');
			const btn = page.locator('[data-error-id]');
			await expect(btn).toBeVisible();
			await btn.hover();
			const tooltip = page.locator('[data-slot="tooltip-content"]');
			await expect(tooltip).toBeVisible({ timeout: 5000 });
			await expect(tooltip).toContainText(/click to copy/i);
		});

		test('tooltip shows "Copied!" after clicking', async ({ page, context }) => {
			await context.grantPermissions(['clipboard-read', 'clipboard-write']);
			await page.goto('/test-error/unexpected');
			const btn = page.locator('[data-error-id]');
			await expect(btn).toBeVisible();
			// Hover first to trigger tooltip, then click
			await btn.hover();
			const tooltip = page.locator('[data-slot="tooltip-content"]');
			await expect(tooltip).toBeVisible({ timeout: 5000 });
			await btn.click();
			await expect(tooltip).toContainText(/copied/i, { timeout: 3000 });
		});
	});

	test.describe('Click-to-copy error ID (error.html)', () => {
		test('error ID button has data-error-id attribute', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			const btn = page.locator('.error-id-btn');
			await expect(btn).toBeVisible();
			const errorId: string | null = await btn.getAttribute('data-error-id');
			expect(errorId).toBeTruthy();
			expect(errorId).toMatch(/^[\da-f-]+$/);
		});

		test('clicking error ID copies to clipboard', async ({ page, context }) => {
			await context.grantPermissions(['clipboard-read', 'clipboard-write']);
			await page.goto('/test-error/catastrophic');
			const btn = page.locator('.error-id-btn');
			await expect(btn).toBeVisible();
			await btn.click();
			const clipboardText: string = await page.evaluate(() => navigator.clipboard.readText());
			const errorId: string | null = await btn.getAttribute('data-error-id');
			expect(clipboardText).toBe(errorId);
		});

		test('shows "Copied!" feedback after clicking', async ({ page, context }) => {
			await context.grantPermissions(['clipboard-read', 'clipboard-write']);
			await page.goto('/test-error/catastrophic');
			const btn = page.locator('.error-id-btn');
			await expect(btn).toBeVisible();
			await expect(btn).toContainText(/reference/i);
			await btn.click();
			await expect(btn).toContainText(/copied/i);
		});

		test('"Copied!" reverts to reference after timeout', async ({ page, context }) => {
			await context.grantPermissions(['clipboard-read', 'clipboard-write']);
			await page.goto('/test-error/catastrophic');
			const btn = page.locator('.error-id-btn');
			await btn.click();
			await expect(btn).toContainText(/copied/i);
			// Wait for the 2s revert timeout
			await expect(btn).toContainText(/reference/i, { timeout: 5000 });
		});

		test('check icon shows during copied state', async ({ page, context }) => {
			await context.grantPermissions(['clipboard-read', 'clipboard-write']);
			await page.goto('/test-error/catastrophic');
			const btn = page.locator('.error-id-btn');
			const copyIcon = page.locator('#copy-icon');
			const checkIcon = page.locator('#check-icon');
			await expect(copyIcon).toBeVisible();
			await expect(checkIcon).not.toBeVisible();
			await btn.click();
			await expect(checkIcon).toBeVisible();
			await expect(copyIcon).not.toBeVisible();
		});
	});

	test.describe('Catastrophic fallback (error.html)', () => {
		test('shows friendly heading instead of raw status code', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			await expect(page.locator('h1')).toContainText(/something went wrong/i);
		});

		test('shows reference button', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			const btn = page.locator('.error-id-btn');
			await expect(btn).toBeVisible();
			await expect(btn).toContainText(/reference/i);
		});

		test('has alert role for accessibility', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			await expect(page.locator('[role="alert"]')).toBeVisible();
		});

		test('has h1 heading', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			await expect(page.locator('h1')).toBeVisible();
		});

		test('has SVG icon', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			const icon = page.locator('[role="alert"] svg').first();
			await expect(icon).toBeVisible();
		});

		test('has go to homepage link', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			const link = page.locator('a[href="/"]');
			await expect(link).toBeVisible();
			await expect(link).toContainText(/go to homepage/i);
		});

		test('homepage link navigates home', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			await page.locator('a[href="/"]').click();
			await expect(page).toHaveURL('/');
		});

		test(`page title includes friendly text and ${APP_NAME}`, async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			await expect(page).toHaveTitle(new RegExp(`something went wrong.*${APP_NAME}`, 'i'));
		});

		test('has required meta tags', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			// oxlint-disable-next-line text-encoding-identifier-case -- HTML charset attribute uses "utf-8" per spec
			await expect(page.locator('meta[charset]')).toHaveAttribute('charset', 'utf-8');
			await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
				'content',
				/width=device-width/,
			);
			await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute(
				'content',
				'light dark',
			);
			await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
			await expect(page.locator('meta[name="format-detection"]')).toHaveAttribute(
				'content',
				'telephone=no',
			);
		});

		test('has favicon links', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toBeAttached();
			await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toBeAttached();
			await expect(page.locator('link[rel="apple-touch-icon"]')).toBeAttached();
			await expect(page.locator('link[rel="manifest"]')).toBeAttached();
		});
	});

	test.describe('Build-time template replacements (error.html)', () => {
		test('no raw {{placeholders}} remain in rendered page', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			const html: string = await page.content();
			// Match actual template placeholders (e.g. {{APP_NAME}}, {{errors.serverError}})
			// but not random '}}' in injected scripts (console-ninja, etc.)
			const placeholders: RegExpMatchArray | null = html.match(/\{\{[A-Za-z_.]+\}\}/g);
			expect(placeholders).toBeNull();
		});

		test(`APP_NAME is resolved to ${APP_NAME} in title`, async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			await expect(page).toHaveTitle(new RegExp(APP_NAME));
		});

		test('heading text comes from errors.serverError locale', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			await expect(page.locator('h1')).toHaveText('Something went wrong');
		});

		test('description text comes from errors.serverErrorDescription locale', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			const desc = page.locator('.description');
			await expect(desc).toBeVisible();
			await expect(desc).toContainText(/looking into it/i);
		});

		test('homepage link text comes from errors.goHome locale', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			await expect(page.locator('a[href="/"]')).toHaveText(/Go to homepage/);
		});

		test('error ID prefix comes from errors.errorId locale', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			const btn = page.locator('.error-id-btn');
			await expect(btn).toBeVisible();
			await expect(page.locator('#error-id-text')).toContainText(/^Reference: /);
		});

		test('copied text comes from errors.copied locale', async ({ page, context }) => {
			await context.grantPermissions(['clipboard-read', 'clipboard-write']);
			await page.goto('/test-error/catastrophic');
			const btn = page.locator('.error-id-btn');
			await expect(btn).toBeVisible();
			await btn.click();
			await expect(btn).toContainText('Copied!');
		});

		test('FONT_FAMILIES is resolved in body style', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			const fontFamily: string = await page.evaluate(
				() => window.getComputedStyle(document.body).fontFamily,
			);
			expect(fontFamily).toContain('Inter');
		});

		test('@font-face CSS is inlined from FONT_FACES config', async ({ page }) => {
			await page.goto('/test-error/catastrophic');
			const styleContent: string = (await page.locator('style').textContent()) ?? '';
			expect(styleContent).toContain('@font-face');
			expect(styleContent).toContain('/fonts/inter-latin.woff2');
			expect(styleContent).toContain('/fonts/rajdhani-latin-600.woff2');
			expect(styleContent).toContain('/fonts/rajdhani-latin-700.woff2');
		});
	});

	test.describe('ErrorId consistency', () => {
		test('Svelte: x-error-id header matches data-error-id on page', async ({ page }) => {
			const response = await page.goto('/test-error/unexpected');
			const headerErrorId: string | null = (await response?.headerValue('x-error-id')) ?? null;
			expect(headerErrorId).toBeTruthy();
			const btn = page.locator('[data-error-id]');
			await expect(btn).toBeVisible();
			const dataErrorId: string | null = await btn.getAttribute('data-error-id');
			expect(dataErrorId).toBe(headerErrorId);
		});

		test('Svelte: displayed text contains the errorId from header', async ({ page }) => {
			const response = await page.goto('/test-error/unexpected');
			const headerErrorId: string | null = (await response?.headerValue('x-error-id')) ?? null;
			expect(headerErrorId).toBeTruthy();
			const btn = page.locator('[data-error-id]');
			await expect(btn).toContainText(headerErrorId!);
		});

		test('error.html: data-error-id on page matches displayed text', async ({ page }) => {
			// Note: catastrophic errors (handle hook failures) don't have x-error-id response headers
			// because SvelteKit serves error.html before handleError can set headers.
			// Instead, verify the error ID extracted from the message is consistent between
			// the data attribute and the displayed text.
			await page.goto('/test-error/catastrophic');
			const btn = page.locator('[data-error-id]');
			await expect(btn).toBeVisible();
			const dataErrorId: string | null = await btn.getAttribute('data-error-id');
			expect(dataErrorId).toBeTruthy();
			await expect(btn).toContainText(dataErrorId!);
		});
	});
});
