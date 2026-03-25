/**
 * Connection Quality Store — reactive module using `$state` runes.
 *
 * Merges Network Information API and Perfume.js navigator data.
 *
 * @module
 */
/// <reference types="svelte" />

import * as v from 'valibot';

import type { Str, Num, Bool, Void } from '@/schemas/common';
import { ok, okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

import type { NavigatorInfo } from '@/utils/web-vitals/perfume';

// ===
// Schemas & Types

/** Valid effective type values from the Network Information API plus our 'unknown' sentinel. */
const EFFECTIVE_TYPE_REGEX: RegExp = /^(?:slow-2g|2g|3g|4g|unknown)$/;

/** Valid service worker status values from Perfume.js. */
const SW_STATUS_REGEX: RegExp = /^(?:controlled|supported|unsupported)$/;

/** Supported connection quality tiers. */
export const ConnectionQualitySchema = v.picklist(['fast', 'medium', 'slow', 'unknown']);

/** Connection quality tier type. {@link ConnectionQualitySchema} */
export type ConnectionQuality = v.InferOutput<typeof ConnectionQualitySchema>;

/** Snapshot of all connection state for beacon payloads and logging. */
export const ConnectionSnapshotSchema = v.strictObject({
  /** Network effective type (e.g. '4g', '3g', '2g', 'slow-2g'). */
  effectiveType: v.pipe(v.string(), v.minLength(1), v.maxLength(16), v.regex(EFFECTIVE_TYPE_REGEX)),
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

/** Snapshot type inferred from schema. {@link ConnectionSnapshotSchema} */
export type ConnectionSnapshot = v.InferOutput<typeof ConnectionSnapshotSchema>;

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

/** Validation schema for Perfume.js navigator information. */
const NavigatorInfoSchema = v.strictObject({
  /** Device RAM in GB. */
  deviceMemory: v.optional(v.number()),
  /** Logical CPU core count. */
  hardwareConcurrency: v.optional(v.number()),
  /** Whether the device is considered low-end. */
  isLowEndDevice: v.optional(v.boolean()),
  /** Whether the experience is considered low-end (device + network). */
  isLowEndExperience: v.optional(v.boolean()),
  /** Service worker registration status. */
  serviceWorkerStatus: v.optional(
    v.pipe(v.string(), v.minLength(1), v.maxLength(32), v.regex(SW_STATUS_REGEX)),
  ),
});

/** Inferred type for validated navigator info. */
type ValidatedNavigatorInfo = v.InferOutput<typeof NavigatorInfoSchema>;

// ===
// Constants

/** Effective types that map to 'slow' quality. */
const SLOW_TYPES: ReadonlySet<Str> = new Set(['slow-2g', '2g']);

// ===
// Helpers

/**
 * Derives the connection quality tier from effectiveType and saveData.
 *
 * @param {Str} effectiveType - Network effective type string
 * @param {Bool} saveData - Whether data-saver is active
 * @param {Bool} apiAvailable - Whether the Network Information API is present
 * @returns {Result<ConnectionQuality>} The derived quality tier
 */
function deriveQuality(
  effectiveType: Str,
  saveData: Bool,
  apiAvailable: Bool,
): Result<ConnectionQuality> {
  if (!apiAvailable) return ok(ConnectionQualitySchema, 'unknown');
  if (saveData) return ok(ConnectionQualitySchema, 'slow');
  if (SLOW_TYPES.has(effectiveType)) return ok(ConnectionQualitySchema, 'slow');
  if (effectiveType === '3g') return ok(ConnectionQualitySchema, 'medium');
  if (effectiveType === '4g') return ok(ConnectionQualitySchema, 'fast');

  return ok(ConnectionQualitySchema, 'unknown');
}

/** Module-level reactive state. */
let _effectiveType: Str = $state('unknown');
let _saveData: Bool = $state(false);
let _rtt: Num = $state(0);
let _downlink: Num = $state(0);
let _quality: ConnectionQuality = $state('unknown');
let _isLowEndDevice: Bool = $state(false);
let _isLowEndExperience: Bool = $state(false);
let _deviceMemory: Num = $state(0);
let _hardwareConcurrency: Num = $state(0);
let _apiAvailable: Bool = $state(false);

/**
 * Reads current values from the NetworkInformation object and updates state.
 *
 * @param {NetworkInformation} conn - The navigator.connection object
 * @returns {Result<Void>} Always succeeds
 */
function readFromConnection(conn: NetworkInformation): Result<Void> {
  _effectiveType = conn.effectiveType;
  _saveData = conn.saveData;
  _rtt = conn.rtt;
  _downlink = conn.downlink;

  const qualityResult: Result<ConnectionQuality> = deriveQuality(
    _effectiveType,
    _saveData,
    _apiAvailable,
  );

  if (qualityResult.ok) _quality = qualityResult.data;

  return okUnchecked<Void>(undefined);
}

// ===
// Public API

/**
 * Initializes the connection quality store.
 *
 * Reads initial values from `navigator.connection` (if available) and
 * registers a `change` event listener for live updates.
 *
 * Must be called client-side only (guard with `browser` check at call site).
 *
 * @returns {Result<Void>} Always succeeds
 *
 * @example
 * ```typescript
 * import { browser } from '$app/environment';
 * if (browser) initConnection();
 * ```
 */
export function initConnection(): Result<Void> {
  // navigator.connection is not available in all browsers.
  // Double cast via unknown because TypeScript DOM lib doesn't include NetworkInformation.
  const conn: NetworkInformation | undefined = (navigator as unknown as Record<Str, unknown>)
    .connection as NetworkInformation | undefined;

  if (!conn) {
    _apiAvailable = false;
    _effectiveType = 'unknown';
    _quality = 'unknown';
    return okUnchecked<Void>(undefined);
  }

  _apiAvailable = true;

  const readResult: Result<Void> = readFromConnection(conn);

  if (!readResult.ok) return readResult;

  // Listen for connection changes (e.g. switching from WiFi to cellular)
  conn.addEventListener('change', (): Void => {
    const _changeResult: Result<Void> = readFromConnection(conn);

    return undefined;
  });

  return okUnchecked<Void>(undefined);
}

/**
 * Merges Perfume.js navigator information into the connection store.
 *
 * Perfume.js reports `navigatorInformation` once at page load with device
 * capabilities that aren't available from the Network Information API.
 *
 * @param {NavigatorInfo} info - Perfume.js navigator information object
 * @returns {Result<Void>} Always succeeds
 *
 * @example
 * ```typescript
 * updateFromNavigatorInfo({
 *   deviceMemory: 8,
 *   hardwareConcurrency: 8,
 *   isLowEndDevice: false,
 *   isLowEndExperience: false,
 * });
 * ```
 */
export function updateFromNavigatorInfo(info: NavigatorInfo): Result<Void> {
  const infoResult: Result<ValidatedNavigatorInfo> = safeParse(NavigatorInfoSchema, info);

  if (!infoResult.ok) return infoResult;

  const validated: ValidatedNavigatorInfo = infoResult.data;

  if (validated.deviceMemory !== undefined) _deviceMemory = validated.deviceMemory;
  if (validated.hardwareConcurrency !== undefined)
    _hardwareConcurrency = validated.hardwareConcurrency;
  if (validated.isLowEndDevice !== undefined) _isLowEndDevice = validated.isLowEndDevice;
  if (validated.isLowEndExperience !== undefined)
    _isLowEndExperience = validated.isLowEndExperience;
  return okUnchecked<Void>(undefined);
}

/**
 * Returns the current connection quality tier.
 *
 * @returns {Result<ConnectionQuality>} Quality tier: 'fast', 'medium', 'slow', or 'unknown'
 *
 * @example
 * ```typescript
 * const quality = getConnectionQuality();
 * ```
 */
export function getConnectionQuality(): Result<ConnectionQuality> {
  return ok(ConnectionQualitySchema, _quality);
}

/**
 * Returns the current effective connection type.
 *
 * @returns {Result<Str>} Effective type string (e.g. '4g', '3g') or 'unknown' if unavailable
 *
 * @example
 * ```typescript
 * const effectiveType = getEffectiveType();
 * ```
 */
export function getEffectiveType(): Result<Str> {
  return okUnchecked<Str>(_effectiveType);
}

/**
 * Returns whether the user has data-saver mode enabled.
 *
 * @returns {Result<Bool>} `true` if data-saver is active
 *
 * @example
 * ```typescript
 * const saveData = getSaveData();
 * ```
 */
export function getSaveData(): Result<Bool> {
  return okUnchecked<Bool>(_saveData);
}

/**
 * Returns the estimated round-trip time in milliseconds.
 *
 * @returns {Result<Num>} RTT in milliseconds (0 if unavailable)
 *
 * @example
 * ```typescript
 * const rtt = getRtt();
 * ```
 */
export function getRtt(): Result<Num> {
  return okUnchecked<Num>(_rtt);
}

/**
 * Returns the estimated downlink speed in megabits per second.
 *
 * @returns {Result<Num>} Downlink speed in Mbps (0 if unavailable)
 *
 * @example
 * ```typescript
 * const downlink = getDownlink();
 * ```
 */
export function getDownlink(): Result<Num> {
  return okUnchecked<Num>(_downlink);
}

/**
 * Returns whether Perfume.js considers this a low-end device.
 *
 * @returns {Result<Bool>} `true` if device is low-end
 *
 * @example
 * ```typescript
 * const isLowEnd = getIsLowEndDevice();
 * ```
 */
export function getIsLowEndDevice(): Result<Bool> {
  return okUnchecked<Bool>(_isLowEndDevice);
}

/**
 * Returns whether Perfume.js considers this a low-end experience.
 *
 * @returns {Result<Bool>} `true` if experience is low-end (device + network combined)
 *
 * @example
 * ```typescript
 * const isLowEndExp = getIsLowEndExperience();
 * ```
 */
export function getIsLowEndExperience(): Result<Bool> {
  return okUnchecked<Bool>(_isLowEndExperience);
}

/**
 * Returns the device memory in GB.
 *
 * @returns {Result<Num>} Device RAM in GB (0 if unavailable)
 *
 * @example
 * ```typescript
 * const memory = getDeviceMemory();
 * ```
 */
export function getDeviceMemory(): Result<Num> {
  return okUnchecked<Num>(_deviceMemory);
}

/**
 * Returns the hardware concurrency (logical CPU core count).
 *
 * @returns {Result<Num>} CPU core count (0 if unavailable)
 *
 * @example
 * ```typescript
 * const cores = getHardwareConcurrency();
 * ```
 */
export function getHardwareConcurrency(): Result<Num> {
  return okUnchecked<Num>(_hardwareConcurrency);
}

/**
 * Returns a frozen snapshot of all connection state.
 *
 * Useful for beacon payloads and structured logging where a single
 * consistent point-in-time capture is needed.
 *
 * @returns {Result<ConnectionSnapshot>} Frozen object with all connection properties
 *
 * @example
 * ```typescript
 * const snap = getConnectionSnapshot();
 * if (snap.ok) console.log(snap.data.quality, snap.data.effectiveType);
 * ```
 */
export function getConnectionSnapshot(): Result<ConnectionSnapshot> {
  return ok(
    ConnectionSnapshotSchema,
    Object.freeze({
      effectiveType: _effectiveType,
      saveData: _saveData,
      rtt: _rtt,
      downlink: _downlink,
      quality: _quality,
      isLowEndDevice: _isLowEndDevice,
      isLowEndExperience: _isLowEndExperience,
      deviceMemory: _deviceMemory,
      hardwareConcurrency: _hardwareConcurrency,
    }),
  );
}

/**
 * Resets all connection state to defaults.
 *
 * Intended for test isolation — each test should call this in `beforeEach`
 * to ensure a clean slate.
 *
 * @returns {Result<Void>} Always succeeds
 *
 * @example
 * ```typescript
 * beforeEach(() => { resetConnection(); });
 * ```
 */
export function resetConnection(): Result<Void> {
  _effectiveType = 'unknown';
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
