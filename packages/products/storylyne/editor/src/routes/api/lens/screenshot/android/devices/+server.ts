/**
 * Android Emulator Devices API — Available AVD Profiles
 *
 * Returns all available Android Virtual Devices (AVDs) with their name,
 * dimensions, density, API level, and display tag. Results are cached
 * for the server lifecycle.
 *
 * Dev-only — returns 404 in production builds.
 *
 * @module
 */

import type { RequestHandler } from './$types';
import type { Num, Str } from '@/schemas/common';
import { dev } from '$app/environment';
import { type AndroidDevice, getAndroidDevices } from '$lib/server/simulator/android-devices';
import { checkAndroidSdk } from '$lib/server/simulator/android-sdk';

/* ------------------------------------------------------------------ */
/*  Cache                                                              */
/* ------------------------------------------------------------------ */

/** Cached device list with expiry timestamp. */
let deviceCache: { devices: AndroidDevice[]; expiresAt: Num } | null = null;

/** Cache duration in ms (60 seconds — AVD list changes rarely). */
const CACHE_TTL_MS: Num = 60_000 as Num;

/* ------------------------------------------------------------------ */
/*  GET handler                                                        */
/* ------------------------------------------------------------------ */

/**
 * GET handler — returns all available Android Emulator AVD profiles.
 *
 * @returns JSON with available status and device array (200) or error (404/500)
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
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      },
    );
  }

  /* Fetch fresh device list */
  try {
    const devices: AndroidDevice[] = await getAndroidDevices(sdkStatus.paths.emulator);
    deviceCache = {
      devices,
      expiresAt: (Date.now() + CACHE_TTL_MS) as Num,
    };

    return new Response(
      JSON.stringify({
        available: true,
        devices,
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
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
