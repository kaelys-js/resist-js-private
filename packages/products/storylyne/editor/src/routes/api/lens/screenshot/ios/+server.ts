/**
 * iOS Simulator Screenshot API — Real Safari Rendering
 *
 * Server endpoint that uses the iOS Simulator to render components in
 * real Safari with actual device hardware emulation. Boots a simulator
 * (or reuses a pre-booted one from the pool), navigates Safari to the
 * `/isolate/[name]` route, waits for render, and captures a screenshot
 * with proper device mask (notch/Dynamic Island).
 *
 * Returns the same JSON response shape as the Playwright screenshot API
 * so the existing `ScreenshotCapture` type works with both engines.
 *
 * Features:
 * - Real Safari rendering (not Playwright's patched WebKit)
 * - Accurate `env(safe-area-inset-*)` values
 * - Device mask rendering (notch, Dynamic Island, home indicator)
 * - Pre-booted simulator pool for fast captures (~3s vs ~30s cold start)
 * - iOS accessibility settings (dark mode, content size, contrast, etc.)
 * - Console capture via ios-webkit-debug-proxy (optional)
 * - Smart page-load detection via `[data-lens-ready]` attribute
 * - Dev-only — returns 404 in production builds
 *
 * @module
 */

import type { RequestHandler } from './$types';
import type { Str } from '@/schemas/common';
import { dev } from '$app/environment';
import {
  applyAccessibilitySettings,
  parseAccessibilityParams,
} from '$lib/server/simulator/ios-accessibility';
import {
  type CapturedConsoleMessage,
  captureConsoleLogs,
  formatConsoleMessages,
} from '$lib/server/simulator/ios-console-capture';
import {
  getInspectablePages,
  isDebugProxyInstalled,
  startDebugProxy,
  type InspectablePage,
} from '$lib/server/simulator/ios-debug-proxy';
import { waitForPageLoad } from '$lib/server/simulator/ios-page-load';
import { acquireSimulator, releaseSimulator } from '$lib/server/simulator/ios-pool';
import { captureSimulatorScreenshot } from '$lib/server/simulator/ios-screenshot';
import { isXcrunAvailable, listSimulatorDevices } from '$lib/server/simulator/ios-simctl';
import { openUrlInSimulator } from '$lib/server/simulator/ios-navigate';
import { getStaticSafeAreaInsets, type SafeAreaInsets } from '$lib/server/simulator/ios-safe-area';
import { findDeviceFrameByName, type DeviceFrame } from '$lib/server/simulator/device-frames';

// =============================================================================
// GET handler
// =============================================================================

/**
 * GET handler — renders a component in the iOS Simulator's Safari and
 * returns JSON with base64 screenshot.
 *
 * Query params:
 * - `component` (required) — component directory name (e.g., 'button')
 * - `device` — simulator device name (e.g., 'iPhone 17 Pro'); defaults to first available
 * - `s` — base64 JSON card styles (pass-through to isolate route)
 * - `variant` + `option` — variant overrides (pass-through to isolate route)
 * - `appearance` — 'light' or 'dark' (iOS accessibility)
 * - `contentSize` — Dynamic Type content size category
 * - `reduceMotion` — 'true' to enable Reduce Motion
 * - `increaseContrast` — 'true' to enable Increase Contrast
 * - `reduceTransparency` — 'true' to enable Reduce Transparency
 *
 * @param root0 - SvelteKit request event
 * @param root0.url - Request URL with query parameters
 * @returns JSON with image, browser, device, consoleLogs, performance (200) or error (400/404/500)
 */
export const GET: RequestHandler = async ({ url }) => {
  if (!dev) {
    return new Response('iOS Screenshot API is dev-only', { status: 404 });
  }

  /* ---- Check xcrun availability ---- */

  const xcrunOk: boolean = await isXcrunAvailable();

  if (!xcrunOk) {
    return new Response(
      JSON.stringify({
        error: 'Xcode CLI tools not available. Install Xcode and run: xcode-select --install',
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

  const requestedDevice: Str = (url.searchParams.get('device') ?? '') as Str;

  /* Pass-through params for isolate route */
  const cardStylesParam: Str = (url.searchParams.get('s') ?? '') as Str;
  const variant: Str = (url.searchParams.get('variant') ?? '') as Str;
  const option: Str = (url.searchParams.get('option') ?? '') as Str;

  /* Parse accessibility settings from query params */
  const accessibilitySettings = parseAccessibilityParams(url.searchParams);

  /* ---- Find the target device ---- */

  const allDevices = await listSimulatorDevices();

  if (allDevices.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No iOS Simulator devices available. Create one in Xcode.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  /* Match requested device by name, or use first available */
  const targetDevice = requestedDevice
    ? allDevices.find((d) => d.name === requestedDevice)
    : allDevices[0];

  if (!targetDevice) {
    return new Response(
      JSON.stringify({ error: `Unknown iOS Simulator device "${requestedDevice}"` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  /* ---- Build isolate URL ---- */

  const isolateUrl: URL = new URL(`/isolate/${component}`, url.origin);
  isolateUrl.searchParams.set('screenshot', '1');
  if (cardStylesParam) {
    isolateUrl.searchParams.set('s', cardStylesParam);
  }
  if (variant) {
    isolateUrl.searchParams.set('variant', variant);
  }
  if (option) {
    isolateUrl.searchParams.set('option', option);
  }

  /* ---- Acquire simulator, navigate, capture ---- */

  try {
    const sim = await acquireSimulator(targetDevice.udid, targetDevice.name);

    try {
      /* Apply accessibility settings (best-effort — continues on failure) */
      await applyAccessibilitySettings(sim.udid, accessibilitySettings);

      /* Start debug proxy if available (optional — falls back to fixed delay) */
      const debugProxyAvailable: boolean = await isDebugProxyInstalled();

      if (debugProxyAvailable) {
        await startDebugProxy(sim.udid);
      }

      /* Open the isolate URL in Safari */
      await openUrlInSimulator(sim.udid, isolateUrl.toString() as Str);

      /* Find the inspectable page for our URL (if debug proxy is running) */
      let pageWsUrl: Str = '' as Str;

      if (debugProxyAvailable) {
        const pages: InspectablePage[] = await getInspectablePages();
        const isolatePage: InspectablePage | undefined = pages.find((p: InspectablePage): boolean =>
          (p.url as string).includes('/isolate/'),
        );

        if (isolatePage) {
          pageWsUrl = isolatePage.webSocketDebuggerUrl;
        }
      }

      /* Wait for page load — uses debug proxy polling or falls back to 3s delay */
      await waitForPageLoad(pageWsUrl);

      /* Capture console logs (if debug proxy is available and we have a WS URL) */
      let consoleLogs: CapturedConsoleMessage[] = [];

      if (pageWsUrl) {
        consoleLogs = await captureConsoleLogs(pageWsUrl);
      }

      /* Capture screenshot with device mask */
      const pngBuffer: Buffer = await captureSimulatorScreenshot(sim.udid);
      const imageBase64: Str = pngBuffer.toString('base64') as Str;

      /* Look up safe area insets for this device model */
      const safeAreaInsets: SafeAreaInsets | null = getStaticSafeAreaInsets(targetDevice.name);

      /* Look up a matching device frame bezel */
      const deviceFrame: DeviceFrame | null = findDeviceFrameByName(targetDevice.name);

      /* Build response JSON — same shape as Playwright screenshot API */
      const responseBody: Record<Str, unknown> = {
        image: imageBase64,
        source: 'ios-simulator',
        browser: 'safari',
        browserDisplayName: 'Safari',
        browserVersion: targetDevice.runtimeVersion,
        device: targetDevice.name,
        deviceOS: targetDevice.runtimeVersion,
        consoleLogs: formatConsoleMessages(consoleLogs),
        performance: {},
        debugProxyAvailable,
        ...(safeAreaInsets ? { safeAreaInsets } : {}),
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
      releaseSimulator(sim.udid);
    }
  } catch (error: unknown) {
    const message: Str = (
      error instanceof Error ? error.message : 'iOS Simulator screenshot failed'
    ) as Str;

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
