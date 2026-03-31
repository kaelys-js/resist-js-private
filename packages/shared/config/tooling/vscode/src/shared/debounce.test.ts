/**
 * Tests for DocumentDebouncer
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-55.md TASK 10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DocumentDebouncer } from './debounce';

describe('DocumentDebouncer', () => {
  let debouncer: DocumentDebouncer;

  beforeEach(() => {
    vi.useFakeTimers();
    debouncer = new DocumentDebouncer();
  });

  afterEach(() => {
    debouncer.dispose();
    vi.useRealTimers();
  });

  it('executes fn after the specified delay', () => {
    const fn = vi.fn();
    debouncer.schedule('file:///a.ts', fn, 500);

    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(499);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('replaces previous timer for the same URI', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    debouncer.schedule('file:///a.ts', fn1, 500);
    vi.advanceTimersByTime(300);
    debouncer.schedule('file:///a.ts', fn2, 500);
    vi.advanceTimersByTime(500);

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it('handles different URIs independently', () => {
    const fnA = vi.fn();
    const fnB = vi.fn();

    debouncer.schedule('file:///a.ts', fnA, 300);
    debouncer.schedule('file:///b.ts', fnB, 600);

    vi.advanceTimersByTime(300);
    expect(fnA).toHaveBeenCalledOnce();
    expect(fnB).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fnB).toHaveBeenCalledOnce();
  });

  it('cancel() prevents execution', () => {
    const fn = vi.fn();
    debouncer.schedule('file:///a.ts', fn, 500);

    vi.advanceTimersByTime(250);
    debouncer.cancel('file:///a.ts');
    vi.advanceTimersByTime(500);

    expect(fn).not.toHaveBeenCalled();
  });

  it('cancel() is a no-op for unknown URI', () => {
    expect(() => debouncer.cancel('file:///unknown.ts')).not.toThrow();
  });

  it('dispose() clears all timers', () => {
    const fnA = vi.fn();
    const fnB = vi.fn();

    debouncer.schedule('file:///a.ts', fnA, 500);
    debouncer.schedule('file:///b.ts', fnB, 500);

    debouncer.dispose();
    vi.advanceTimersByTime(1000);

    expect(fnA).not.toHaveBeenCalled();
    expect(fnB).not.toHaveBeenCalled();
  });

  it('fn throwing does not crash the debouncer', () => {
    const throwingFn = vi.fn(() => {
      throw new Error('boom');
    });

    debouncer.schedule('file:///a.ts', throwingFn, 100);

    // Should not throw
    expect(() => vi.advanceTimersByTime(100)).not.toThrow();
    expect(throwingFn).toHaveBeenCalledOnce();

    // Should still be usable after error
    const fn2 = vi.fn();
    debouncer.schedule('file:///a.ts', fn2, 100);
    vi.advanceTimersByTime(100);
    expect(fn2).toHaveBeenCalledOnce();
  });
});
