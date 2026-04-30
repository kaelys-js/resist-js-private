/**
 * Android AVD Creation API — Create New Virtual Devices
 *
 * Accepts a POST request with a hardware device ID and creates a new
 * Android Virtual Device (AVD) using the first available system image.
 * Returns the created AVD name on success.
 *
 * Dev-only — returns 404 in production builds.
 *
 * @module
 */

import type { RequestHandler } from './$types';
import type { Str } from '@/schemas/common';
import { dev } from '$app/environment';
import { createAvd, listSystemImages } from '$lib/server/simulator/android-devices';
import { checkAndroidSdk } from '$lib/server/simulator/android-sdk';

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

/**
 * POST handler — creates a new AVD from a hardware device profile.
 *
 * Request body: `{ deviceId: string }`
 *
 * @param root0 - SvelteKit request event
 * @param root0.request - The incoming POST request with JSON body
 * @returns JSON with created AVD name (200) or error (400/404/500)
 */
export const POST: RequestHandler = async ({ request }) => {
  if (!dev) {
    return new Response('Android AVD Creation API is dev-only', { status: 404 });
  }

  /* Parse request body */
  let body: { deviceId?: string };

  try {
    body = (await request.json()) as { deviceId?: string };
  } catch {
    /* Invalid JSON body */
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const deviceId: Str = (body.deviceId ?? '') as Str;

  if (!(deviceId as string)) {
    return new Response(JSON.stringify({ error: 'deviceId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /* Check Android SDK availability */
  const sdkStatus = await checkAndroidSdk();

  if (!sdkStatus.installed) {
    return new Response(JSON.stringify({ error: sdkStatus.instructions }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /* Find available system image */
  const systemImages: Str[] = await listSystemImages(sdkStatus.paths.avdmanager);

  if (systemImages.length === 0) {
    return new Response(
      JSON.stringify({
        error:
          'No system images installed. Run: sdkmanager "system-images;android-35;google_apis;arm64-v8a"',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  /* Use the first available system image */
  const systemImage: Str = systemImages[0] as Str;

  /* Create the AVD */
  try {
    const avdName: Str = await createAvd(sdkStatus.paths.avdmanager, deviceId, systemImage);

    return new Response(JSON.stringify({ name: avdName, deviceId }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message: Str = (error instanceof Error ? error.message : 'Failed to create AVD') as Str;

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
