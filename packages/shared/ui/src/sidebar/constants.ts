/**
 * Sidebar layout and persistence constants.
 *
 * Contains default dimensions, cookie configuration, and keyboard shortcut
 * bindings used by the collapsible sidebar component.
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';

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
