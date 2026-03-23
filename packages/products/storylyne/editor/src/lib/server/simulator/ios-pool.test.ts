/**
 * Tests for iOS Simulator pool — pre-booted simulator management.
 *
 * @module
 */

import type { Num } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { getPoolStatus, releaseSimulator } from './ios-pool';

describe('ios-pool', () => {
  describe('getPoolStatus', () => {
    it('returns empty pool status initially', () => {
      const status = getPoolStatus();
      expect(status.total).toBe(0);
      expect(status.inUse).toBe(0);
      expect(status.devices).toEqual([]);
    });

    it('returns numeric values for total and inUse', () => {
      const status = getPoolStatus();
      expect(typeof status.total).toBe('number');
      expect(typeof status.inUse).toBe('number');
    });
  });

  /* Note: acquire/release/drain tests require actual simulator boot
   * which takes 10-30s and leaves side effects. These are tested
   * via integration tests with real simulators. */

  describe('pool constraints', () => {
    it('pool status devices is an array', () => {
      const status = getPoolStatus();
      expect(Array.isArray(status.devices)).toBe(true);
    });

    it('pool in-use count does not exceed total', () => {
      const status = getPoolStatus();
      expect((status.inUse as Num) <= (status.total as Num)).toBe(true);
    });
  });

  describe('releaseSimulator', () => {
    it('does nothing for unknown UDID', () => {
      // Should not throw — releasing a non-pooled device is a no-op
      releaseSimulator('unknown-udid-xyz');
      const status = getPoolStatus();
      expect(status.total).toBe(0);
    });
  });
});
