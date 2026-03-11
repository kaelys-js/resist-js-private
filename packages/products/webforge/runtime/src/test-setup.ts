/**
 * Vitest test setup for @webforge/runtime.
 *
 * Polyfills browser globals that Babylon.js references at import time.
 * NullEngine itself doesn't need DOM, but some Babylon.js modules
 * reference `window`, `document`, and `navigator` during module init.
 *
 * @module
 */

/* eslint-disable @typescript-eslint/no-unnecessary-condition */

// Polyfill XMLHttpRequest — required by Babylon.js asset loaders
// @ts-expect-error — xhr2 has no type declarations
import { XMLHttpRequest as Xhr2 } from 'xhr2';

const g: Record<string, unknown> = globalThis as Record<string, unknown>;

const noop = (): unknown => ({});

if (!g.XMLHttpRequest) {
  g.XMLHttpRequest = Xhr2;
}

// Polyfill navigator — required by Babylon.js platform detection
if (!g.navigator) {
  g.navigator = { platform: 'test', userAgent: 'vitest' };
}

// Polyfill document — required by Babylon.js loading screen and engine lifecycle
if (!g.document) {
  g.document = {
    createElement: noop,
    createElementNS: noop,
    head: { appendChild: noop },
    body: { appendChild: noop },
    addEventListener: noop,
    removeEventListener: noop,
    getElementById: () => null,
    querySelectorAll: () => [],
    documentElement: { style: {} },
  };
}

// Polyfill window — required by Babylon.js event handlers
if (!g.window) {
  g.window = {
    addEventListener: noop,
    removeEventListener: noop,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    devicePixelRatio: 1,
    innerWidth: 1024,
    innerHeight: 768,
  };
}
