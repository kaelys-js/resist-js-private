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
import type { NavigatorInfo } from './perfume';
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

// ── Mock navigator.connection ──────────────────────────────────────────────

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

// ── Tests ──────────────────────────────────────────────────────────────────

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

  // ── initConnection ───────────────────────────────────────────────────

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
      expect(getEffectiveType()).toBe('3g');
      expect(getRtt()).toBe(300);
      expect(getDownlink()).toBe(1.5);
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
      expect(getConnectionQuality()).toBe('unknown');
    });

    it('sets quality to unknown when API is absent', () => {
      installMockConnection(null);

      initConnection();
      expect(getConnectionQuality()).toBe('unknown');
      expect(getEffectiveType()).toBe('');
    });
  });

  // ── getConnectionQuality ─────────────────────────────────────────────

  describe('getConnectionQuality', () => {
    it('returns fast for 4g', () => {
      const conn: MockConnection = createMockConnection({ effectiveType: '4g' });
      installMockConnection(conn);

      initConnection();
      expect(getConnectionQuality()).toBe('fast');
    });

    it('returns medium for 3g', () => {
      const conn: MockConnection = createMockConnection({ effectiveType: '3g' });
      installMockConnection(conn);

      initConnection();
      expect(getConnectionQuality()).toBe('medium');
    });

    it('returns slow for 2g', () => {
      const conn: MockConnection = createMockConnection({ effectiveType: '2g' });
      installMockConnection(conn);

      initConnection();
      expect(getConnectionQuality()).toBe('slow');
    });

    it('returns slow for slow-2g', () => {
      const conn: MockConnection = createMockConnection({ effectiveType: 'slow-2g' });
      installMockConnection(conn);

      initConnection();
      expect(getConnectionQuality()).toBe('slow');
    });

    it('saveData=true overrides to slow regardless of effectiveType', () => {
      const conn: MockConnection = createMockConnection({
        effectiveType: '4g',
        saveData: true,
      });
      installMockConnection(conn);

      initConnection();
      expect(getConnectionQuality()).toBe('slow');
    });

    it('returns unknown when API is unavailable', () => {
      installMockConnection(null);

      initConnection();
      expect(getConnectionQuality()).toBe('unknown');
    });
  });

  // ── updateFromNavigatorInfo ──────────────────────────────────────────

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
      expect(getDeviceMemory()).toBe(8);
      expect(getHardwareConcurrency()).toBe(8);
      expect(getIsLowEndDevice()).toBe(false);
      expect(getIsLowEndExperience()).toBe(false);
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
      expect(getIsLowEndDevice()).toBe(true);
      expect(getIsLowEndExperience()).toBe(true);
      expect(getDeviceMemory()).toBe(2);
    });

    it('handles undefined fields gracefully', () => {
      installMockConnection(null);
      initConnection();

      // Perfume.js fields are all optional
      const info: NavigatorInfo = {};

      const result: Result<Void> = updateFromNavigatorInfo(info);
      expect(result.ok).toBe(true);
      // Defaults should remain
      expect(getDeviceMemory()).toBe(0);
      expect(getHardwareConcurrency()).toBe(0);
      expect(getIsLowEndDevice()).toBe(false);
      expect(getIsLowEndExperience()).toBe(false);
    });
  });

  // ── getSaveData ─────────────────────────────────────────────────────

  describe('getSaveData', () => {
    it('returns true when connection reports saveData', () => {
      const conn: MockConnection = createMockConnection({ saveData: true });
      installMockConnection(conn);

      initConnection();
      expect(getSaveData()).toBe(true);
    });

    it('returns false by default', () => {
      const conn: MockConnection = createMockConnection({ saveData: false });
      installMockConnection(conn);

      initConnection();
      expect(getSaveData()).toBe(false);
    });
  });

  // ── connection change event ─────────────────────────────────────────

  describe('connection change event', () => {
    it('updates quality when connection changes', () => {
      const conn: MockConnection = createMockConnection({ effectiveType: '4g' });
      installMockConnection(conn);

      initConnection();
      expect(getConnectionQuality()).toBe('fast');

      // Simulate connection change
      const changeHandler = conn.addEventListener.mock.calls[0]![1] as () => void;
      conn.effectiveType = '2g';
      changeHandler();

      expect(getConnectionQuality()).toBe('slow');
      expect(getEffectiveType()).toBe('2g');
    });
  });

  // ── snapshot ─────────────────────────────────────────────────────────

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

      const snapshot = getConnectionSnapshot();
      expect(snapshot).toEqual({
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
      expect(Object.isFrozen(snapshot)).toBe(true);
    });
  });

  // ── edge cases ──────────────────────────────────────────────────────

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

      expect(getConnectionQuality()).toBe('unknown');
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

      const snapshot = getConnectionSnapshot();
      expect(snapshot.deviceMemory).toBe(16);
      // Other fields should keep defaults (0/false from resetConnection)
      expect(snapshot.hardwareConcurrency).toBe(0);
      expect(snapshot.isLowEndDevice).toBe(false);
    });
  });
});
