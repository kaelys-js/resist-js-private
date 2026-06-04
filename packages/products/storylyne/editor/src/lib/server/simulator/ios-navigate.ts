/**
 * iOS Simulator URL Navigation — `xcrun simctl openurl`
 *
 * Opens a URL in the booted iOS Simulator's default browser (Safari).
 * Validates URLs before navigating to prevent command injection.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// =============================================================================
// Public API
// =============================================================================

/**
 * Open a URL in a booted iOS Simulator's Safari browser.
 *
 * The device must be booted before calling this function.
 * Uses `xcrun simctl openurl <udid> <url>` which launches Safari
 * with the given URL in the specified simulator.
 *
 * @param {Str} udid - Device UDID (must be booted)
 * @param {Str} url - URL to open (must be http:// or https://)
 * @throws If the URL is invalid or the device is not booted
 *
 * @example
 * await openUrlInSimulator('B33CE7D0-...', 'http://localhost:5173/isolate/button');
 */
export async function openUrlInSimulator(udid: Str, url: Str): Promise<void> {
  /* Validate URL to prevent command injection */
  validateUrl(url);

  await execFileAsync('xcrun', ['simctl', 'openurl', udid, url]);
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate that a URL is safe for `openurl`.
 *
 * Only allows http:// and https:// URLs. Rejects other schemes,
 * empty strings, and potentially dangerous input.
 *
 * @param url - URL to validate
 * @throws If the URL is not http:// or https://
 */
function validateUrl(url: Str): void {
  if (!url) {
    throw new Error('URL is required');
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`URL must use http:// or https:// protocol, got: ${parsed.protocol}`);
  }
}
