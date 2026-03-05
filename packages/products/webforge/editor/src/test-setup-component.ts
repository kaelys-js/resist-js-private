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

// oxlint-disable-next-line import/no-unassigned-import -- setup file for jest-dom matchers
import '@testing-library/jest-dom/vitest';
import type { Str, Void } from '@/schemas/common';

// jsdom does not implement window.matchMedia — required by shadcn-svelte Sidebar
// and Svelte's MediaQuery class.
// oxlint-disable-next-line no-empty-function -- intentional no-op for mock
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
// oxlint-disable-next-line no-empty-function -- intentional no-op mock methods
globalThis.ResizeObserver ??= class {
	// oxlint-disable-next-line no-empty-function -- intentional no-op for mock
	observe(): Void {}
	// oxlint-disable-next-line no-empty-function -- intentional no-op for mock
	unobserve(): Void {}
	// oxlint-disable-next-line no-empty-function -- intentional no-op for mock
	disconnect(): Void {}
} as unknown as typeof ResizeObserver;

// jsdom does not implement Element.prototype.animate — required by Svelte transitions.
// oxlint-disable-next-line no-undef -- Element is a global in jsdom browser environment
if (!Element.prototype.animate) {
	// oxlint-disable-next-line no-undef -- Element is a global in jsdom browser environment
	Element.prototype.animate = function () {
		return {
			finished: new Promise<void>((resolve) => {
				resolve();
			}),
			// oxlint-disable-next-line no-empty-function -- intentional no-op for mock
			cancel(): Void {},
			onfinish: null,
		} as unknown as Animation;
	};
}
