/**
 * Connection Quality Store
 *
 * Reactive connection quality module using module-level `$state` runes
 * (same pattern as editor-state). Merges two data sources:
 *
 * 1. **Network Information API** (`navigator.connection`) — `effectiveType`,
 *    `rtt`, `downlink`, `saveData`. Updated on `change` events.
 * 2. **Perfume.js `navigatorInformation`** — `isLowEndDevice`,
 *    `isLowEndExperience`, `deviceMemory`, `hardwareConcurrency`.
 *    Reported once at page load via `updateFromNavigatorInfo()`.
 *
 * Quality tiers:
 * - `saveData=true` → `'slow'`
 * - `effectiveType in ['slow-2g', '2g']` → `'slow'`
 * - `effectiveType === '3g'` → `'medium'`
 * - `effectiveType === '4g'` → `'fast'`
 * - API unavailable → `'unknown'`
 *
 * @module
 */

import * as v from 'valibot';
import type { Str, Num, Bool, Void } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';
import type { NavigatorInfo } from './perfume';

// ── Schemas & Types ─────────────────────────────────────────────────────────

/** Supported connection quality tiers. */
export const ConnectionQualitySchema = v.picklist(['fast', 'medium', 'slow', 'unknown']);

/** Connection quality tier type. */
export type ConnectionQuality = v.InferOutput<typeof ConnectionQualitySchema>;

/** Snapshot of all connection state for beacon payloads and logging. */
export const ConnectionSnapshotSchema = v.strictObject({
  /** Network effective type (e.g. '4g', '3g', '2g', 'slow-2g'). */
  effectiveType: v.string(),
  /** Whether the user has data-saver mode enabled. */
  saveData: v.boolean(),
  /** Round-trip time estimate in milliseconds. */
  rtt: v.number(),
  /** Downlink speed estimate in megabits per second. */
  downlink: v.number(),
  /** Derived connection quality tier. */
  quality: ConnectionQualitySchema,
  /** Whether Perfume.js considers this a low-end device. */
  isLowEndDevice: v.boolean(),
  /** Whether Perfume.js considers this a low-end experience (device + network). */
  isLowEndExperience: v.boolean(),
  /** Device RAM in GB (0 if unavailable). */
  deviceMemory: v.number(),
  /** Logical CPU core count (0 if unavailable). */
  hardwareConcurrency: v.number(),
});

/** Snapshot type inferred from schema. */
export type ConnectionSnapshot = v.InferOutput<typeof ConnectionSnapshotSchema>;

// ── Quality Tier Logic ──────────────────────────────────────────────────────

/** Effective types that map to 'slow' quality. */
const SLOW_TYPES: ReadonlySet<Str> = new Set(['slow-2g', '2g']);

/**
 * Derives the connection quality tier from effectiveType and saveData.
 *
 * @param effectiveType - Network effective type string
 * @param saveData - Whether data-saver is active
 * @param apiAvailable - Whether the Network Information API is present
 * @returns The derived quality tier
 */
function deriveQuality(effectiveType: Str, saveData: Bool, apiAvailable: Bool): ConnectionQuality {
  if (!apiAvailable) return 'unknown';
  if (saveData) return 'slow';
  if (SLOW_TYPES.has(effectiveType)) return 'slow';
  if (effectiveType === '3g') return 'medium';
  if (effectiveType === '4g') return 'fast';
  return 'unknown';
}

// ── Module-Level Reactive State ─────────────────────────────────────────────

let _effectiveType: Str = $state('');
let _saveData: Bool = $state(false);
let _rtt: Num = $state(0);
let _downlink: Num = $state(0);
let _quality: ConnectionQuality = $state('unknown');
let _isLowEndDevice: Bool = $state(false);
let _isLowEndExperience: Bool = $state(false);
let _deviceMemory: Num = $state(0);
let _hardwareConcurrency: Num = $state(0);
let _apiAvailable: Bool = $state(false);

// ── NetworkInformation API Typing ───────────────────────────────────────────

/**
 * Minimal NetworkInformation type.
 *
 * The Network Information API is not yet in the TypeScript DOM lib,
 * so we define a minimal subset of the properties we use.
 */
type NetworkInformation = EventTarget & {
  /** Effective connection type. */
  readonly effectiveType: Str;
  /** Whether the user has data-saver enabled. */
  readonly saveData: Bool;
  /** Estimated round-trip time in milliseconds. */
  readonly rtt: Num;
  /** Estimated downlink speed in megabits per second. */
  readonly downlink: Num;
};

/**
 * Reads current values from the NetworkInformation object and updates state.
 *
 * @param conn - The navigator.connection object
 */
function readFromConnection(conn: NetworkInformation): void {
  _effectiveType = conn.effectiveType;
  _saveData = conn.saveData;
  _rtt = conn.rtt;
  _downlink = conn.downlink;
  _quality = deriveQuality(_effectiveType, _saveData, _apiAvailable);
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Initializes the connection quality store.
 *
 * Reads initial values from `navigator.connection` (if available) and
 * registers a `change` event listener for live updates.
 *
 * Must be called client-side only (guard with `browser` check at call site).
 *
 * @returns `Result<Void>` — always succeeds
 *
 * @example
 * import { browser } from '$app/environment';
 * if (browser) initConnection();
 */
export function initConnection(): Result<Void> {
  // navigator.connection is not available in all browsers.
  // Double cast via unknown because TypeScript DOM lib doesn't include NetworkInformation.
  const conn: NetworkInformation | undefined = (navigator as unknown as Record<Str, unknown>)
    .connection as NetworkInformation | undefined;

  if (!conn) {
    _apiAvailable = false;
    _effectiveType = '';
    _quality = 'unknown';
    return okUnchecked<Void>(undefined);
  }

  _apiAvailable = true;
  readFromConnection(conn);

  // Listen for connection changes (e.g. switching from WiFi to cellular)
  conn.addEventListener('change', () => {
    readFromConnection(conn);
  });

  return okUnchecked<Void>(undefined);
}

/**
 * Merges Perfume.js navigator information into the connection store.
 *
 * Perfume.js reports `navigatorInformation` once at page load with device
 * capabilities that aren't available from the Network Information API.
 *
 * @param info - Perfume.js navigator information object
 * @returns `Result<Void>` — always succeeds
 *
 * @example
 * updateFromNavigatorInfo({
 *   deviceMemory: 8,
 *   hardwareConcurrency: 8,
 *   isLowEndDevice: false,
 *   isLowEndExperience: false,
 * });
 */
export function updateFromNavigatorInfo(info: NavigatorInfo): Result<Void> {
  if (info.deviceMemory !== undefined) _deviceMemory = info.deviceMemory;
  if (info.hardwareConcurrency !== undefined) _hardwareConcurrency = info.hardwareConcurrency;
  if (info.isLowEndDevice !== undefined) _isLowEndDevice = info.isLowEndDevice;
  if (info.isLowEndExperience !== undefined) _isLowEndExperience = info.isLowEndExperience;
  return okUnchecked<Void>(undefined);
}

// ── Getters ─────────────────────────────────────────────────────────────────

/**
 * Returns the current connection quality tier.
 *
 * @returns Quality tier: 'fast', 'medium', 'slow', or 'unknown'
 */
export function getConnectionQuality(): ConnectionQuality {
  return _quality;
}

/**
 * Returns the current effective connection type.
 *
 * @returns Effective type string (e.g. '4g', '3g', '2g', 'slow-2g') or empty if unavailable
 */
export function getEffectiveType(): Str {
  return _effectiveType;
}

/**
 * Returns whether the user has data-saver mode enabled.
 *
 * @returns `true` if data-saver is active
 */
export function getSaveData(): Bool {
  return _saveData;
}

/**
 * Returns the estimated round-trip time in milliseconds.
 *
 * @returns RTT in milliseconds (0 if unavailable)
 */
export function getRtt(): Num {
  return _rtt;
}

/**
 * Returns the estimated downlink speed in megabits per second.
 *
 * @returns Downlink speed in Mbps (0 if unavailable)
 */
export function getDownlink(): Num {
  return _downlink;
}

/**
 * Returns whether Perfume.js considers this a low-end device.
 *
 * @returns `true` if device is low-end
 */
export function getIsLowEndDevice(): Bool {
  return _isLowEndDevice;
}

/**
 * Returns whether Perfume.js considers this a low-end experience.
 *
 * @returns `true` if experience is low-end (device + network combined)
 */
export function getIsLowEndExperience(): Bool {
  return _isLowEndExperience;
}

/**
 * Returns the device memory in GB.
 *
 * @returns Device RAM in GB (0 if unavailable)
 */
export function getDeviceMemory(): Num {
  return _deviceMemory;
}

/**
 * Returns the hardware concurrency (logical CPU core count).
 *
 * @returns CPU core count (0 if unavailable)
 */
export function getHardwareConcurrency(): Num {
  return _hardwareConcurrency;
}

/**
 * Returns a frozen snapshot of all connection state.
 *
 * Useful for beacon payloads and structured logging where a single
 * consistent point-in-time capture is needed.
 *
 * @returns Frozen object with all connection properties
 *
 * @example
 * const snap = getConnectionSnapshot();
 * console.log(snap.quality, snap.effectiveType);
 */
export function getConnectionSnapshot(): ConnectionSnapshot {
  return Object.freeze({
    effectiveType: _effectiveType,
    saveData: _saveData,
    rtt: _rtt,
    downlink: _downlink,
    quality: _quality,
    isLowEndDevice: _isLowEndDevice,
    isLowEndExperience: _isLowEndExperience,
    deviceMemory: _deviceMemory,
    hardwareConcurrency: _hardwareConcurrency,
  });
}

/**
 * Resets all connection state to defaults.
 *
 * Intended for test isolation — each test should call this in `beforeEach`
 * to ensure a clean slate.
 *
 * @returns `Result<Void>` — always succeeds
 */
export function resetConnection(): Result<Void> {
  _effectiveType = '';
  _saveData = false;
  _rtt = 0;
  _downlink = 0;
  _quality = 'unknown';
  _isLowEndDevice = false;
  _isLowEndExperience = false;
  _deviceMemory = 0;
  _hardwareConcurrency = 0;
  _apiAvailable = false;
  return okUnchecked<Void>(undefined);
}
