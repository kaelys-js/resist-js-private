/**
 * Vitals Beacon Receiver
 *
 * POST endpoint that receives Web Vitals payloads from client
 * `navigator.sendBeacon()` calls. Validates against `VitalsBeaconPayloadSchema`,
 * logs via `log.info()` (captured by Workers Logs), and returns 204.
 *
 * Security:
 * - Validates all payloads against strict Valibot schema (rejects unknown fields)
 * - Rejects payloads > 64KB to prevent abuse
 * - Returns 204 No Content (beacon ignores response body)
 * - PII was already stripped client-side (no query params, no user identifiers)
 *
 * @module
 */

import type { RequestHandler } from './$types';
import type { Str, Num } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { log } from '@/utils/core/logger';
import { safeParse } from '@/utils/result/safe';
import {
  VitalsBeaconPayloadSchema,
  type VitalsBeaconPayload,
  type VitalsMetric,
} from '@/utils/web-vitals/vitals-payload';

/** Maximum request body size in bytes (64KB). */
const MAX_BODY_SIZE: Num = 65_536 as Num;

/**
 * Formats a metric summary for structured logging.
 *
 * @param metric - The vitals metric to format
 * @returns Formatted string like "LCP=2450ms"
 */
function formatMetric(metric: VitalsMetric): Str {
  const TIMING_METRICS: Set<Str> = new Set(['TTFB', 'FCP', 'LCP', 'FID', 'INP', 'TBT', 'NTBT']);
  const isTiming: boolean = TIMING_METRICS.has(metric.name);
  const unit: Str = isTiming ? 'ms' : '';

  return `${metric.name}=${String(Math.round(metric.value))}${unit}` as Str;
}

/**
 * Receives and logs client vitals beacon payloads.
 *
 * @param root0 - SvelteKit request event
 * @param root0.request - The incoming request
 * @returns 204 on success, 400 on invalid payload
 */
export const POST: RequestHandler = async ({ request }) => {
  // Read body as text — sendBeacon sends text/plain
  let body: Str;

  try {
    body = (await request.text()) as Str;
  } catch {
    /* Body read failed — client likely disconnected */
    return new Response(null, { status: 400 });
  }

  // Empty body guard
  if (body.length === 0) {
    return new Response(null, { status: 400 });
  }

  // Size check — reject oversized payloads
  if (body.length > MAX_BODY_SIZE) {
    return new Response(null, { status: 400 });
  }

  // Parse JSON
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch {
    /* Malformed JSON */
    return new Response(null, { status: 400 });
  }

  // Validate against VitalsBeaconPayloadSchema (strict — rejects PII fields)
  const result: Result<VitalsBeaconPayload> = safeParse(VitalsBeaconPayloadSchema, parsed);

  if (!result.ok) {
    return new Response(null, { status: 400 });
  }

  const payload: VitalsBeaconPayload = result.data as VitalsBeaconPayload;

  // Log as structured JSON — Workers Logs captures console output automatically
  const metricsSummary: Str = payload.metrics.map(formatMetric).join(' ') as Str;
  const deviceLabel: Str = (payload.device.isLowEndDevice ? 'lowEnd' : 'normal') as Str;

  log.info(
    `[vitals] ${metricsSummary} url=${payload.url} device=${deviceLabel} session=${payload.sessionId}`,
  );

  return new Response(null, { status: 204 });
};
