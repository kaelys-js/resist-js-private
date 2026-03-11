/**
 * Android Emulator Screenshot API — Real Chrome Mobile Rendering
 *
 * Server endpoint that uses the Android Emulator to render components in
 * real Chrome Mobile with actual device hardware emulation. Boots an
 * emulator (or reuses a pre-booted one from the pool), opens Chrome via
 * `am start`, waits for render, and captures a screenshot via `screencap`.
 *
 * Returns the same JSON response shape as the Playwright and iOS screenshot
 * APIs so the existing `ScreenshotCapture` type works with all three engines.
 *
 * Features:
 * - Real Chrome Mobile rendering (not Playwright's Chromium)
 * - Pre-booted emulator pool for fast captures
 * - Dev-only — returns 404 in production builds
 *
 * @module
 */

import type { RequestHandler } from './$types';
import type { Num, Str } from '@/schemas/common';
import { dev } from '$app/environment';
import {
  applyAccessibilitySettings,
  parseAccessibilityParams,
} from '$lib/server/simulator/android-accessibility';
import {
  type CdpConsoleEntry,
  captureConsoleLogs,
  setupCdpForward,
} from '$lib/server/simulator/android-cdp';
import { waitForPageLoad } from '$lib/server/simulator/android-page-load';
import { acquireEmulator, releaseEmulator } from '$lib/server/simulator/android-pool';
import { captureEmulatorScreenshot } from '$lib/server/simulator/android-screenshot';
import { checkAndroidSdk } from '$lib/server/simulator/android-sdk';
import { openUrlInEmulator, setupPortForward } from '$lib/server/simulator/android-navigate';
import { findDeviceFrameByName, type DeviceFrame } from '$lib/server/simulator/device-frames';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Default AVD name when none is specified. */
const DEFAULT_AVD: Str = 'Medium_Phone_API_35' as Str;

/* ------------------------------------------------------------------ */
/*  GET handler                                                        */
/* ------------------------------------------------------------------ */

/**
 * GET handler — renders a component in the Android Emulator's Chrome and
 * returns JSON with base64 screenshot.
 *
 * Query params:
 * - `component` (required) — component directory name (e.g., 'button')
 * - `avd` — AVD name (defaults to Medium_Phone_API_35)
 * - `s` — base64 JSON card styles (pass-through to isolate route)
 * - `variant` + `option` — variant overrides (pass-through to isolate route)
 * - `nightMode` — 'yes' or 'no' for dark mode
 *
 * @param root0 - SvelteKit request event
 * @param root0.url - Request URL with query parameters
 * @returns JSON with image, browser, device, consoleLogs, performance (200) or error (400/404/500)
 */
export const GET: RequestHandler = async ({ url }) => {
  if (!dev) {
    return new Response('Android Screenshot API is dev-only', { status: 404 });
  }

  /* ---- Check Android SDK availability ---- */

  const sdkStatus = await checkAndroidSdk();
  if (!sdkStatus.installed) {
    return new Response(
      JSON.stringify({
        error: sdkStatus.instructions,
        installed: false,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  /* ---- Parse & validate params ---- */

  const component: Str = (url.searchParams.get('component') ?? '') as Str;
  if (!component) {
    return new Response(JSON.stringify({ error: 'Missing required "component" parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const avdName: Str = (url.searchParams.get('avd') || DEFAULT_AVD) as Str;

  /* Pass-through params for isolate route */
  const cardStylesParam: Str = (url.searchParams.get('s') ?? '') as Str;
  const variant: Str = (url.searchParams.get('variant') ?? '') as Str;
  const option: Str = (url.searchParams.get('option') ?? '') as Str;

  /* Parse accessibility settings from query params */
  const accessibilitySettings = parseAccessibilityParams(url.searchParams);

  /* ---- Build isolate URL ---- */

  const isolateUrl: URL = new URL(`/isolate/${component}`, url.origin);
  if (cardStylesParam) isolateUrl.searchParams.set('s', cardStylesParam);
  if (variant) isolateUrl.searchParams.set('variant', variant);
  if (option) isolateUrl.searchParams.set('option', option);

  /* ---- Acquire emulator, navigate, capture ---- */

  try {
    const instance = await acquireEmulator(sdkStatus.paths.emulator, sdkStatus.paths.adb, avdName);

    if (!instance) {
      return new Response(
        JSON.stringify({ error: `Failed to boot Android emulator with AVD "${avdName}"` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    try {
      /* Apply accessibility settings (best-effort) */
      await applyAccessibilitySettings(sdkStatus.paths.adb, instance.serial, accessibilitySettings);

      /* Set up port forwarding so emulator can reach host dev server */
      const port: Num = Number.parseInt(url.port || '3100', 10) as Num;
      await setupPortForward(sdkStatus.paths.adb, instance.serial, port, port);

      /* Set up CDP forwarding for page-load detection + console capture */
      let cdpWsUrl: Str = '' as Str;
      try {
        await setupCdpForward(sdkStatus.paths.adb, instance.serial);
        /* Fetch CDP target page WebSocket URL */
        const cdpResponse: Response = await fetch('http://localhost:9222/json');
        const cdpTargets: unknown[] = (await cdpResponse.json()) as unknown[];
        const cdpPage: Record<string, unknown> | undefined = (
          cdpTargets as Array<Record<string, unknown>>
        ).find((t: Record<string, unknown>): boolean => t.type === 'page');
        if (cdpPage?.webSocketDebuggerUrl) {
          cdpWsUrl = cdpPage.webSocketDebuggerUrl as Str;
        }
      } catch {
        /* CDP not available — will use fallback delay */
      }

      /* Open Chrome with the isolate URL */
      await openUrlInEmulator(sdkStatus.paths.adb, instance.serial, isolateUrl.toString() as Str);

      /* Wait for page load — uses CDP polling or falls back to 3s delay */
      await waitForPageLoad(cdpWsUrl);

      /* Capture console logs via CDP (if available) */
      let consoleLogs: CdpConsoleEntry[] = [];
      if (cdpWsUrl) {
        consoleLogs = await captureConsoleLogs();
      }

      /* Capture screenshot */
      const imageBase64: Str = await captureEmulatorScreenshot(
        sdkStatus.paths.adb,
        instance.serial,
      );

      /* Look up a matching device frame bezel */
      const deviceFrame: DeviceFrame | null = findDeviceFrameByName(avdName);

      /* Build response JSON */
      const responseBody: Record<Str, unknown> = {
        image: imageBase64,
        source: 'android-emulator',
        browser: 'chrome-mobile',
        browserDisplayName: 'Chrome Mobile',
        browserVersion: '',
        device: avdName,
        deviceOS: '',
        consoleLogs: consoleLogs.map((entry: CdpConsoleEntry) => ({
          level: entry.level,
          message: entry.text,
          source: entry.source,
        })),
        performance: {},
        ...(deviceFrame
          ? {
              deviceFrame: {
                frameId: deviceFrame.framePath,
                screenRegion: deviceFrame.screenRegion,
              },
            }
          : {}),
      };

      return new Response(JSON.stringify(responseBody), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
    } finally {
      releaseEmulator(avdName);
    }
  } catch (error: unknown) {
    const message: Str = (
      error instanceof Error ? error.message : 'Android Emulator screenshot failed'
    ) as Str;
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
