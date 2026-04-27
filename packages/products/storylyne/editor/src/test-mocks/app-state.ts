/**
 * Mock for SvelteKit's `$app/state` virtual module.
 *
 * Provides runes-compatible page, navigating, and updated objects.
 * Used in unit tests via vitest resolve alias. Tests can override
 * individual exports by using `vi.mock('$app/state', ...)`.
 *
 * @module
 */

import type { Bool, Num } from '@/schemas/common';

/** Mock page state matching SvelteKit's `Page` shape. */
export const page: {
  url: URL;
  params: Record<string, never>;
  route: { id: null };
  status: Num;
  error: null;
  data: Record<string, never>;
  form: undefined;
  state: Record<string, never>;
} = {
  url: new URL('http://localhost'),
  params: {},
  route: { id: null },
  status: 200,
  error: null,
  data: {},
  form: undefined,
  state: {},
};

/** Mock navigating state — `null` when no navigation is in progress. */
export const navigating: null = null;

/** Mock updated state with async check function. */
export const updated: { current: Bool; check: () => Promise<Bool> } = {
  current: false,
  check: async (): Promise<Bool> => {
    await Promise.resolve();
    return false;
  },
};
