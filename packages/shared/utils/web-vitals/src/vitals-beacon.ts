/**
 * Vitals Beacon Client
 *
 * Queues Web Vitals metrics and flushes them to `/api/vitals` via
 * `navigator.sendBeacon()`. Falls back to `fetch()` with `keepalive`.
 * Uses `text/plain` to avoid CORS preflight.
 *
 * @module
 */

import * as v from 'valibot';

import {
  UuidSchema,
  type Str,
  type Num,
  type Void,
  type NullableStr,
  type IsoTimestamp,
  type Uuid,
  type RelativeUrl,
} from '@/schemas/common';
import { ok, okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import { safeStringify } from '@/utils/core/object';
import { log } from '@/utils/core/logger';
import {
  VitalsMetricSchema,
  VitalsDeviceSchema,
  type VitalsMetric,
  type VitalsDevice,
  type VitalsBeaconPayload,
} from '@/utils/web-vitals/vitals-payload';

// =============================================================================
// Schemas
// =============================================================================

/** Schema for a queued metric summary — picks name, value, rating from {@link VitalsMetricSchema}. */
export const BeaconQueuedItemSchema = v.pick(VitalsMetricSchema, ['name', 'value', 'rating']);

/** Inferred type for a queued metric summary. See {@link BeaconQueuedItemSchema}. */
export type BeaconQueuedItem = v.InferOutput<typeof BeaconQueuedItemSchema>;

/** Schema for the beacon status diagnostic object. */
export const BeaconStatusSchema = v.strictObject({
  /** Number of metrics currently queued for flush. */
  queued: v.number(),
  /** Summary of each queued metric (name, value, rating). */
  queuedItems: v.array(BeaconQueuedItemSchema),
  /** ISO timestamp of last successful flush, or null if never flushed. */
  lastFlushAt: v.nullable(v.string()),
  /** Stable session UUID (random per page load, not persisted). */
  sessionId: UuidSchema,
  /** Maximum queue depth before auto-flush triggers. */
  maxQueueSize: v.number(),
});

/** Inferred type for beacon status. See {@link BeaconStatusSchema}. */
export type BeaconStatus = v.InferOutput<typeof BeaconStatusSchema>;

// =============================================================================
// Constants
// =============================================================================

/** Beacon endpoint path (same-origin, no CORS issues). */
const BEACON_URL: Str = '/api/vitals';

/** Maximum metrics to queue before auto-flushing. */
const MAX_QUEUE_SIZE: Num = 10;

// =============================================================================
// Module State
// =============================================================================

/** Queued metrics awaiting flush. */
let queue: VitalsMetric[] = [];

/** Device context snapshot for payloads. */
let device: VitalsDevice | null = null;

/** Stable session identifier (random UUID per page load, not persisted). */
let sessionId: Str = crypto.randomUUID();

/** ISO timestamp of last successful flush, or null if never flushed. */
let lastFlushAt: NullableStr = null;

// =============================================================================
// API
// =============================================================================

/**
 * Adds a metric to the internal queue.
 *
 * Auto-flushes when the queue reaches `MAX_QUEUE_SIZE` (10) to prevent
 * unbounded memory growth.
 *
 * @param {VitalsMetric} metric - The vitals metric to queue
 * @returns {Result<Void>} Always succeeds
 *
 * @example
 * ```typescript
 * queueVital({
 *   name: 'LCP',
 *   value: 2450,
 *   rating: 'needsImprovement',
 *   navigationType: 'navigate',
 * });
 * ```
 */
export function queueVital(metric: VitalsMetric): Result<Void> {
  const metricResult: Result<VitalsMetric> = safeParse(VitalsMetricSchema, metric);

  if (!metricResult.ok) {
    return metricResult;
  }

  queue.push(metricResult.data);

  if (queue.length >= MAX_QUEUE_SIZE) {
    flushVitals();
  }

  return okUnchecked<Void>(undefined);
}

/**
 * Flushes all queued metrics to the beacon endpoint.
 *
 * Builds a `VitalsBeaconPayload`, serializes as JSON inside a `text/plain`
 * Blob, and sends via `navigator.sendBeacon()`. Falls back to `fetch()`
 * with `keepalive: true` when sendBeacon is unavailable.
 *
 * In dev mode, clears the queue without sending (prevents unbounded growth
 * while avoiding noise in development).
 *
 * @returns {Result<Void>} Always succeeds (fire-and-forget)
 *
 * @example
 * ```typescript
 * flushVitals(); // Sends all queued metrics and clears the queue
 * ```
 */
export function flushVitals(): Result<Void> {
  if (queue.length === 0) {
    return okUnchecked<Void>(undefined);
  }

  const metrics: VitalsMetric[] = [...queue];
  queue = [];

  if (import.meta.env.DEV) {
    log.debug(`[perf] Skipped beacon in dev mode (${String(metrics.length)} metrics)`);
    return okUnchecked<Void>(undefined);
  }

  const defaultDevice: VitalsDevice = {
    isLowEndDevice: false,
    isLowEndExperience: false,
    deviceMemory: 0,
    hardwareConcurrency: 0,
    effectiveType: '',
    saveData: false,
  };

  const payload: VitalsBeaconPayload = {
    sessionId: sessionId as Uuid, // cast safe: sessionId set via crypto.randomUUID()
    url: (typeof window === 'undefined' ? '/' : window.location.pathname) as RelativeUrl, // cast safe: pathname is a valid relative URL path
    timestamp: new Date().toISOString() as IsoTimestamp, // cast safe: toISOString always returns valid ISO 8601
    metrics,
    device: device ?? defaultDevice,
  };

  try {
    const jsonResult: Result<Str> = safeStringify(payload);

    if (!jsonResult.ok) {
      return jsonResult;
    }

    const json: Str = jsonResult.data;
    // text/plain avoids CORS preflight — sendBeacon only allows simple content types
    const blob: Blob = new Blob([json], { type: 'text/plain' });

    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(BEACON_URL, blob);
    } else if (typeof fetch === 'function') {
      /* fire-and-forget — response is intentionally not awaited; errors are non-critical */
      (async (): Promise<Void> => {
        try {
          await fetch(BEACON_URL, {
            method: 'POST',
            body: blob,
            keepalive: true,
          });
        } catch {
          /* network error during page-unload beacon — non-critical, drop silently */
        }
      })();
    }
  } catch {
    /* sendBeacon/fetch threw (e.g. payload too large) — non-critical, drop silently */
  }

  lastFlushAt = new Date().toISOString();

  return okUnchecked<Void>(undefined);
}

/**
 * Registers a `visibilitychange` listener to auto-flush on page hide.
 *
 * When the user navigates away or switches tabs, any queued metrics are
 * flushed immediately. `sendBeacon` is designed for exactly this use case
 * and survives page unload.
 *
 * Call once during client initialization (e.g. in `hooks.client.ts`).
 *
 * @returns {Result<Void>} Always succeeds
 *
 * @example
 * ```typescript
 * setupVitalsBeacon(); // Registers visibilitychange → flushVitals
 * ```
 */
export function setupVitalsBeacon(): Result<Void> {
  document.addEventListener('visibilitychange', (): Void => {
    if (document.visibilityState === 'hidden') {
      flushVitals();
    }
  });

  return okUnchecked<Void>(undefined);
}

/**
 * Stores device context for inclusion in future beacon payloads.
 *
 * Called once after Perfume.js reports `navigatorInformation` to capture
 * the device and network context at page load.
 *
 * @param {VitalsDevice} info - Device and network context from Perfume.js
 * @returns {Result<Void>} Always succeeds
 *
 * @example
 * ```typescript
 * setDeviceInfo({
 *   isLowEndDevice: false,
 *   isLowEndExperience: false,
 *   deviceMemory: 8,
 *   hardwareConcurrency: 8,
 *   effectiveType: '4g',
 *   saveData: false,
 * });
 * ```
 */
export function setDeviceInfo(info: VitalsDevice): Result<Void> {
  const infoResult: Result<VitalsDevice> = safeParse(VitalsDeviceSchema, info);

  if (!infoResult.ok) {
    return infoResult;
  }

  device = infoResult.data;
  return okUnchecked<Void>(undefined);
}

/**
 * Returns the current beacon status for diagnostic display.
 *
 * Used by the dev toolbar performance panel to show queue depth
 * and session info.
 *
 * @returns {Result<BeaconStatus>} Current queue depth, last flush time, and session identifier
 *
 * @example
 * ```typescript
 * const status = getBeaconStatus();
 * console.log(`${status.queued} metrics queued, session: ${status.sessionId}`);
 * ```
 */
export function getBeaconStatus(): Result<BeaconStatus> {
  return ok(BeaconStatusSchema, {
    queued: queue.length,
    queuedItems: queue.map(
      (m: VitalsMetric): BeaconQueuedItem => ({
        name: m.name,
        value: m.value,
        rating: m.rating,
      }),
    ),
    lastFlushAt,
    sessionId,
    maxQueueSize: MAX_QUEUE_SIZE,
  });
}

/**
 * Resets all beacon state for test isolation.
 *
 * Clears the queue, device info, session ID, and last flush timestamp.
 * Generates a new session UUID via `crypto.randomUUID()`.
 *
 * @returns {Result<Void>} Always succeeds
 *
 * @example
 * ```typescript
 * resetBeacon();
 * ```
 */
export function resetBeacon(): Result<Void> {
  queue = [];
  device = null;
  sessionId = crypto.randomUUID();
  lastFlushAt = null;
  return okUnchecked<Void>(undefined);
}
