/**
 * Client Error Beacon Receiver
 *
 * POST endpoint that receives PII-stripped error payloads from client
 * `navigator.sendBeacon()` calls. Validates against `BeaconPayloadSchema`,
 * logs via `log.error()` (captured by Workers Logs), and returns 204.
 *
 * Security:
 * - Validates all payloads against strict Valibot schema (rejects unknown fields)
 * - Rejects payloads > 64KB to prevent abuse
 * - Returns 204 No Content (beacon ignores response body)
 * - PII was already stripped client-side by `formatErrorSafe`; schema enforces
 *   that `user`, `contexts`, `meta`, `original`, `serverName` are absent
 *
 * @module
 */

import type { RequestHandler } from './$types';
import type { Str, Num } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { log } from '@/utils/core/logger';
import { safeParse } from '@/utils/result/safe';
import { BeaconPayloadSchema, type BeaconPayload } from '$lib/errors/beacon-payload';

/** Maximum request body size in bytes (64KB). */
const MAX_BODY_SIZE: Num = 65_536 as Num;

/**
 * Receives and logs client error beacon payloads.
 *
 * @param root0 - SvelteKit request event
 * @param root0.request - The incoming request
 * @returns 204 on success, 400 on invalid payload, 413 on oversized body
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

  // Size check — reject oversized payloads
  if (body.length > MAX_BODY_SIZE) {
    return new Response(null, { status: 413 });
  }

  // Empty body guard
  if (body.length === 0) {
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

  // Validate against BeaconPayloadSchema (strict — rejects PII fields)
  const result: Result<BeaconPayload> = safeParse(BeaconPayloadSchema, parsed);
  if (!result.ok) {
    return new Response(null, { status: 400 });
  }

  const payload: BeaconPayload = result.data as BeaconPayload;

  // Log as structured JSON — Workers Logs captures console output automatically
  log.error(
    `[client-beacon] ${payload.error.code} (${payload.id}) fatal=${String(payload.fatal)} env=${payload.environment}`,
  );

  return new Response(null, { status: 204 });
};
