/**
 * Unit tests for the shared screen reader announcement system.
 *
 * Tests the `announce` function and `getAnnouncement` getter that power
 * `aria-live="polite"` regions across all products.
 */
import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import type { Str, Void } from '@/schemas/common';

import { announce, getAnnouncement } from './announce.svelte';

describe('getAnnouncement', () => {
  it('returns empty string initially', () => {
    const msg: Str = getAnnouncement();
    expect(msg).toBe('' as Str);
  });
});

describe('announce', () => {
  it('sets the announcement message after rAF', () => {
    vi.useFakeTimers();

    const result: Void = announce('Copied!' as Str);
    expect(result).toBeUndefined();

    // Before rAF fires, message should be cleared
    flushSync();
    expect(getAnnouncement()).toBe('' as Str);

    // Fire the rAF callback
    vi.advanceTimersByTime(16);
    flushSync();
    expect(getAnnouncement()).toBe('Copied!' as Str);

    vi.useRealTimers();
  });

  it('clears message before setting new one (forces DOM mutation)', () => {
    vi.useFakeTimers();

    // Set initial state
    announce('First' as Str);
    vi.advanceTimersByTime(16);
    flushSync();
    expect(getAnnouncement()).toBe('First' as Str);

    // Announce same text again — must clear first
    announce('First' as Str);
    flushSync();
    // Immediately after announce(), message is cleared to ''
    expect(getAnnouncement()).toBe('' as Str);

    // After rAF, message is set again
    vi.advanceTimersByTime(16);
    flushSync();
    expect(getAnnouncement()).toBe('First' as Str);

    vi.useRealTimers();
  });

  it('overwrites previous announcement on rapid successive calls', () => {
    vi.useFakeTimers();

    announce('First' as Str);
    announce('Second' as Str);

    // Both scheduled rAFs — only last one matters
    vi.advanceTimersByTime(16);
    flushSync();
    expect(getAnnouncement()).toBe('Second' as Str);

    vi.useRealTimers();
  });

  it('accepts empty string to clear announcement', () => {
    vi.useFakeTimers();

    announce('Active' as Str);
    vi.advanceTimersByTime(16);
    flushSync();
    expect(getAnnouncement()).toBe('Active' as Str);

    announce('' as Str);
    vi.advanceTimersByTime(16);
    flushSync();
    expect(getAnnouncement()).toBe('' as Str);

    vi.useRealTimers();
  });
});
