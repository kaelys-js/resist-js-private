/**
 * Android Emulator Devices API — Available AVD & Hardware Profiles
 *
 * Returns all available Android device profiles: existing AVDs (created: true)
 * and uncreated hardware profiles from the SDK (created: false). Uncreated
 * profiles can be turned into AVDs via the create endpoint.
 *
 * Dev-only — returns 404 in production builds.
 *
 * @module
 */

import type { RequestHandler } from './$types';
import type { Num, Str } from '@/schemas/common';
import { dev } from '$app/environment';
import {
  type AndroidDevice,
  getAndroidDeviceProfiles,
  listSystemImages,
} from '$lib/server/simulator/android-devices';
import { checkAndroidSdk } from '$lib/server/simulator/android-sdk';

// =============================================================================
// Cache
// =============================================================================

/** Cached device list with expiry timestamp. */
let deviceCache: { devices: AndroidDevice[]; systemImages: Str[]; expiresAt: Num } | null = null;

/** Cache duration in ms (30 seconds — shorter to pick up newly created AVDs). */
const CACHE_TTL_MS: Num = 30_000 as Num;

// =============================================================================
// GET handler
// =============================================================================

/**
 * GET handler — returns all Android device profiles (created + uncreated).
 *
 * @returns JSON with available status, device array, and system images (200) or error (404/500)
 */
export const GET: RequestHandler = async () => {
  if (!dev) {
    return new Response('Android Devices API is dev-only', { status: 404 });
  }

  /* Check Android SDK availability */
  const sdkStatus = await checkAndroidSdk();

  if (!sdkStatus.installed) {
    return new Response(
      JSON.stringify({
        available: false,
        error: sdkStatus.instructions,
        devices: [],
        systemImages: [],
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      },
    );
  }

  /* Return cached result if fresh */
  if (deviceCache && Date.now() < deviceCache.expiresAt) {
    return new Response(
      JSON.stringify({
        available: true,
        devices: deviceCache.devices,
        systemImages: deviceCache.systemImages,
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      },
    );
  }

  /* Fetch fresh device list + system images */
  try {
    const [devices, systemImages]: [AndroidDevice[], Str[]] = await Promise.all([
      getAndroidDeviceProfiles(sdkStatus.paths.emulator, sdkStatus.paths.avdmanager),
      listSystemImages(sdkStatus.paths.avdmanager),
    ]);

    deviceCache = {
      devices,
      systemImages,
      expiresAt: (Date.now() + CACHE_TTL_MS) as Num,
    };

    return new Response(
      JSON.stringify({
        available: true,
        devices,
        systemImages,
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      },
    );
  } catch (error: unknown) {
    const message: Str = (
      error instanceof Error ? error.message : 'Failed to list Android devices'
    ) as Str;

    return new Response(
      JSON.stringify({
        available: false,
        error: message,
        devices: [],
        systemImages: [],
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
