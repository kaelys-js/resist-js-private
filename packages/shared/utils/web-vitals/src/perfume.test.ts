/**
 * Tests for Perfume.js initialization wrapper.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Void } from '@/schemas/common';

// Mock perfume.js — initPerfume is the only import we use
const mockInitPerfume = vi.fn();
vi.mock('perfume.js', () => ({
  initPerfume: mockInitPerfume,
}));

// Import after mock setup
const { setupPerfume } = await import('./perfume');

describe('setupPerfume', () => {
  beforeEach(() => {
    mockInitPerfume.mockClear();
  });

  it('calls initPerfume with the provided tracker', () => {
    const tracker = vi.fn();
    const result = setupPerfume(tracker);
    expect(result.ok).toBe(true);
    expect(mockInitPerfume).toHaveBeenCalledOnce();
    expect(mockInitPerfume).toHaveBeenCalledWith(
      expect.objectContaining({
        analyticsTracker: tracker,
      }),
    );
  });

  it('returns Result<Void> success', () => {
    const tracker = vi.fn();
    const result = setupPerfume(tracker);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const _data: Void = result.data;
      expect(_data).toBeUndefined();
    }
  });

  it('disables resourceTiming and elementTiming by default', () => {
    const tracker = vi.fn();
    setupPerfume(tracker);
    expect(mockInitPerfume).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceTiming: false,
        elementTiming: false,
      }),
    );
  });

  it('does not throw when called multiple times', () => {
    const tracker = vi.fn();
    setupPerfume(tracker);
    setupPerfume(tracker);
    expect(mockInitPerfume).toHaveBeenCalledTimes(2);
  });
});
