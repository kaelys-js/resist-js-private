/**
 * Tests for the vitals beacon client.
 *
 * Verifies metric queuing, beacon flushing, visibilitychange registration,
 * dev mode skipping, and sendBeacon / fetch fallback behavior.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Num, Bool, Void, Name } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type { VitalsMetric, VitalsDevice } from './vitals-payload';
import {
  queueVital,
  flushVitals,
  setupVitalsBeacon,
  setDeviceInfo,
  getBeaconStatus,
  resetBeacon,
  type BeaconStatus,
} from './vitals-beacon';

// ── Mocks ──────────────────────────────────────────────────────────────────

let originalDev: unknown;

vi.mock('@/utils/core/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    json: vi.fn(),
  },
  setupLogging: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Creates a valid VitalsMetric fixture.
 *
 * @param overrides - Partial overrides
 * @returns A complete VitalsMetric
 */
function createMetric(overrides: Partial<VitalsMetric> = {}): VitalsMetric {
  return {
    name: 'LCP' as Name, // cast safe: test fixture with valid Name
    value: 2450,
    rating: 'needsImprovement',
    navigationType: 'navigate',
    ...overrides,
  };
}

/**
 * Creates a valid VitalsDevice fixture.
 *
 * @returns A complete VitalsDevice
 */
function createDevice(): VitalsDevice {
  return {
    isLowEndDevice: false,
    isLowEndExperience: false,
    deviceMemory: 8,
    hardwareConcurrency: 8,
    effectiveType: '4g',
    saveData: false,
  };
}

/**
 * Unwraps getBeaconStatus() Result, failing the test if not ok.
 *
 * @returns The BeaconStatus data
 */
function unwrapStatus(): BeaconStatus {
  const result: Result<BeaconStatus> = getBeaconStatus();
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('getBeaconStatus() failed');
  }
  return result.data as BeaconStatus; // cast safe: ok-checked Result data
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('vitals beacon', () => {
  const mockSendBeacon = vi.fn().mockReturnValue(true);
  const originalAddEventListener = document.addEventListener.bind(document);
  const mockAddEventListener = vi.fn();

  beforeEach(() => {
    originalDev = import.meta.env.DEV;
    import.meta.env.DEV = false;
    mockSendBeacon.mockClear();
    mockAddEventListener.mockClear();
    vi.stubGlobal('navigator', {
      ...navigator,
      sendBeacon: mockSendBeacon,
    });
    vi.stubGlobal('crypto', {
      randomUUID: () => '550e8400-e29b-41d4-a716-446655440000',
    });
    // resetBeacon must come AFTER crypto mock so sessionId uses the mocked UUID
    resetBeacon();
    document.addEventListener = mockAddEventListener;
  });

  afterEach(() => {
    document.addEventListener = originalAddEventListener;
    import.meta.env.DEV = originalDev as boolean;
    vi.unstubAllGlobals();
  });

  // ── queueVital ──────────────────────────────────────────────────────

  describe('queueVital', () => {
    it('adds a metric to the internal queue', () => {
      const result: Result<Void> = queueVital(createMetric());
      expect(result.ok).toBe(true);
      expect(unwrapStatus().queued).toBe(1);
    });

    it('increments queue count with multiple metrics', () => {
      queueVital(createMetric({ name: 'LCP' as Name }));
      queueVital(createMetric({ name: 'FCP' as Name }));
      queueVital(createMetric({ name: 'CLS' as Name, value: 0.05, rating: 'good' }));
      expect(unwrapStatus().queued).toBe(3);
    });

    it('returns error for invalid metric', () => {
      const result = queueVital({ bad: 'data' } as unknown as VitalsMetric);
      expect(result.ok).toBe(false);
      // Queue should remain empty — invalid metric never enqueued
      expect(unwrapStatus().queued).toBe(0);
    });

    it('auto-flushes at MAX_QUEUE_SIZE (10)', () => {
      setDeviceInfo(createDevice());
      for (let i: Num = 0; i < 10; i++) {
        queueVital(createMetric({ name: `M${String(i)}` as Name }));
      }
      // Should have auto-flushed after 10th item
      expect(mockSendBeacon).toHaveBeenCalledOnce();
      expect(unwrapStatus().queued).toBe(0);
    });
  });

  // ── flushVitals ─────────────────────────────────────────────────────

  describe('flushVitals', () => {
    it('sends beacon with correct payload when queue has items', () => {
      setDeviceInfo(createDevice());
      queueVital(createMetric());

      const result: Result<Void> = flushVitals();
      expect(result.ok).toBe(true);
      expect(mockSendBeacon).toHaveBeenCalledOnce();
      expect(mockSendBeacon).toHaveBeenCalledWith('/api/vitals', expect.any(Blob));
    });

    it('does nothing when queue is empty', () => {
      const result: Result<Void> = flushVitals();
      expect(result.ok).toBe(true);
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it('clears queue after send', () => {
      setDeviceInfo(createDevice());
      queueVital(createMetric());
      flushVitals();
      expect(unwrapStatus().queued).toBe(0);
    });

    it('updates lastFlushAt timestamp', () => {
      setDeviceInfo(createDevice());
      queueVital(createMetric());
      expect(unwrapStatus().lastFlushAt).toBeNull();
      flushVitals();
      expect(unwrapStatus().lastFlushAt).not.toBeNull();
    });

    it('skips beacon in dev mode', () => {
      import.meta.env.DEV = true;
      setDeviceInfo(createDevice());
      queueVital(createMetric());
      flushVitals();
      expect(mockSendBeacon).not.toHaveBeenCalled();
      // Queue should still be cleared
      expect(unwrapStatus().queued).toBe(0);
    });

    it('returns error when safeStringify fails (line 176)', () => {
      setDeviceInfo(createDevice());
      queueVital(createMetric());

      const originalStringify: typeof JSON.stringify = JSON.stringify;
      JSON.stringify = (): never => {
        throw new Error('circular reference');
      };

      const result: Result<Void> = flushVitals();

      JSON.stringify = originalStringify;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION.INVALID_FORMAT');
      }
      expect(mockSendBeacon).not.toHaveBeenCalled();
      // Queue was already cleared before stringify attempt
      expect(unwrapStatus().queued).toBe(0);
    });
  });

  // ── setupVitalsBeacon ───────────────────────────────────────────────

  describe('setupVitalsBeacon', () => {
    it('registers visibilitychange event listener', () => {
      const result: Result<Void> = setupVitalsBeacon();
      expect(result.ok).toBe(true);
      expect(mockAddEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('flushes queue on visibilitychange to hidden', () => {
      import.meta.env.DEV = false;
      setDeviceInfo(createDevice());
      setupVitalsBeacon();

      // Queue a metric
      queueVital(createMetric());
      expect(unwrapStatus().queued).toBe(1);

      // Capture the visibilitychange callback and invoke it
      const visibilityCallback = mockAddEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === 'visibilitychange',
      )?.[1] as () => void;
      expect(visibilityCallback).toBeTypeOf('function');

      // Simulate hidden state
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });
      visibilityCallback();

      // Queue should be flushed
      expect(unwrapStatus().queued).toBe(0);
    });

    it('does not flush when visibility changes to visible', () => {
      setupVitalsBeacon();
      queueVital(createMetric());
      expect(unwrapStatus().queued).toBe(1);

      // Capture the visibilitychange callback
      const visibilityCallback = mockAddEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === 'visibilitychange',
      )?.[1] as () => void;
      expect(visibilityCallback).toBeTypeOf('function');

      // Simulate visible state (not hidden)
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      visibilityCallback();

      // Queue should still have the metric — flush only happens on 'hidden'
      expect(unwrapStatus().queued).toBe(1);

      // Restore to hidden for other tests
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });
    });
  });

  // ── setDeviceInfo ───────────────────────────────────────────────────

  describe('setDeviceInfo', () => {
    it('stores device context for future payloads', () => {
      const device: VitalsDevice = createDevice();
      const result: Result<Void> = setDeviceInfo(device);
      expect(result.ok).toBe(true);
    });

    it('returns error for invalid device info', () => {
      const result = setDeviceInfo({ bad: 'data' } as unknown as VitalsDevice);
      expect(result.ok).toBe(false);
    });
  });

  // ── getBeaconStatus ─────────────────────────────────────────────────

  describe('getBeaconStatus', () => {
    it('returns initial status', () => {
      const status: BeaconStatus = unwrapStatus();
      expect(status.queued).toBe(0);
      expect(status.queuedItems).toEqual([]);
      expect(status.lastFlushAt).toBeNull();
      expect(status.sessionId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(status.maxQueueSize).toBe(10);
    });

    it('returns queued metric items with name, value, and rating', () => {
      queueVital(createMetric({ name: 'LCP' as Name, value: 2450, rating: 'needsImprovement' }));
      queueVital(createMetric({ name: 'FCP' as Name, value: 1200, rating: 'good' }));
      const status: BeaconStatus = unwrapStatus();
      expect(status.queuedItems).toEqual([
        { name: 'LCP', value: 2450, rating: 'needsImprovement' },
        { name: 'FCP', value: 1200, rating: 'good' },
      ]);
    });
  });

  // ── sendBeacon fallback ─────────────────────────────────────────────

  describe('sendBeacon unavailable', () => {
    it('falls back to fetch with keepalive', () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
      vi.stubGlobal('navigator', {
        sendBeacon: undefined,
      });
      vi.stubGlobal('fetch', mockFetch);

      setDeviceInfo(createDevice());
      queueVital(createMetric());
      flushVitals();

      expect(mockFetch).toHaveBeenCalledOnce();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/vitals',
        expect.objectContaining({ keepalive: true }),
      );
    });
  });

  describe('SSR and edge cases', () => {
    it('handles sendBeacon throwing without propagating error', () => {
      import.meta.env.DEV = false;
      vi.stubGlobal('navigator', {
        ...navigator,
        sendBeacon: (): Bool => {
          throw new Error('boom');
        },
      });

      setDeviceInfo(createDevice());
      queueVital(createMetric());
      const result: Result<Void> = flushVitals();

      // catch block swallows the error — result is still ok
      expect(result.ok).toBe(true);
      // Queue should have been cleared before the try/catch
      expect(unwrapStatus().queued).toBe(0);
    });

    it('uses fallback URL when window is undefined (SSR)', () => {
      import.meta.env.DEV = false;
      const originalWindow = globalThis.window;
      // @ts-expect-error — removing window for SSR simulation
      delete globalThis.window;

      setDeviceInfo(createDevice());
      queueVital(createMetric());
      const result: Result<Void> = flushVitals();
      expect(result.ok).toBe(true);

      // Verify sendBeacon was called (payload built with '/' fallback URL)
      expect(mockSendBeacon).toHaveBeenCalledOnce();

      globalThis.window = originalWindow;
    });

    it('handles both sendBeacon and fetch unavailable without throwing', () => {
      import.meta.env.DEV = false;
      vi.stubGlobal('navigator', {});
      const originalFetch = globalThis.fetch;
      // @ts-expect-error — removing fetch for test
      delete globalThis.fetch;

      queueVital({ name: 'FCP' as Name, value: 1200, rating: 'good', navigationType: 'navigate' });

      // Should not throw
      const result = flushVitals();
      expect(result.ok).toBe(true);

      globalThis.fetch = originalFetch;
    });

    it('resetBeacon clears queue and resets state', () => {
      queueVital({ name: 'LCP' as Name, value: 2500, rating: 'good', navigationType: 'navigate' });
      const statusBefore: BeaconStatus = unwrapStatus();
      expect(statusBefore.queued).toBe(1);

      // Change the UUID mock so resetBeacon generates a different sessionId
      let callCount: Num = 0 as Num;
      vi.stubGlobal('crypto', {
        randomUUID: () => {
          callCount++;
          return callCount === 1
            ? 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
            : '11111111-2222-3333-4444-555555555555';
        },
      });

      resetBeacon();

      const statusAfter: BeaconStatus = unwrapStatus();
      expect(statusAfter.queued).toBe(0);
      expect(statusAfter.lastFlushAt).toBeNull();
    });
  });
});
