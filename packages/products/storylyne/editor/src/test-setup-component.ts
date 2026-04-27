/**
 * Vitest component test setup.
 *
 * Registers jest-dom matchers and polyfills browser APIs that jsdom
 * doesn't implement but our Svelte components require:
 * - `window.matchMedia` — shadcn-svelte Sidebar + Svelte MediaQuery
 * - `ResizeObserver` — ScrollArea + Tooltip internals
 * - `Element.prototype.animate` — Svelte transitions
 *
 * @module
 */

import * as JestDomMatchers from '@testing-library/jest-dom/vitest';
import type { Str, Void } from '@/schemas/common';

/** Reference the side-effect import so `no-unassigned-import` is satisfied. */
const _JEST_DOM_LOADED: typeof JestDomMatchers = JestDomMatchers;

/** Sentinel undefined-Void return that bodies of mock listeners share. */
const VOID_RETURN: Void = undefined;

/**
 * Shared no-op listener for matchMedia mock.
 *
 * @returns Void.
 */
const noop = (): Void => VOID_RETURN;

// jsdom does not implement window.matchMedia — required by shadcn-svelte Sidebar
// and Svelte's MediaQuery class.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: Str) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: noop,
    removeListener: noop,
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: () => false,
  }),
});

// jsdom does not implement ResizeObserver — required by ScrollArea + Tooltip internals.
globalThis.ResizeObserver ??= class {
  observe(): Void {
    return VOID_RETURN;
  }
  unobserve(): Void {
    return VOID_RETURN;
  }
  disconnect(): Void {
    return VOID_RETURN;
  }
} as unknown as typeof ResizeObserver;

// jsdom does not implement Element.prototype.animate — required by Svelte transitions.
if (!Element.prototype.animate) {
  Element.prototype.animate = function () {
    return {
      finished: new Promise<void>((resolve) => {
        resolve();
      }),
      cancel(): Void {
        return VOID_RETURN;
      },
      onfinish: null,
    } as unknown as Animation;
  };
}
