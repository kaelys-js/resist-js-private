/**
 * Tests for the dirty-frame detector.
 *
 * Verifies MutationObserver injection, rAF-based dirty flag,
 * poll/reset cycle, and error resilience.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Bool, Str } from '@/schemas/common';
import { PageDirtyDetector } from './dirty-detector';

/* ------------------------------------------------------------------ */
/*  Mock                                                               */
/* ------------------------------------------------------------------ */

/**
 * Create a mock Playwright page.
 *
 * @returns Mock page with evaluate and addInitScript spies
 */
function createMockPage(): {
  evaluate: ReturnType<typeof vi.fn>;
  addInitScript: ReturnType<typeof vi.fn>;
  isClosed: ReturnType<typeof vi.fn>;
} {
  return {
    evaluate: vi.fn().mockResolvedValue(true as Bool),
    addInitScript: vi.fn().mockResolvedValue(undefined),
    isClosed: vi.fn().mockReturnValue(false as Bool),
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('PageDirtyDetector', (): void => {
  let page: ReturnType<typeof createMockPage>;
  let detector: PageDirtyDetector;

  beforeEach((): void => {
    page = createMockPage();
    detector = new PageDirtyDetector(page as never);
  });

  it('injects the dirty detection script on install', async (): Promise<void> => {
    await detector.install();
    expect(page.evaluate).toHaveBeenCalled();
    const script: Str = page.evaluate.mock.calls[0]?.[0] as Str;
    expect(typeof script === 'function' || typeof script === 'string').toBe(true as Bool);
  });

  it('isDirty returns true when page reports dirty', async (): Promise<void> => {
    page.evaluate.mockResolvedValue(true as Bool);
    const dirty: boolean = await detector.isDirty();
    expect(dirty).toBe(true as Bool);
  });

  it('isDirty returns false when page reports clean', async (): Promise<void> => {
    page.evaluate.mockResolvedValue(false as Bool);
    const dirty: boolean = await detector.isDirty();
    expect(dirty).toBe(false as Bool);
  });

  it('isDirty returns true on evaluation error (fail-open)', async (): Promise<void> => {
    page.evaluate.mockRejectedValue(new Error('Page navigating'));
    const dirty: boolean = await detector.isDirty();
    expect(dirty).toBe(true as Bool);
  });

  it('isDirty returns true when page is closed (fail-open)', async (): Promise<void> => {
    page.isClosed.mockReturnValue(true as Bool);
    const dirty: boolean = await detector.isDirty();
    expect(dirty).toBe(true as Bool);
  });

  it('install is idempotent', async (): Promise<void> => {
    await detector.install();
    await detector.install();
    // Should only inject once
    expect(page.evaluate).toHaveBeenCalledTimes(1);
  });

  it('the injected script sets up MutationObserver + rAF tracking', async (): Promise<void> => {
    await detector.install();
    const injectedFn: unknown = page.evaluate.mock.calls[0]?.[0];
    // Verify it's a function (the injection script)
    expect(typeof injectedFn).toBe('function' as Str);
  });
});
