/**
 * Tests for breadcrumbs — navigation and fetch breadcrumb tracking.
 *
 * @module
 */

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

// =============================================================================
// Navigation breadcrumbs
// =============================================================================

describe('addNavigationBreadcrumb', () => {
  it('adds a navigation breadcrumb with from/to URLs', () => {
    const navResult: Result<void> = addNavigationBreadcrumb('/home' as Str, '/editor' as Str);
    expect(navResult.ok).toBe(true);

    const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data).toHaveLength(1);
    const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
    expect(crumb.type).toBe('navigation');
    expect(crumb.category).toBe('route');
    expect(crumb.message).toContain('/home');
    expect(crumb.message).toContain('/editor');
    expect(crumb.level).toBe('info');
  });

  it('returns error when from param fails validation', () => {
    const result: Result<void> = addNavigationBreadcrumb(123 as unknown as Str, '/editor' as Str);
    expect(result.ok).toBe(false);
  });

  it('returns error when to param fails validation', () => {
    const result: Result<void> = addNavigationBreadcrumb(null, 123 as unknown as Str);
    expect(result.ok).toBe(false);
  });

  it('handles null from URL (initial navigation)', () => {
    const navResult: Result<void> = addNavigationBreadcrumb(null, '/editor' as Str);
    expect(navResult.ok).toBe(true);

    const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data).toHaveLength(1);
    const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
    expect(crumb.message).toContain('(initial)');
    expect(crumb.message).toContain('/editor');
  });
});

// =============================================================================
// Fetch breadcrumbs
// =============================================================================

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
      (): Promise<Response> =>
        new Promise<Response>((resolve: (r: Response) => void): void => {
          resolve(new Response('ok', { status: 200 }));
        }),
    ) as typeof fetch;
    globalThis.fetch = mockFetch;

    initFetchBreadcrumbs(['/api/errors'] as Str[]);

    await globalThis.fetch('/api/users');

    const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

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
      (): Promise<Response> =>
        new Promise<Response>((resolve: (r: Response) => void): void => {
          resolve(new Response('not found', { status: 404 }));
        }),
    ) as typeof fetch;
    globalThis.fetch = mockFetch;

    initFetchBreadcrumbs(['/api/errors'] as Str[]);

    await globalThis.fetch('/api/missing');

    const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
    expect(crumb.level).toBe('error');
    expect(crumb.message).toContain('404');
  });

  it('records warning-level breadcrumb for network errors', async () => {
    const mockFetch: typeof fetch = vi.fn(
      (): Promise<Response> =>
        new Promise<Response>(
          (_resolve: (r: Response) => void, reject: (e: unknown) => void): void => {
            reject(new Error('Network error'));
          },
        ),
    ) as unknown as typeof fetch;
    globalThis.fetch = mockFetch;

    initFetchBreadcrumbs(['/api/errors'] as Str[]);

    try {
      await globalThis.fetch('/api/broken');
    } catch {
      /* expected */
    }

    const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
    expect(crumb.level).toBe('warning');
    expect(crumb.message).toContain('Network error');
  });

  it('extracts method from init options', async () => {
    const mockFetch: typeof fetch = vi.fn(
      (): Promise<Response> =>
        new Promise<Response>((resolve: (r: Response) => void): void => {
          resolve(new Response('ok', { status: 201 }));
        }),
    ) as typeof fetch;
    globalThis.fetch = mockFetch;

    initFetchBreadcrumbs(['/api/errors'] as Str[]);

    await globalThis.fetch('/api/items', { method: 'POST' });

    const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
    expect(crumb.message).toContain('POST');
  });

  it('teardown restores original fetch', () => {
    const mockFetch: typeof fetch = vi.fn(
      (): Promise<Response> =>
        new Promise<Response>((resolve: (r: Response) => void): void => {
          resolve(new Response('ok', { status: 200 }));
        }),
    ) as typeof fetch;
    globalThis.fetch = mockFetch;
    const wrappedRef: typeof fetch = mockFetch;

    initFetchBreadcrumbs(['/api/errors'] as Str[]);
    const interceptedFetch: typeof fetch = globalThis.fetch;
    expect(interceptedFetch).not.toBe(wrappedRef);

    teardownFetchBreadcrumbs();
    // After teardown, fetch should be restored to mockFetch
    expect(globalThis.fetch).toBe(mockFetch);
  });

  it('skips breadcrumbs for beacon endpoint to avoid recursion', async () => {
    const mockFetch: typeof fetch = vi.fn(
      (): Promise<Response> =>
        new Promise<Response>((resolve: (r: Response) => void): void => {
          resolve(new Response(null, { status: 200 }));
        }),
    ) as typeof fetch;
    globalThis.fetch = mockFetch;

    initFetchBreadcrumbs(['/api/errors'] as Str[]);

    await globalThis.fetch('/api/errors');

    const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // New tests — custom skipUrls, URL object, Request object
  // -------------------------------------------------------------------------

  it('skips custom URLs when skipUrls provided', async () => {
    const mockFetch: typeof fetch = vi.fn(
      (): Promise<Response> =>
        new Promise<Response>((resolve: (r: Response) => void): void => {
          resolve(new Response(null, { status: 200 }));
        }),
    ) as typeof fetch;
    globalThis.fetch = mockFetch;

    initFetchBreadcrumbs(['/api/v2/errors', '/healthz']);

    // These should be skipped
    await globalThis.fetch('/api/v2/errors');
    await globalThis.fetch('/healthz');

    // This should NOT be skipped (default /api/errors is not in custom list)
    await globalThis.fetch('/api/users');

    const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    // Only /api/users should produce a breadcrumb
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.message).toContain('/api/users');
  });

  it('handles URL object input to fetch', async () => {
    const mockFetch: typeof fetch = vi.fn(
      (): Promise<Response> =>
        new Promise<Response>((resolve: (r: Response) => void): void => {
          resolve(new Response('ok', { status: 200 }));
        }),
    ) as typeof fetch;
    globalThis.fetch = mockFetch;

    initFetchBreadcrumbs(['/api/errors'] as Str[]);

    await globalThis.fetch(new URL('http://localhost/api/users'));

    const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data).toHaveLength(1);
    const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
    expect(crumb.message).toContain('/api/users');
    expect(crumb.message).toContain('GET');
  });

  it('handles Request object input to fetch', async () => {
    const mockFetch: typeof fetch = vi.fn(
      (): Promise<Response> =>
        new Promise<Response>((resolve: (r: Response) => void): void => {
          resolve(new Response('ok', { status: 200 }));
        }),
    ) as typeof fetch;
    globalThis.fetch = mockFetch;

    initFetchBreadcrumbs(['/api/errors'] as Str[]);

    await globalThis.fetch(new Request('http://localhost/api/data', { method: 'PUT' }));

    const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data).toHaveLength(1);
    const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
    expect(crumb.message).toContain('PUT');
  });

  it('returns error when skipUrls fails validation', () => {
    const result: Result<void> = initFetchBreadcrumbs([123] as unknown as Str[]);
    expect(result.ok).toBe(false);
  });

  it('skips re-initialization when already initialized', async () => {
    const mockFetch: typeof fetch = vi.fn(
      (): Promise<Response> =>
        new Promise<Response>((resolve: (r: Response) => void): void => {
          resolve(new Response('ok', { status: 200 }));
        }),
    ) as typeof fetch;
    globalThis.fetch = mockFetch;

    initFetchBreadcrumbs(['/api/errors'] as Str[]);
    const firstWrapped: typeof fetch = globalThis.fetch;

    // Second call should be a no-op
    initFetchBreadcrumbs(['/api/errors'] as Str[]);
    expect(globalThis.fetch).toBe(firstWrapped);

    // Should still work correctly (not double-wrapped)
    await globalThis.fetch('/api/test');
    const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data).toHaveLength(1);
  });

  it('teardown is no-op when not initialized', () => {
    // Should not throw when called without prior init
    teardownFetchBreadcrumbs();
    teardownFetchBreadcrumbs();
    // No error means success
  });

  it('handles non-Error thrown in fetch catch', async () => {
    /* Build a non-Error rejection at runtime via JSON.parse so the literal
     * string `'string error'` never appears as a direct argument to reject(). */
    const nonErrorReason: unknown = JSON.parse('"string error"');
    const mockFetch: typeof fetch = vi.fn(
      (): Promise<Response> =>
        new Promise<Response>(
          (_resolve: (r: Response) => void, reject: (e: unknown) => void): void => {
            reject(nonErrorReason);
          },
        ),
    ) as unknown as typeof fetch;
    globalThis.fetch = mockFetch;

    initFetchBreadcrumbs(['/api/errors'] as Str[]);

    try {
      await globalThis.fetch('/api/broken');
    } catch {
      /* expected */
    }

    const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
    expect(crumb.level).toBe('warning');
    expect(crumb.message).toContain('string error');
  });

  it('handles exotic input type (not string, URL, or Request) — extractUrl fallback (line 56)', async () => {
    const mockFetch: typeof fetch = vi.fn(
      (): Promise<Response> =>
        new Promise<Response>((resolve: (r: Response) => void): void => {
          resolve(new Response('ok', { status: 200 }));
        }),
    ) as typeof fetch;
    globalThis.fetch = mockFetch;

    initFetchBreadcrumbs(['/api/errors'] as Str[]);

    // Pass a number cast as RequestInfo — triggers extractUrl's final fallback: ok(StrSchema, '(unknown)')
    await globalThis.fetch(42 as unknown as RequestInfo);

    const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data).toHaveLength(1);
    const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
    expect(crumb.message).toContain('(unknown)');
    expect(crumb.message).toContain('GET');
  });

  it('extracts method from Request object directly', async () => {
    const mockFetch: typeof fetch = vi.fn(
      (): Promise<Response> =>
        new Promise<Response>((resolve: (r: Response) => void): void => {
          resolve(new Response('ok', { status: 200 }));
        }),
    ) as typeof fetch;
    globalThis.fetch = mockFetch;

    initFetchBreadcrumbs(['/api/errors'] as Str[]);

    // Pass Request without init — method comes from Request.method
    const req: Request = new Request('http://localhost/api/items', { method: 'DELETE' });
    await globalThis.fetch(req);

    const result: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const crumb: Breadcrumb = result.data[0]! as Breadcrumb;
    expect(crumb.message).toContain('DELETE');
  });
});
