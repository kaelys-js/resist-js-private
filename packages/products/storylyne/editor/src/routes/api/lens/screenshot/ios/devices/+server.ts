/**
 * iOS Simulator Devices API — Available Simulator Device Profiles
 *
 * Returns all available iOS Simulator devices with their UDID, name,
 * boot state, screen dimensions, scale factor, and iOS version.
 * Results are cached for the server lifecycle.
 *
 * Dev-only — returns 404 in production builds.
 *
 * @module
 */

import type { RequestHandler } from './$types';
import type { Num, Str } from '@/schemas/common';
import { dev } from '$app/environment';
import {
  isXcrunAvailable,
  listSimulatorDevices,
  type SimulatorDevice,
} from '$lib/server/simulator/ios-simctl';

/* ------------------------------------------------------------------ */
/*  Cache                                                              */
/* ------------------------------------------------------------------ */

/** Cached device list with expiry timestamp. */
let deviceCache: { devices: SimulatorDevice[]; expiresAt: Num } | null = null;

/** Cache duration in ms (30 seconds — boot state changes frequently). */
const CACHE_TTL_MS: Num = 30_000 as Num;

/* ------------------------------------------------------------------ */
/*  GET handler                                                        */
/* ------------------------------------------------------------------ */

/**
 * GET handler — returns all available iOS Simulator devices.
 *
 * @returns JSON array of simulator device descriptors (200) or error (404/500)
 */
export const GET: RequestHandler = async () => {
  if (!dev) {
    return new Response('iOS Devices API is dev-only', { status: 404 });
  }

  /* Check xcrun availability */
  const xcrunOk: boolean = await isXcrunAvailable();
  if (!xcrunOk) {
    return new Response(
      JSON.stringify({
        available: false,
        error: 'Xcode CLI tools not available',
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
    const devices: SimulatorDevice[] = await listSimulatorDevices();
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
      error instanceof Error ? error.message : 'Failed to list simulator devices'
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
