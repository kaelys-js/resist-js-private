/**
 * Unit tests for the IsMobile reactive breakpoint detector.
 *
 * Tests constructor behavior and MediaQuery integration.
 * jsdom lacks `window.matchMedia`, so we mock it before each test.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Num } from '@/schemas/common';

import { IsMobile } from './is-mobile.svelte';

/** Mock matchMedia — jsdom does not implement it. */
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('IsMobile', () => {
  it('constructs with default breakpoint (768)', () => {
    const mobile = new IsMobile();
    expect(mobile).toBeInstanceOf(IsMobile);
    // Should query max-width: 767px (768 - 1)
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
  });

  it('constructs with custom breakpoint', () => {
    const breakpoint: Num = 1024;
    const tablet = new IsMobile(breakpoint);
    expect(tablet).toBeInstanceOf(IsMobile);
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 1023px)');
  });

  it('current returns a boolean value', () => {
    const mobile = new IsMobile();
    expect(typeof mobile.current).toBe('boolean');
  });

  it('defaults to false when matchMedia returns no match', () => {
    const mobile = new IsMobile();
    expect(mobile.current).toBe(false);
  });
});
