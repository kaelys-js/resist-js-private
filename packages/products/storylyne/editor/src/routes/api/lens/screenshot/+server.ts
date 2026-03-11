/**
 * Screenshot API — Playwright Real Browser Rendering
 *
 * Server endpoint that uses Playwright to render components in actual
 * browser engines (Chromium, Firefox, WebKit) with full device emulation.
 * Navigates a headless browser to the `/isolate/[name]` route, applies
 * all card styles and media emulation, takes a screenshot, and returns
 * JSON with base64 image, console logs, and performance timing.
 *
 * Features:
 * - 3 browser engines: Chromium (Chrome/Edge), Firefox, WebKit (Safari)
 * - 100+ device profiles with accurate viewport, scale, and user agent
 * - Media emulation: colorScheme, reducedMotion, forcedColors
 * - Console log capture during page load
 * - Performance timing (navigation, DOMContentLoaded, load, first paint)
 * - Browser version reporting
 * - Persistent browser instances (~50ms context creation per request)
 * - Dev-only — returns 404 in production builds
 *
 * @module
 */

import type { RequestHandler } from './$types';
import type { Num, Str } from '@/schemas/common';
import type { Browser, BrowserContext, BrowserType, ConsoleMessage, Page } from 'playwright';
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
/*  Display name helpers                                               */
/* ------------------------------------------------------------------ */

/**
 * Map engine IDs to human-readable display names.
 *
 * @param engine - Raw engine identifier
 * @returns Capitalized display name
 */
function engineDisplayName(engine: Str): Str {
  if (engine === 'firefox') return 'Firefox' as Str;
  if (engine === 'webkit') return 'WebKit' as Str;
  return 'Chromium' as Str;
}

/* ------------------------------------------------------------------ */
/*  Console formatting helpers                                         */
/* ------------------------------------------------------------------ */

/**
 * Strip `%c` format specifiers from console message text.
 *
 * Playwright's `msg.text()` preserves raw `%c` markers from
 * `console.log('%cHello', 'color:red')` but drops the CSS arguments.
 * This removes the `%c` markers for clean display.
 *
 * @param text - Raw console message text
 * @returns Text with `%c` specifiers removed
 */
function stripConsoleFormatting(text: Str): Str {
  /* Remove %c markers, then collapse multiple spaces from the gaps */
  let cleaned: Str = text.replaceAll('%c', '') as Str;
  while (cleaned.includes('  ')) {
    cleaned = cleaned.replaceAll('  ', ' ') as Str;
  }
  return cleaned.trim() as Str;
}

/* ------------------------------------------------------------------ */
/*  GET handler                                                        */
/* ------------------------------------------------------------------ */

/**
 * GET handler — renders a component in a real browser and returns JSON
 * with base64 screenshot, console logs, and performance timing.
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
 * - `networkThrottle` — delay in ms applied to every network request (e.g., '200' for 3G sim)
 * - `s` — base64 JSON card styles (pass-through to isolate route)
 * - `variant` + `option` — variant overrides (pass-through to isolate route)
 *
 * @param root0 - SvelteKit request event
 * @param root0.url - Request URL with query parameters
 * @returns JSON with image, consoleLogs, performance, browserVersion (200) or JSON error (400/404/500)
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
  const networkThrottle: Str = (url.searchParams.get('networkThrottle') ?? '') as Str;

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

    /* ---- Launch browser, navigate, capture ---- */

    const browser: Browser = await getOrLaunchBrowser(engine);
    const context: BrowserContext = await browser.newContext(contextOptions);

    /** Collected console messages during page load. */
    const consoleLogs: Array<{ level: Str; text: Str }> = [];

    let imageBase64: Str;
    let perfTiming: Record<Str, Num> = {};

    try {
      const page: Page = await context.newPage();

      /* Collect console messages — strip %c CSS format specifiers */
      page.on('console', (msg: ConsoleMessage): void => {
        const cleaned: Str = stripConsoleFormatting(msg.text() as Str);
        if (!cleaned) return;
        consoleLogs.push({
          level: msg.type() as Str,
          text: cleaned,
        });
      });

      /* Network throttling via route-level delay (works across all engines) */
      if (networkThrottle) {
        const delayMs: Num = Number(networkThrottle) as Num;
        if (!Number.isNaN(delayMs) && delayMs > 0) {
          await page.route('**/*', async (route) => {
            await new Promise<void>((resolve) => {
              setTimeout(resolve, delayMs);
            });
            await route.continue();
          });
        }
      }

      await page.goto(isolateUrl.toString(), {
        waitUntil: 'networkidle',
        timeout: networkThrottle ? 30_000 : 15_000,
      });

      /* Wait for the isolate page to signal component is rendered */
      await page.waitForSelector('[data-lens-ready]', { timeout: 10_000 });

      /* Brief extra delay for CSS transitions to settle */
      await page.waitForTimeout(200);

      /* Collect performance timing */
      perfTiming = (await page.evaluate((): Record<string, number> => {
        const nav: PerformanceNavigationTiming | undefined = performance.getEntriesByType(
          'navigation',
        )[0] as PerformanceNavigationTiming | undefined;
        const paint: PerformanceEntry[] = performance.getEntriesByType('paint');
        const fp: PerformanceEntry | undefined = paint.find(
          (e: PerformanceEntry) => e.name === 'first-paint',
        );
        const fcp: PerformanceEntry | undefined = paint.find(
          (e: PerformanceEntry) => e.name === 'first-contentful-paint',
        );

        const result: Record<string, number> = {};
        if (nav) {
          result.domContentLoaded = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
          result.load = Math.round(nav.loadEventEnd - nav.startTime);
          result.domInteractive = Math.round(nav.domInteractive - nav.startTime);
          result.responseEnd = Math.round(nav.responseEnd - nav.startTime);
        }
        if (fp) result.firstPaint = Math.round(fp.startTime);
        if (fcp) result.firstContentfulPaint = Math.round(fcp.startTime);

        return result;
      })) as Record<Str, Num>;

      const rawBuf: Buffer = (await page.screenshot({
        type: 'png',
        fullPage: true,
      })) as Buffer;

      imageBase64 = rawBuf.toString('base64') as Str;
    } finally {
      await context.close();
    }

    /* Build response JSON */
    const browserVersion: Str = browser.version() as Str;

    const responseBody: Record<Str, unknown> = {
      image: imageBase64,
      browser: engine,
      browserDisplayName: engineDisplayName(engine),
      browserVersion,
      device: deviceName || 'custom',
      consoleLogs,
      performance: perfTiming,
    };

    return new Response(JSON.stringify(responseBody), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
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
