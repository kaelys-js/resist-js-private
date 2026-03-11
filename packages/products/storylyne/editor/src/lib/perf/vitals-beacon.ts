/**
 * Vitals Beacon Client
 *
 * Queues Web Vitals metrics and flushes them to `/api/vitals` via
 * `navigator.sendBeacon()`. Beacons fire on `visibilitychange → hidden`
 * (page unload/tab switch) and on queue overflow (MAX_QUEUE_SIZE = 10).
 *
 * Uses `text/plain` content type to avoid CORS preflight requests
 * (sendBeacon limitation — only `text/plain`, `application/x-www-form-urlencoded`,
 * and `multipart/form-data` are allowed without preflight).
 *
 * Falls back to `fetch()` with `keepalive: true` when sendBeacon is
 * unavailable. Skips beaconing in dev mode but still clears the queue
 * to prevent unbounded memory growth.
 *
 * @module
 */

import { dev } from '$app/environment';
import type { Str, Num, Void } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';
import { log } from '@/utils/core/logger';
import type { VitalsMetric, VitalsDevice, VitalsBeaconPayload } from './vitals-payload';

// ── Constants ────────────────────────────────────────────────────────────────

/** Beacon endpoint path (same-origin, no CORS issues). */
const BEACON_URL: Str = '/api/vitals';

/** Maximum metrics to queue before auto-flushing. */
const MAX_QUEUE_SIZE: Num = 10;

// ── Module State ─────────────────────────────────────────────────────────────

/** Queued metrics awaiting flush. */
let queue: VitalsMetric[] = [];

/** Device context snapshot for payloads. */
let device: VitalsDevice | null = null;

/** Stable session identifier (random UUID per page load, not persisted). */
let sessionId: Str = crypto.randomUUID();

/** ISO timestamp of last successful flush, or null if never flushed. */
let lastFlushAt: Str | null = null;

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Adds a metric to the internal queue.
 *
 * Auto-flushes when the queue reaches `MAX_QUEUE_SIZE` (10) to prevent
 * unbounded memory growth.
 *
 * @param metric - The vitals metric to queue
 * @returns `Result<Void>` — always succeeds
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
  queue.push(metric);

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
 * @returns `Result<Void>` — always succeeds (fire-and-forget)
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

  if (dev) {
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
    sessionId,
    url: typeof window === 'undefined' ? '/' : window.location.pathname,
    timestamp: new Date().toISOString(),
    metrics,
    device: device ?? defaultDevice,
  };

  try {
    const json: Str = JSON.stringify(payload);
    // text/plain avoids CORS preflight — sendBeacon only allows simple content types
    const blob: Blob = new Blob([json], { type: 'text/plain' });

    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(BEACON_URL, blob);
    } else if (typeof fetch === 'function') {
      /* fire-and-forget — response is intentionally not awaited */
      fetch(BEACON_URL, {
        method: 'POST',
        body: blob,
        keepalive: true,
      });
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
 * @returns `Result<Void>` — always succeeds
 *
 * @example
 * ```typescript
 * setupVitalsBeacon(); // Registers visibilitychange → flushVitals
 * ```
 */
export function setupVitalsBeacon(): Result<Void> {
  document.addEventListener('visibilitychange', () => {
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
 * @param info - Device and network context from Perfume.js
 * @returns `Result<Void>` — always succeeds
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
  device = info;
  return okUnchecked<Void>(undefined);
}

/**
 * Returns the current beacon status for diagnostic display.
 *
 * Used by the dev toolbar performance panel to show queue depth
 * and session info.
 *
 * @returns Current queue depth, last flush time, and session identifier
 *
 * @example
 * ```typescript
 * const status = getBeaconStatus();
 * console.log(`${status.queued} metrics queued, session: ${status.sessionId}`);
 * ```
 */
export function getBeaconStatus(): {
  queued: Num;
  queuedItems: Array<{ name: Str; value: Num; rating: Str }>;
  lastFlushAt: Str | null;
  sessionId: Str;
  maxQueueSize: Num;
} {
  return {
    queued: queue.length,
    queuedItems: queue.map((m) => ({ name: m.name, value: m.value, rating: m.rating })),
    lastFlushAt,
    sessionId,
    maxQueueSize: MAX_QUEUE_SIZE,
  };
}

/**
 * Resets all beacon state for test isolation.
 *
 * Clears the queue, device info, session ID, and last flush timestamp.
 * Generates a new session UUID via `crypto.randomUUID()`.
 */
export function resetBeacon(): void {
  queue = [];
  device = null;
  sessionId = crypto.randomUUID();
  lastFlushAt = null;
}
