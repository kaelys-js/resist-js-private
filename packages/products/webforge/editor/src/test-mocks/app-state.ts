/**
 * Mock for SvelteKit's `$app/state` virtual module.
 *
 * Provides runes-compatible page, navigating, and updated objects.
 * Used in unit tests via vitest resolve alias. Tests can override
 * individual exports by using `vi.mock('$app/state', ...)`.
 */
export const page = {
	url: new URL('http://localhost'),
	params: {},
	route: { id: null },
	status: 200,
	error: null,
	data: {},
	form: undefined,
	state: {},
};

export const navigating = null;

// oxlint-disable-next-line require-await -- SvelteKit's $app/state mock matches the async signature
export const updated = { current: false, check: async (): Promise<boolean> => false };
