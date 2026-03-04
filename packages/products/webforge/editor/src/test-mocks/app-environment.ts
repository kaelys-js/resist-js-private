/**
 * Mock for SvelteKit's `$app/environment` virtual module.
 *
 * Used in unit tests via vitest resolve alias. Tests can override
 * individual exports by using `vi.mock('$app/environment', ...)`.
 */
export const dev = true;
export const browser = false;
export const building = false;
export const version = 'test';
