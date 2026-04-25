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

import {
  IsoTimestampSchema,
  NameSchema,
  UuidSchema,
  RelativeUrlSchema,
  type NonNegativeInteger,
  type Num,
  type Str,
  type Uuid,
  type RelativeUrl,
  type IsoTimestamp,
} from '@/schemas/common';
import { ok, okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// ===
// Schemas

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
  name: NameSchema,
  /** Metric value in milliseconds (or unitless for CLS). */
  value: v.number(),
  /** Performance rating based on Web Vitals thresholds. */
  rating: v.picklist(['good', 'needsImprovement', 'poor']),
  /** How the user navigated to the page (e.g. 'navigate', 'reload', 'back_forward'). */
  navigationType: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
});

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
  effectiveType: v.pipe(v.string(), v.minLength(1), v.maxLength(10)),
  /** Whether user has data-saver enabled. */
  saveData: v.boolean(),
});

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
  sessionId: UuidSchema,
  /** Page URL path (no query params or hash — PII risk). */
  url: RelativeUrlSchema,
  /** ISO 8601 timestamp of beacon flush. */
  timestamp: IsoTimestampSchema,
  /** Array of collected metrics since last flush. */
  metrics: v.array(VitalsMetricSchema),
  /** Device and network context. */
  device: VitalsDeviceSchema,
});

// ===
// Types

/** Inferred type for a single vitals metric. {@link VitalsMetricSchema} */
export type VitalsMetric = v.InferOutput<typeof VitalsMetricSchema>;

/** Inferred type for device context. {@link VitalsDeviceSchema} */
export type VitalsDevice = v.InferOutput<typeof VitalsDeviceSchema>;

/** Inferred type for the full beacon payload. {@link VitalsBeaconPayloadSchema} */
export type VitalsBeaconPayload = v.InferOutput<typeof VitalsBeaconPayloadSchema>;

// ===
// API

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
function stripUrlParams(url: Str): Result<Str> {
  const questionIdx: Num = url.indexOf('?');
  const hashIdx: Num = url.indexOf('#');
  // cast safe: string .length is always >= 0
  let end: NonNegativeInteger = url.length as NonNegativeInteger;

  if (questionIdx >= 0) {
    end = Math.min(end, questionIdx) as NonNegativeInteger; // cast safe: min of non-negatives
  }
  if (hashIdx >= 0) {
    end = Math.min(end, hashIdx) as NonNegativeInteger; // cast safe: min of non-negatives
  }
  return okUnchecked<Str>(url.slice(0, end));
}

/**
 * Converts collected metrics and device info into a beacon-safe payload.
 *
 * Strips query params from URL, generates a session UUID, and adds
 * an ISO timestamp.
 *
 * @param {VitalsMetric[]} metrics - Array of collected vitals metrics
 * @param {VitalsDevice} device - Device and network context snapshot
 * @param {Str} url - Current page URL path (query params will be stripped)
 * @returns {Result<VitalsBeaconPayload>} The wire-safe payload
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
  const metricsResult: Result<VitalsMetric[]> = safeParse(v.array(VitalsMetricSchema), metrics);

  if (!metricsResult.ok) {
    return metricsResult;
  }

  const deviceResult: Result<VitalsDevice> = safeParse(VitalsDeviceSchema, device);

  if (!deviceResult.ok) {
    return deviceResult;
  }

  const urlResult: Result<Str> = safeParse(v.string(), url);

  if (!urlResult.ok) {
    return urlResult;
  }

  const strippedUrl: Result<Str> = stripUrlParams(url);

  if (!strippedUrl.ok) {
    return strippedUrl;
  }

  const sessionIdResult: Result<Uuid> = safeParse(UuidSchema, crypto.randomUUID());

  if (!sessionIdResult.ok) {
    return sessionIdResult;
  }

  const urlResult2: Result<RelativeUrl> = safeParse(RelativeUrlSchema, strippedUrl.data);

  if (!urlResult2.ok) {
    return urlResult2;
  }

  const timestampResult: Result<IsoTimestamp> = safeParse(
    IsoTimestampSchema,
    new Date().toISOString(),
  );

  if (!timestampResult.ok) {
    return timestampResult;
  }

  const payload: VitalsBeaconPayload = {
    sessionId: sessionIdResult.data,
    url: urlResult2.data,
    timestamp: timestampResult.data,
    metrics,
    device,
  };

  return ok(VitalsBeaconPayloadSchema, payload);
}
