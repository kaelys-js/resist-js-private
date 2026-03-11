/**
 * Vitals Beacon Payload Schema
 *
 * Wire format for Web Vitals beacon payloads sent to `/api/vitals`.
 * Validated on both client (before send) and server (on receive).
 *
 * PII safety:
 * - URL: path only (query params and hash stripped)
 * - Session ID: random UUID per page load (not persisted, not traceable)
 * - Device info: already coarsened by browser (deviceMemory rounded, etc.)
 * - No user identifiers, cookies, or IP addresses
 *
 * @module
 */

import * as v from 'valibot';
import type { Str } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';

// ── Schemas ─────────────────────────────────────────────────────────────────

/**
 * Schema for a single Web Vitals metric entry.
 *
 * @example
 * ```typescript
 * const metric: VitalsMetric = {
 *   name: 'LCP',
 *   value: 2450,
 *   rating: 'needsImprovement',
 *   navigationType: 'navigate',
 * };
 * ```
 */
export const VitalsMetricSchema = v.strictObject({
  /** Web Vital metric name (e.g. 'LCP', 'FCP', 'CLS'). */
  name: v.pipe(v.string(), v.minLength(1)),
  /** Metric value in milliseconds (or unitless for CLS). */
  value: v.number(),
  /** Performance rating based on Web Vitals thresholds. */
  rating: v.picklist(['good', 'needsImprovement', 'poor']),
  /** How the user navigated to the page (e.g. 'navigate', 'reload', 'back_forward'). */
  navigationType: v.string(),
});

/** Inferred type for a single vitals metric. */
export type VitalsMetric = v.InferOutput<typeof VitalsMetricSchema>;

/**
 * Schema for device and network context included in beacon payloads.
 *
 * All values are already coarsened by the browser and Perfume.js
 * (e.g. deviceMemory is rounded to powers of 2).
 */
export const VitalsDeviceSchema = v.strictObject({
  /** Whether Perfume.js considers this a low-end device. */
  isLowEndDevice: v.boolean(),
  /** Whether Perfume.js considers this a low-end experience (device + network). */
  isLowEndExperience: v.boolean(),
  /** Device RAM in GB (0 if unavailable). */
  deviceMemory: v.number(),
  /** Logical CPU core count. */
  hardwareConcurrency: v.number(),
  /** Network effective type at page load (e.g. '4g', '3g', '2g'). */
  effectiveType: v.string(),
  /** Whether user has data-saver enabled. */
  saveData: v.boolean(),
});

/** Inferred type for device context. */
export type VitalsDevice = v.InferOutput<typeof VitalsDeviceSchema>;

/**
 * Schema for the full vitals beacon payload.
 *
 * Uses `v.strictObject()` so any extra fields (potential PII injection)
 * cause validation failure on the server side.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 *
 * const result = safeParse(VitalsBeaconPayloadSchema, parsed);
 * if (!result.ok) return new Response(null, { status: 400 });
 * ```
 */
export const VitalsBeaconPayloadSchema = v.strictObject({
  /** Random session identifier (no PII — generated per page load, not persisted). */
  sessionId: v.pipe(v.string(), v.uuid()),
  /** Page URL path (no query params or hash — PII risk). */
  url: v.string(),
  /** ISO 8601 timestamp of beacon flush. */
  timestamp: v.pipe(v.string(), v.isoTimestamp()),
  /** Array of collected metrics since last flush. */
  metrics: v.array(VitalsMetricSchema),
  /** Device and network context. */
  device: VitalsDeviceSchema,
});

/** Inferred type for the full beacon payload. */
export type VitalsBeaconPayload = v.InferOutput<typeof VitalsBeaconPayloadSchema>;

// ── Conversion ──────────────────────────────────────────────────────────────

/**
 * Strips query parameters and hash from a URL path for PII safety.
 *
 * @param url - The URL path (may include query params and hash)
 * @returns The path-only portion of the URL
 *
 * @example
 * stripUrlParams('/scenes/1?token=secret#section')
 * // Returns: '/scenes/1'
 */
function stripUrlParams(url: Str): Str {
  const questionIdx: number = url.indexOf('?');
  const hashIdx: number = url.indexOf('#');
  let end: number = url.length;
  if (questionIdx >= 0) end = Math.min(end, questionIdx);
  if (hashIdx >= 0) end = Math.min(end, hashIdx);
  return url.slice(0, end);
}

/**
 * Converts collected metrics and device info into a beacon-safe payload.
 *
 * Strips query params from URL, generates a session UUID, and adds
 * an ISO timestamp.
 *
 * @param metrics - Array of collected vitals metrics
 * @param device - Device and network context snapshot
 * @param url - Current page URL path (query params will be stripped)
 * @returns `Result<VitalsBeaconPayload>` — the wire-safe payload
 *
 * @example
 * ```typescript
 * const result = toVitalsPayload(queue, deviceInfo, window.location.pathname);
 * if (result.ok) navigator.sendBeacon('/api/vitals', JSON.stringify(result.data));
 * ```
 */
export function toVitalsPayload(
  metrics: VitalsMetric[],
  device: VitalsDevice,
  url: Str,
): Result<VitalsBeaconPayload> {
  const payload: VitalsBeaconPayload = {
    sessionId: crypto.randomUUID(),
    url: stripUrlParams(url),
    timestamp: new Date().toISOString(),
    metrics,
    device,
  };

  return okUnchecked<VitalsBeaconPayload>(payload);
}
