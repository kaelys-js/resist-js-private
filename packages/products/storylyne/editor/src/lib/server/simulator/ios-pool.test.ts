/**
 * Tests for iOS Simulator pool — pre-booted simulator management.
 *
 * @module
 */

import type { Num, Str, Void } from '@/schemas/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  acquireSimulator,
  drainPool,
  getPoolStatus,
  releaseSimulator,
  removeFromPool,
} from './ios-pool';

/* Mock the ios-lifecycle module before importing ios-pool. The pool module
 * imports lifecycle helpers at module load — without mocks, acquireSimulator
 * would shell out to xcrun simctl. */
const _state = { state: 'Shutdown' as Str };
const bootCalls: Str[] = [];
const shutdownCalls: Str[] = [];
const waitCalls: Str[] = [];

vi.mock('./ios-lifecycle', () => ({
  bootSimulator: vi.fn(async (udid: Str): Promise<Void> => {
    await Promise.resolve();
    bootCalls.push(udid);
    _state.state = 'Booted';
    return undefined;
  }),
  getDeviceState: vi.fn(async (_udid: Str): Promise<Str> => {
    await Promise.resolve();
    return _state.state;
  }),
  shutdownSimulator: vi.fn(async (udid: Str): Promise<Void> => {
    await Promise.resolve();
    shutdownCalls.push(udid);
    return undefined;
  }),
  waitForBoot: vi.fn(async (udid: Str): Promise<Void> => {
    await Promise.resolve();
    waitCalls.push(udid);
    return undefined;
  }),
}));

beforeEach(async (): Promise<void> => {
  /* Drain pool between tests so each test starts fresh. */
  await drainPool();
  bootCalls.length = 0;
  shutdownCalls.length = 0;
  waitCalls.length = 0;
  _state.state = 'Shutdown';
});

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

    it('marks an existing pool entry as not in use', async (): Promise<void> => {
      await acquireSimulator('UDID-A', 'iPhone 17 Pro');
      expect(getPoolStatus().inUse).toBe(1);
      releaseSimulator('UDID-A');
      expect(getPoolStatus().inUse).toBe(0);
      expect(getPoolStatus().total).toBe(1);
    });
  });

  describe('acquireSimulator', () => {
    it('cold-boots a new device, adds to pool, and tracks bootedByPool=true', async (): Promise<void> => {
      const sim = await acquireSimulator('UDID-COLD', 'iPhone 17');
      expect(sim.udid).toBe('UDID-COLD');
      expect(sim.name).toBe('iPhone 17');
      expect(sim.wasPreBooted).toBe(false);
      expect(bootCalls).toEqual(['UDID-COLD']);
      expect(waitCalls).toEqual(['UDID-COLD']);
      const status = getPoolStatus();
      expect(status.total).toBe(1);
      expect(status.inUse).toBe(1);
      expect(status.devices).toEqual([{ udid: 'UDID-COLD', name: 'iPhone 17', inUse: true }]);
    });

    it('skips boot when device is already Booted externally', async (): Promise<void> => {
      _state.state = 'Booted';
      const sim = await acquireSimulator('UDID-EXT', 'iPhone 17');
      expect(sim.wasPreBooted).toBe(true);
      expect(bootCalls).toEqual([]);
      expect(waitCalls).toEqual([]);
    });

    it('re-acquires an existing released entry without rebooting if still Booted', async (): Promise<void> => {
      await acquireSimulator('UDID-R', 'iPhone 17');
      releaseSimulator('UDID-R');
      bootCalls.length = 0;
      waitCalls.length = 0;
      /* State is now Booted (mock set it on first acquire). */
      const sim = await acquireSimulator('UDID-R', 'iPhone 17');
      expect(sim.wasPreBooted).toBe(true);
      expect(bootCalls).toEqual([]);
      expect(waitCalls).toEqual([]);
    });

    it('re-acquires an existing released entry and reboots if no longer Booted', async (): Promise<void> => {
      await acquireSimulator('UDID-D', 'iPhone 17');
      releaseSimulator('UDID-D');
      /* Simulate the device shutting down externally between acquisitions. */
      _state.state = 'Shutdown';
      bootCalls.length = 0;
      waitCalls.length = 0;
      const sim = await acquireSimulator('UDID-D', 'iPhone 17');
      expect(sim.wasPreBooted).toBe(true);
      expect(bootCalls).toEqual(['UDID-D']);
      expect(waitCalls).toEqual(['UDID-D']);
    });

    it('throws when re-acquiring a UDID that is already in use', async (): Promise<void> => {
      await acquireSimulator('UDID-X', 'iPhone 17');
      await expect(acquireSimulator('UDID-X', 'iPhone 17')).rejects.toThrow(/already in use/);
    });

    it('throws when pool is at capacity', async (): Promise<void> => {
      await acquireSimulator('UDID-1', 'A');
      await acquireSimulator('UDID-2', 'B');
      await acquireSimulator('UDID-3', 'C');
      await expect(acquireSimulator('UDID-4', 'D')).rejects.toThrow(/maximum capacity/);
    });
  });

  describe('removeFromPool', () => {
    it('returns silently when UDID is not in pool', async (): Promise<void> => {
      await removeFromPool('UDID-NONE');
      expect(shutdownCalls).toEqual([]);
    });

    it('shuts down a pool-booted simulator and removes the entry', async (): Promise<void> => {
      await acquireSimulator('UDID-K', 'iPhone 17');
      await removeFromPool('UDID-K');
      expect(shutdownCalls).toEqual(['UDID-K']);
      expect(getPoolStatus().total).toBe(0);
    });

    it('removes an externally-booted entry without shutting it down', async (): Promise<void> => {
      _state.state = 'Booted';
      await acquireSimulator('UDID-EXT2', 'iPhone 17');
      await removeFromPool('UDID-EXT2');
      expect(shutdownCalls).toEqual([]);
      expect(getPoolStatus().total).toBe(0);
    });
  });

  describe('drainPool', () => {
    it('shuts down only pool-booted simulators and clears the pool', async (): Promise<void> => {
      _state.state = 'Booted';
      await acquireSimulator('UDID-EXT-D', 'iPhone 17 (ext)');
      _state.state = 'Shutdown';
      await acquireSimulator('UDID-OWN-D', 'iPhone 17 (own)');
      shutdownCalls.length = 0;
      await drainPool();
      expect(shutdownCalls).toEqual(['UDID-OWN-D']);
      expect(getPoolStatus().total).toBe(0);
    });

    it('swallows shutdown errors during drain', async (): Promise<void> => {
      const lifecycle = await import('./ios-lifecycle');
      vi.mocked(lifecycle.shutdownSimulator).mockRejectedValueOnce(new Error('already shut down'));
      await acquireSimulator('UDID-ERR', 'iPhone 17');
      await expect(drainPool()).resolves.toBeUndefined();
      expect(getPoolStatus().total).toBe(0);
    });
  });
});
