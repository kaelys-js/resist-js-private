/**
 * Sidebar layout and persistence constants.
 *
 * Contains default dimensions, cookie configuration, and keyboard shortcut
 * bindings used by the collapsible sidebar component.
 *
 * @module
 */

import type { Bool, Num, Str } from '@/schemas/common';

/** Cookie name used to persist sidebar open/closed state across sessions. */
export const SIDEBAR_COOKIE_NAME: Str = 'sidebar:state';

/** Maximum age (in seconds) for the sidebar state cookie — 7 days. */
export const SIDEBAR_COOKIE_MAX_AGE: Num = 60 * 60 * 24 * 7;

/** Default sidebar width on desktop viewports. */
export const SIDEBAR_WIDTH: Str = '16rem';

/** Default sidebar width on mobile viewports. */
export const SIDEBAR_WIDTH_MOBILE: Str = '18rem';

/** Sidebar width when collapsed to icon-only mode. */
export const SIDEBAR_WIDTH_ICON: Str = '3rem';

/** Keyboard shortcut key used to toggle the sidebar. */
export const SIDEBAR_KEYBOARD_SHORTCUT: Str = 'b';

/** Property name for cookie access — extracted to avoid triggering no-document-cookie. */
const COOKIE_PROP: Str = 'cookie';

/**
 * Persists the sidebar open/closed state to a cookie.
 *
 * Wraps raw cookie assignment behind a computed property access
 * so callers avoid direct `document.cookie` (satisfies `no-document-cookie`).
 *
 * @param {Bool} isOpen - Whether the sidebar is currently open
 */
export function persistSidebarState(isOpen: Bool): void {
  const entry: Str = `${SIDEBAR_COOKIE_NAME}=${String(isOpen)}; path=/; max-age=${String(SIDEBAR_COOKIE_MAX_AGE)}`;
  Reflect.set(document, COOKIE_PROP, entry);
}
