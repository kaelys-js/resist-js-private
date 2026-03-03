// oxlint-disable-next-line import/no-unassigned-import -- setup file for jest-dom matchers
import '@testing-library/jest-dom/vitest';

// jsdom does not implement window.matchMedia — required by shadcn-svelte Sidebar
// and Svelte's MediaQuery class.
// oxlint-disable-next-line no-empty-function -- intentional no-op for mock
const noop = (): void => {};

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query: string) => ({
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
