/**
 * Tests for the connection quality store.
 *
 * Verifies quality tier derivation, navigator.connection integration,
 * Perfume.js navigatorInformation merging, and getter correctness.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Str, Num, Bool, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type { NavigatorInfo } from '@/utils/web-vitals/perfume';
import {
  initConnection,
  resetConnection,
  updateFromNavigatorInfo,
  getConnectionQuality,
  getEffectiveType,
  getSaveData,
  getRtt,
  getDownlink,
  getIsLowEndDevice,
  getIsLowEndExperience,
  getDeviceMemory,
  getHardwareConcurrency,
  getConnectionSnapshot,
} from './connection.svelte';

// === Mock navigator.connection

type MockConnection = {
  effectiveType: Str;
  saveData: Bool;
  rtt: Num;
  downlink: Num;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

/**
 * Creates a mock NetworkInformation object.
 *
 * @param overrides - Partial overrides for mock connection properties
 * @returns A complete mock connection object
 */
function createMockConnection(overrides: Partial<MockConnection> = {}): MockConnection {
  return {
    effectiveType: '4g',
    saveData: false,
    rtt: 50,
    downlink: 10,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    ...overrides,
  };
}

/**
 * Sets up `navigator.connection` with the given mock.
 *
 * @param conn - Mock connection to install, or null for unsupported
 */
function installMockConnection(conn: MockConnection | null): void {
  Object.defineProperty(navigator, 'connection', {
    value: conn,
    writable: true,
    configurable: true,
  });
}

// === Tests

describe('connection quality store', () => {
  beforeEach(() => {
    resetConnection();
  });

  afterEach(() => {
    // Clean up navigator.connection mock
    Object.defineProperty(navigator, 'connection', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  // === initConnection

  describe('initConnection', () => {
    it('reads navigator.connection when available', () => {
      const conn: MockConnection = createMockConnection({
        effectiveType: '3g',
        rtt: 300,
        downlink: 1.5,
        saveData: false,
      });
      installMockConnection(conn);

      const result: Result<Void> = initConnection();
      expect(result.ok).toBe(true);

      const etResult = getEffectiveType();
      expect(etResult.ok).toBe(true);
      if (etResult.ok) expect(etResult.data).toBe('3g');

      const rttResult = getRtt();
      expect(rttResult.ok).toBe(true);
      if (rttResult.ok) expect(rttResult.data).toBe(300);

      const dlResult = getDownlink();
      expect(dlResult.ok).toBe(true);
      if (dlResult.ok) expect(dlResult.data).toBe(1.5);
    });

    it('registers a change event listener', () => {
      const conn: MockConnection = createMockConnection();
      installMockConnection(conn);

      initConnection();
      expect(conn.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('returns ok when navigator.connection is unavailable', () => {
      installMockConnection(null);

      const result: Result<Void> = initConnection();
      expect(result.ok).toBe(true);

      const qualityResult = getConnectionQuality();
      expect(qualityResult.ok).toBe(true);
      if (qualityResult.ok) expect(qualityResult.data).toBe('unknown');
    });

    it('sets quality to unknown when API is absent', () => {
      installMockConnection(null);

      initConnection();

      const qualityResult = getConnectionQuality();
      expect(qualityResult.ok).toBe(true);
      if (qualityResult.ok) expect(qualityResult.data).toBe('unknown');

      const etResult = getEffectiveType();
      expect(etResult.ok).toBe(true);
      if (etResult.ok) expect(etResult.data).toBe('unknown');
    });
  });

  // === getConnectionQuality

  describe('getConnectionQuality', () => {
    it('returns fast for 4g', () => {
      const conn: MockConnection = createMockConnection({ effectiveType: '4g' });
      installMockConnection(conn);

      initConnection();
      const result = getConnectionQuality();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe('fast');
    });

    it('returns medium for 3g', () => {
      const conn: MockConnection = createMockConnection({ effectiveType: '3g' });
      installMockConnection(conn);

      initConnection();
      const result = getConnectionQuality();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe('medium');
    });

    it('returns slow for 2g', () => {
      const conn: MockConnection = createMockConnection({ effectiveType: '2g' });
      installMockConnection(conn);

      initConnection();
      const result = getConnectionQuality();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe('slow');
    });

    it('returns slow for slow-2g', () => {
      const conn: MockConnection = createMockConnection({ effectiveType: 'slow-2g' });
      installMockConnection(conn);

      initConnection();
      const result = getConnectionQuality();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe('slow');
    });

    it('saveData=true overrides to slow regardless of effectiveType', () => {
      const conn: MockConnection = createMockConnection({
        effectiveType: '4g',
        saveData: true,
      });
      installMockConnection(conn);

      initConnection();
      const result = getConnectionQuality();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe('slow');
    });

    it('returns unknown when API is unavailable', () => {
      installMockConnection(null);

      initConnection();
      const result = getConnectionQuality();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe('unknown');
    });
  });

  // === updateFromNavigatorInfo

  describe('updateFromNavigatorInfo', () => {
    it('merges Perfume.js device data', () => {
      installMockConnection(null);
      initConnection();

      const info: NavigatorInfo = {
        deviceMemory: 8,
        hardwareConcurrency: 8,
        isLowEndDevice: false,
        isLowEndExperience: false,
        serviceWorkerStatus: 'controlled',
      };

      const result: Result<Void> = updateFromNavigatorInfo(info);
      expect(result.ok).toBe(true);

      const memResult = getDeviceMemory();
      expect(memResult.ok).toBe(true);
      if (memResult.ok) expect(memResult.data).toBe(8);

      const hwResult = getHardwareConcurrency();
      expect(hwResult.ok).toBe(true);
      if (hwResult.ok) expect(hwResult.data).toBe(8);

      const ledResult = getIsLowEndDevice();
      expect(ledResult.ok).toBe(true);
      if (ledResult.ok) expect(ledResult.data).toBe(false);

      const leeResult = getIsLowEndExperience();
      expect(leeResult.ok).toBe(true);
      if (leeResult.ok) expect(leeResult.data).toBe(false);
    });

    it('handles low-end device info', () => {
      installMockConnection(null);
      initConnection();

      const info: NavigatorInfo = {
        deviceMemory: 2,
        hardwareConcurrency: 2,
        isLowEndDevice: true,
        isLowEndExperience: true,
        serviceWorkerStatus: 'unsupported',
      };

      updateFromNavigatorInfo(info);

      const ledResult = getIsLowEndDevice();
      expect(ledResult.ok).toBe(true);
      if (ledResult.ok) expect(ledResult.data).toBe(true);

      const leeResult = getIsLowEndExperience();
      expect(leeResult.ok).toBe(true);
      if (leeResult.ok) expect(leeResult.data).toBe(true);

      const memResult = getDeviceMemory();
      expect(memResult.ok).toBe(true);
      if (memResult.ok) expect(memResult.data).toBe(2);
    });

    it('handles undefined fields gracefully', () => {
      installMockConnection(null);
      initConnection();

      // Perfume.js fields are all optional
      const info: NavigatorInfo = {};

      const result: Result<Void> = updateFromNavigatorInfo(info);
      expect(result.ok).toBe(true);

      // Defaults should remain
      const memResult = getDeviceMemory();
      expect(memResult.ok).toBe(true);
      if (memResult.ok) expect(memResult.data).toBe(0);

      const hwResult = getHardwareConcurrency();
      expect(hwResult.ok).toBe(true);
      if (hwResult.ok) expect(hwResult.data).toBe(0);

      const ledResult = getIsLowEndDevice();
      expect(ledResult.ok).toBe(true);
      if (ledResult.ok) expect(ledResult.data).toBe(false);

      const leeResult = getIsLowEndExperience();
      expect(leeResult.ok).toBe(true);
      if (leeResult.ok) expect(leeResult.data).toBe(false);
    });
  });

  // === getSaveData

  describe('getSaveData', () => {
    it('returns true when connection reports saveData', () => {
      const conn: MockConnection = createMockConnection({ saveData: true });
      installMockConnection(conn);

      initConnection();
      const result = getSaveData();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe(true);
    });

    it('returns false by default', () => {
      const conn: MockConnection = createMockConnection({ saveData: false });
      installMockConnection(conn);

      initConnection();
      const result = getSaveData();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe(false);
    });
  });

  // === connection change event

  describe('connection change event', () => {
    it('updates quality when connection changes', () => {
      const conn: MockConnection = createMockConnection({ effectiveType: '4g' });
      installMockConnection(conn);

      initConnection();
      const qualityBefore = getConnectionQuality();
      expect(qualityBefore.ok).toBe(true);
      if (qualityBefore.ok) expect(qualityBefore.data).toBe('fast');

      // Simulate connection change
      const changeHandler = conn.addEventListener.mock.calls[0]![1] as () => void;
      conn.effectiveType = '2g';
      changeHandler();

      const qualityAfter = getConnectionQuality();
      expect(qualityAfter.ok).toBe(true);
      if (qualityAfter.ok) expect(qualityAfter.data).toBe('slow');

      const etResult = getEffectiveType();
      expect(etResult.ok).toBe(true);
      if (etResult.ok) expect(etResult.data).toBe('2g');
    });
  });

  // === snapshot

  describe('getConnectionSnapshot', () => {
    it('returns a frozen snapshot of all connection state', () => {
      const conn: MockConnection = createMockConnection({
        effectiveType: '3g',
        rtt: 200,
        downlink: 2,
        saveData: false,
      });
      installMockConnection(conn);

      initConnection();
      updateFromNavigatorInfo({
        deviceMemory: 4,
        hardwareConcurrency: 4,
        isLowEndDevice: false,
        isLowEndExperience: false,
      });

      const snapResult = getConnectionSnapshot();
      expect(snapResult.ok).toBe(true);
      if (snapResult.ok) {
        expect(snapResult.data).toEqual({
          effectiveType: '3g',
          saveData: false,
          rtt: 200,
          downlink: 2,
          quality: 'medium',
          isLowEndDevice: false,
          isLowEndExperience: false,
          deviceMemory: 4,
          hardwareConcurrency: 4,
        });
        expect(Object.isFrozen(snapResult.data)).toBe(true);
      }
    });
  });

  // === edge cases

  describe('edge cases', () => {
    it('returns unknown quality for unrecognized effectiveType', () => {
      const conn: MockConnection = createMockConnection({
        effectiveType: '5g',
        rtt: 10,
        downlink: 100,
        saveData: false,
      });
      installMockConnection(conn);
      initConnection();

      const result = getConnectionQuality();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe('unknown');
    });

    it('updateFromNavigatorInfo handles individual undefined fields', () => {
      const conn: MockConnection = createMockConnection({
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false,
      });
      installMockConnection(conn);
      initConnection();

      // Only deviceMemory defined, rest undefined
      updateFromNavigatorInfo({
        deviceMemory: 16,
      });

      const snapResult = getConnectionSnapshot();
      expect(snapResult.ok).toBe(true);
      if (snapResult.ok) {
        expect(snapResult.data.deviceMemory).toBe(16);
        // Other fields should keep defaults (0/false from resetConnection)
        expect(snapResult.data.hardwareConcurrency).toBe(0);
        expect(snapResult.data.isLowEndDevice).toBe(false);
      }
    });
  });
});
