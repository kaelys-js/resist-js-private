// oxlint-disable require-await -- async mocks return Response directly (no await needed)
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Str } from '@/schemas/common';
import type { Breadcrumb } from '@/schemas/result/captured-error';
import type { Result } from '@/schemas/result/result';
import { clearBreadcrumbs, getBreadcrumbs } from '@/utils/result/breadcrumbs';
import {
	addNavigationBreadcrumb,
	initFetchBreadcrumbs,
	teardownFetchBreadcrumbs,
} from './breadcrumbs';

beforeEach(() => {
	clearBreadcrumbs();
});

afterEach(() => {
	teardownFetchBreadcrumbs();
	clearBreadcrumbs();
});

// ---------------------------------------------------------------------------
// Navigation breadcrumbs
// ---------------------------------------------------------------------------

describe('addNavigationBreadcrumb', () => {
	it('adds a navigation breadcrumb with from/to URLs', () => {
		addNavigationBreadcrumb('/home' as Str, '/editor' as Str);

		const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.data).toHaveLength(1);
		const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
		expect(crumb.type).toBe('navigation');
		expect(crumb.category).toBe('route');
		expect(crumb.message).toContain('/home');
		expect(crumb.message).toContain('/editor');
		expect(crumb.level).toBe('info');
	});

	it('handles null from URL (initial navigation)', () => {
		addNavigationBreadcrumb(null, '/editor' as Str);

		const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.data).toHaveLength(1);
		const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
		expect(crumb.message).toContain('(initial)');
		expect(crumb.message).toContain('/editor');
	});
});

// ---------------------------------------------------------------------------
// Fetch breadcrumbs
// ---------------------------------------------------------------------------

describe('initFetchBreadcrumbs', () => {
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
	});

	afterEach(() => {
		teardownFetchBreadcrumbs();
		globalThis.fetch = originalFetch;
	});

	it('wraps global fetch and adds breadcrumbs for requests', async () => {
		const mockFetch: typeof fetch = vi.fn(
			async () => new Response('ok', { status: 200 }),
		) as typeof fetch;
		globalThis.fetch = mockFetch;

		initFetchBreadcrumbs();

		await globalThis.fetch('/api/users');

		const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.data).toHaveLength(1);
		const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
		expect(crumb.type).toBe('http');
		expect(crumb.category).toBe('fetch');
		expect(crumb.message).toContain('GET');
		expect(crumb.message).toContain('/api/users');
		expect(crumb.message).toContain('200');
		expect(crumb.level).toBe('info');
	});

	it('records error-level breadcrumb for failed responses', async () => {
		const mockFetch: typeof fetch = vi.fn(
			async () => new Response('not found', { status: 404 }),
		) as typeof fetch;
		globalThis.fetch = mockFetch;

		initFetchBreadcrumbs();

		await globalThis.fetch('/api/missing');

		const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
		expect(crumb.level).toBe('error');
		expect(crumb.message).toContain('404');
	});

	it('records warning-level breadcrumb for network errors', async () => {
		const mockFetch: typeof fetch = vi.fn(async () => {
			throw new Error('Network error');
		}) as unknown as typeof fetch;
		globalThis.fetch = mockFetch;

		initFetchBreadcrumbs();

		try {
			await globalThis.fetch('/api/broken');
		} catch {
			/* expected */
		}

		const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
		expect(crumb.level).toBe('warning');
		expect(crumb.message).toContain('Network error');
	});

	it('extracts method from Request objects', async () => {
		const mockFetch: typeof fetch = vi.fn(
			async () => new Response('ok', { status: 201 }),
		) as typeof fetch;
		globalThis.fetch = mockFetch;

		initFetchBreadcrumbs();

		await globalThis.fetch('/api/items', { method: 'POST' });

		const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
		expect(crumb.message).toContain('POST');
	});

	it('teardown restores original fetch', () => {
		const mockFetch: typeof fetch = vi.fn(
			async () => new Response('ok', { status: 200 }),
		) as typeof fetch;
		globalThis.fetch = mockFetch;
		const wrappedRef: typeof fetch = mockFetch;

		initFetchBreadcrumbs();
		const interceptedFetch: typeof fetch = globalThis.fetch;
		expect(interceptedFetch).not.toBe(wrappedRef);

		teardownFetchBreadcrumbs();
		// After teardown, fetch should be restored to mockFetch
		expect(globalThis.fetch).toBe(mockFetch);
	});

	it('skips breadcrumbs for beacon endpoint to avoid recursion', async () => {
		const mockFetch: typeof fetch = vi.fn(
			async () => new Response(null, { status: 200 }),
		) as typeof fetch;
		globalThis.fetch = mockFetch;

		initFetchBreadcrumbs();

		await globalThis.fetch('/api/errors');

		const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.data).toHaveLength(0);
	});
});
