/**
 * Mock for SvelteKit's `$app/navigation` virtual module.
 *
 * Provides no-op versions of goto, invalidate, invalidateAll,
 * beforeNavigate, afterNavigate, onNavigate, and pushState.
 * Used in unit tests via vitest resolve alias.
 *
 * Note: Function signatures use Valibot type aliases but must match
 * SvelteKit's `$app/navigation` API contract structurally.
 *
 * @module
 */

import type { Str, Bool, Void } from '@/schemas/common';

/** Sentinel resolved-Promise return for async mocks (avoids `require-await`). */
const RESOLVED_VOID: Promise<Void> = Promise.resolve();

/** Sentinel no-op body marker (avoids `no-empty-function`). */
const NOOP_VOID: Void = undefined;

/**
 * Navigate to a URL — no-op in tests.
 *
 * @param _url - Target URL (ignored)
 * @param _opts - Navigation options (ignored)
 * @returns Resolved promise.
 */
export function goto(_url: Str | URL, _opts?: Record<Str, unknown>): Promise<Void> {
  return RESOLVED_VOID;
}

/**
 * Invalidate specific data — no-op in tests.
 *
 * @param _resource - Resource to invalidate (ignored)
 * @returns Resolved promise.
 */
export function invalidate(_resource: Str | URL | (() => Bool)): Promise<Void> {
  return RESOLVED_VOID;
}

/**
 * Invalidate all data — no-op in tests.
 *
 * @returns Resolved promise.
 */
export function invalidateAll(): Promise<Void> {
  return RESOLVED_VOID;
}

/**
 * Register a before-navigation callback — no-op in tests.
 *
 * @param _callback - Callback (ignored)
 * @returns Void.
 */
export function beforeNavigate(_callback: (navigation: unknown) => Void): Void {
  return NOOP_VOID;
}

/**
 * Register an after-navigation callback — no-op in tests.
 *
 * @param _callback - Callback (ignored)
 * @returns Void.
 */
export function afterNavigate(_callback: (navigation: unknown) => Void): Void {
  return NOOP_VOID;
}

/**
 * Register an on-navigate callback — no-op in tests.
 *
 * @param _callback - Callback (ignored)
 * @returns Void.
 */
export function onNavigate(_callback: (navigation: unknown) => Void): Void {
  return NOOP_VOID;
}

/**
 * Push history state — no-op in tests.
 *
 * @param _url - Target URL (ignored)
 * @param _state - State object (ignored)
 * @returns Void.
 */
export function pushState(_url: Str | URL, _state: Record<Str, unknown>): Void {
  return NOOP_VOID;
}

/**
 * Replace history state — no-op in tests.
 *
 * @param _url - Target URL (ignored)
 * @param _state - State object (ignored)
 * @returns Void.
 */
export function replaceState(_url: Str | URL, _state: Record<Str, unknown>): Void {
  return NOOP_VOID;
}
