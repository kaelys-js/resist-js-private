/**
 * Mock for SvelteKit's `$app/environment` virtual module.
 *
 * Used in unit tests via vitest resolve alias. Tests can override
 * individual exports by using `vi.mock('$app/environment', ...)`.
 *
 * @module
 */

import type { Bool, Str } from '@/schemas/common';

/** Whether the app is running in development mode. */
export const dev: Bool = true;

/** Whether the code is running in the browser (false in SSR / tests). */
export const browser: Bool = false;

/** Whether the app is currently being built by SvelteKit. */
export const building: Bool = false;

/** The application version string. */
export const version: Str = 'test';
