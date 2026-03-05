/**
 * Mock for SvelteKit's `$app/navigation` virtual module.
 *
 * Provides no-op versions of goto, invalidate, invalidateAll,
 * beforeNavigate, afterNavigate, onNavigate, and pushState.
 * Used in unit tests via vitest resolve alias.
 */

/* oxlint-disable no-empty-function -- All mocks are intentional no-ops. */
/* oxlint-disable require-param -- Underscore-prefixed params are intentionally unused. */

/**
 * Navigate to a URL — no-op in tests.
 *
 * @param _url - Target URL (ignored)
 * @param _opts - Navigation options (ignored)
 */
// oxlint-disable-next-line require-await -- SvelteKit's $app/navigation mock matches the async signature
export async function goto(_url: string | URL, _opts?: Record<string, unknown>): Promise<void> {}

/**
 * Invalidate specific data — no-op in tests.
 *
 * @param _resource - Resource to invalidate (ignored)
 */
// oxlint-disable-next-line require-await -- SvelteKit's $app/navigation mock matches the async signature
export async function invalidate(_resource: string | URL | (() => boolean)): Promise<void> {}

/** Invalidate all data — no-op in tests. */
// oxlint-disable-next-line require-await -- SvelteKit's $app/navigation mock matches the async signature
export async function invalidateAll(): Promise<void> {}

/**
 * Register a before-navigation callback — no-op in tests.
 *
 * @param _callback - Callback (ignored)
 */
export function beforeNavigate(_callback: (navigation: unknown) => void): void {}

/**
 * Register an after-navigation callback — no-op in tests.
 *
 * @param _callback - Callback (ignored)
 */
export function afterNavigate(_callback: (navigation: unknown) => void): void {}

/**
 * Register an on-navigate callback — no-op in tests.
 *
 * @param _callback - Callback (ignored)
 */
export function onNavigate(_callback: (navigation: unknown) => void): void {}

/**
 * Push history state — no-op in tests.
 *
 * @param _url - Target URL (ignored)
 * @param _state - State object (ignored)
 */
export function pushState(_url: string | URL, _state: Record<string, unknown>): void {}

/**
 * Replace history state — no-op in tests.
 *
 * @param _url - Target URL (ignored)
 * @param _state - State object (ignored)
 */
export function replaceState(_url: string | URL, _state: Record<string, unknown>): void {}
