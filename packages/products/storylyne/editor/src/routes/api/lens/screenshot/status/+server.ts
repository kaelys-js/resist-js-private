/**
 * Combined Backend Status API
 *
 * Returns availability status for all three screenshot engines:
 * Playwright, iOS Simulator, and Android Emulator. Used by the
 * UI to show status indicators and enable/disable source options.
 *
 * Dev-only — returns 404 in production builds.
 *
 * @module
 */

import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { checkAndroidSdk } from '$lib/server/simulator/android-sdk';
import { isXcrunAvailable } from '$lib/server/simulator/ios-simctl';

// =============================================================================
// GET handler
// =============================================================================

/**
 * GET handler — returns combined status for all screenshot engines.
 *
 * @returns JSON with availability status for each engine (200) or 404 in production
 */
export const GET: RequestHandler = async () => {
  if (!dev) {
    return new Response('Status API is dev-only', { status: 404 });
  }

  /* Check all engines in parallel */
  const [xcrunAvailable, androidSdk] = await Promise.all([isXcrunAvailable(), checkAndroidSdk()]);

  return new Response(
    JSON.stringify({
      playwright: {
        available: true,
        label: 'Playwright',
      },
      iosSimulator: {
        available: xcrunAvailable,
        label: 'iOS Simulator',
        reason: xcrunAvailable ? '' : 'Xcode CLI tools not installed',
      },
      androidEmulator: {
        available: androidSdk.installed,
        label: 'Android Emulator',
        reason: androidSdk.installed ? '' : androidSdk.instructions,
        adbVersion: androidSdk.adbVersion,
      },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    },
  );
};
