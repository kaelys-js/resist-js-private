/**
 * Screenshot API — Playwright Real Browser Rendering
 *
 * Server endpoint that uses Playwright to render components in actual
 * browser engines (Chromium, Firefox, WebKit) with full device emulation.
 * Navigates a headless browser to the `/isolate/[name]` route, applies
 * all card styles and media emulation, takes a screenshot, and returns
 * the PNG buffer.
 *
 * Features:
 * - 3 browser engines: Chromium (Chrome/Edge), Firefox, WebKit (Safari)
 * - 100+ device profiles with accurate viewport, scale, and user agent
 * - Media emulation: colorScheme, reducedMotion, forcedColors
 * - Persistent browser instances (~50ms context creation per request)
 * - Dev-only — returns 404 in production builds
 *
 * @module
 */

import type { RequestHandler } from './$types';
import type { Num, Str } from '@/schemas/common';
import type { Browser, BrowserContext, BrowserType, Page } from 'playwright';
import { dev } from '$app/environment';

/* ------------------------------------------------------------------ */
/*  Browser engine management                                          */
/* ------------------------------------------------------------------ */

/** Valid browser engine identifiers. */
const VALID_ENGINES: Set<Str> = new Set(['chromium' as Str, 'firefox' as Str, 'webkit' as Str]);

/**
 * Persistent browser instances — one per engine, launched lazily.
 * Survives across requests for fast context creation (~50ms vs ~2s cold start).
 */
const browserCache: Map<Str, Browser> = new Map();

/**
 * Get or launch a persistent headless browser for the specified engine.
 *
 * @param engine - Browser engine: 'chromium', 'firefox', or 'webkit'
 * @returns Running browser instance
 */
async function getOrLaunchBrowser(engine: Str): Promise<Browser> {
  const cached: Browser | undefined = browserCache.get(engine);
  if (cached?.isConnected()) return cached;

  // Dynamic import — avoids Vite static analysis of native playwright binaries
  const pw = await import('playwright');

  let launcher: BrowserType;
  if (engine === 'firefox') {
    launcher = pw.firefox;
  } else if (engine === 'webkit') {
    launcher = pw.webkit;
  } else {
    launcher = pw.chromium;
  }

  const browser: Browser = await launcher.launch({ headless: true });
  browserCache.set(engine, browser);
  return browser;
}

/* ------------------------------------------------------------------ */
/*  GET handler                                                        */
/* ------------------------------------------------------------------ */

/**
 * GET handler — renders a component in a real browser and returns a PNG screenshot.
 *
 * Query params:
 * - `component` (required) — component directory name (e.g., 'button')
 * - `browser` — engine: 'chromium' | 'firefox' | 'webkit' (default: 'chromium')
 * - `device` — Playwright device name (e.g., 'iPhone 15 Pro Max')
 * - `width` + `height` — custom viewport (overrides device preset)
 * - `scale` — custom deviceScaleFactor (overrides device preset)
 * - `colorScheme` — 'dark' | 'light' (Playwright media emulation)
 * - `reducedMotion` — 'reduce' | 'no-preference'
 * - `forcedColors` — 'active' | 'none'
 * - `s` — base64 JSON card styles (pass-through to isolate route)
 * - `variant` + `option` — variant overrides (pass-through to isolate route)
 *
 * @param root0 - SvelteKit request event
 * @param root0.url - Request URL with query parameters
 * @returns PNG image buffer (200) or JSON error (400/404/500)
 */
export const GET: RequestHandler = async ({ url }) => {
  if (!dev) {
    return new Response('Screenshot API is dev-only', { status: 404 });
  }

  /* ---- Parse & validate params ---- */

  const component: Str = (url.searchParams.get('component') ?? '') as Str;
  if (!component) {
    return new Response(JSON.stringify({ error: 'Missing required "component" parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const engine: Str = (url.searchParams.get('browser') ?? 'chromium') as Str;
  if (!VALID_ENGINES.has(engine)) {
    return new Response(
      JSON.stringify({
        error: `Invalid browser "${engine}" — must be chromium, firefox, or webkit`,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const deviceName: Str = (url.searchParams.get('device') ?? '') as Str;
  const customWidth: Str = (url.searchParams.get('width') ?? '') as Str;
  const customHeight: Str = (url.searchParams.get('height') ?? '') as Str;
  const customScale: Str = (url.searchParams.get('scale') ?? '') as Str;
  const colorScheme: Str = (url.searchParams.get('colorScheme') ?? '') as Str;
  const reducedMotion: Str = (url.searchParams.get('reducedMotion') ?? '') as Str;
  const forcedColors: Str = (url.searchParams.get('forcedColors') ?? '') as Str;

  /* Pass-through params for isolate route */
  const cardStylesParam: Str = (url.searchParams.get('s') ?? '') as Str;
  const variant: Str = (url.searchParams.get('variant') ?? '') as Str;
  const option: Str = (url.searchParams.get('option') ?? '') as Str;

  /* ---- Build isolate URL ---- */

  const isolateUrl: URL = new URL(`/isolate/${component}`, url.origin);
  if (cardStylesParam) isolateUrl.searchParams.set('s', cardStylesParam);
  if (variant) isolateUrl.searchParams.set('variant', variant);
  if (option) isolateUrl.searchParams.set('option', option);

  /* ---- Build Playwright context & capture ---- */

  try {
    const pw = await import('playwright');

    /* Resolve device preset from Playwright's registry */
    // pw.devices is Record<string, DeviceDescriptor> — index yields unknown
    const deviceConfig: Record<Str, unknown> | undefined = deviceName
      ? (pw.devices[deviceName] as Record<Str, unknown> | undefined)
      : undefined;

    if (deviceName && !deviceConfig) {
      return new Response(JSON.stringify({ error: `Unknown device "${deviceName}"` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contextOptions: Record<Str, unknown> = {};

    /* Device preset provides viewport, UA, scale, touch, mobile */
    if (deviceConfig) {
      Object.assign(contextOptions, deviceConfig);
    }

    /* Custom viewport overrides device preset */
    if (customWidth && customHeight) {
      const w: Num = Number(customWidth) as Num;
      const h: Num = Number(customHeight) as Num;
      if (!Number.isNaN(w) && !Number.isNaN(h) && w > 0 && h > 0) {
        contextOptions.viewport = { width: w, height: h };
      }
    }

    /* Custom scale overrides device preset */
    if (customScale) {
      const s: Num = Number(customScale) as Num;
      if (!Number.isNaN(s) && s > 0) {
        contextOptions.deviceScaleFactor = s;
      }
    }

    /* Media emulation — sets actual browser-level preferences */
    if (colorScheme === 'dark' || colorScheme === 'light') {
      contextOptions.colorScheme = colorScheme;
    }
    if (reducedMotion === 'reduce' || reducedMotion === 'no-preference') {
      contextOptions.reducedMotion = reducedMotion;
    }
    if (forcedColors === 'active' || forcedColors === 'none') {
      contextOptions.forcedColors = forcedColors;
    }

    /* ---- Launch browser, navigate, screenshot ---- */

    const browser: Browser = await getOrLaunchBrowser(engine);
    const context: BrowserContext = await browser.newContext(contextOptions);

    let screenshotBuf: ArrayBuffer;
    try {
      const page: Page = await context.newPage();

      await page.goto(isolateUrl.toString(), {
        waitUntil: 'networkidle',
        timeout: 15_000,
      });

      /* Wait for the isolate page to signal component is rendered */
      await page.waitForSelector('[data-lens-ready]', { timeout: 10_000 });

      /* Brief extra delay for CSS transitions to settle */
      await page.waitForTimeout(200);

      const rawBuf: Buffer = (await page.screenshot({
        type: 'png',
        fullPage: true,
      })) as Buffer;
      // Buffer → ArrayBuffer slice for BodyInit compatibility (TS 5.7+)
      screenshotBuf = rawBuf.buffer.slice(
        rawBuf.byteOffset,
        rawBuf.byteOffset + rawBuf.byteLength,
      ) as ArrayBuffer;
    } finally {
      await context.close();
    }

    return new Response(screenshotBuf, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
        'X-Lens-Browser': engine,
        'X-Lens-Device': deviceName || 'custom',
      },
    });
  } catch (error: unknown) {
    const message: Str = (
      error instanceof Error ? error.message : 'Screenshot capture failed'
    ) as Str;
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
