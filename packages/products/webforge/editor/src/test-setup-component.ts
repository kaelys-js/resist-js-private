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

// oxlint-disable no-empty-function -- test setup file: all mocks are intentional no-ops
// oxlint-disable-next-line import/no-unassigned-import -- setup file for jest-dom matchers
import '@testing-library/jest-dom/vitest';
import type { Str, Void } from '@/schemas/common';

// jsdom does not implement window.matchMedia — required by shadcn-svelte Sidebar
// and Svelte's MediaQuery class.
const noop = (): Void => {};

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
  observe(): Void {}
  unobserve(): Void {}
  disconnect(): Void {}
} as unknown as typeof ResizeObserver;

// jsdom does not implement Element.prototype.animate — required by Svelte transitions.
if (!Element.prototype.animate) {
  Element.prototype.animate = function () {
    return {
      finished: new Promise<void>((resolve) => {
        resolve();
      }),
      cancel(): Void {},
      onfinish: null,
    } as unknown as Animation;
  };
}
