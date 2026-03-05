/**
 * Central app metadata configuration.
 *
 * Single source of truth for app identity, theme colors, icon definitions,
 * and security contact info. All consumers (manifest route, meta tags,
 * robots.txt, security.txt) import from here.
 */

// TODO: Proper commenting

import type { SUPPORTED_THEMES } from '$lib/schemas/editor-state';

// ── App identity ─────────────────────────────────────────────────────────────

export const APP_NAME = 'Storyline';
export const APP_SHORT_NAME = 'Storyline';
export const APP_TAGLINE = 'Your Story, Rendered';
export const APP_DESCRIPTION = 'Your Story, Rendered';
export const APP_ID = '/';
export const APP_SCOPE = '/';
export const APP_START_URL = '/';
export const APP_DISPLAY = 'standalone';
export const APP_CATEGORIES: readonly string[] = ['games', 'developer tools', 'design']; // TODO: Proper Valibot Schema

// ── Storage ──────────────────────────────────────────────────────────────────

/** Prefix for all localStorage keys. Prevents collisions with other apps on the same origin. */
export const STORAGE_PREFIX = 'app';

/**
 * Builds a namespaced localStorage key.
 *
 * @param suffix - The key-specific suffix (e.g. 'editor-state', 'mode')
 * @returns Prefixed key string (e.g. 'app:editor-state')
 *
 * @example
 * storageKey('editor-state') // 'app:editor-state'
 * storageKey('mode')         // 'app:mode'
 */
export function storageKey(suffix: string): string { // TODO: Proper Valibot Types + Result System
	return `${STORAGE_PREFIX}:${suffix}`;
}

// ── Theme colors ─────────────────────────────────────────────────────────────
// Hex equivalents of the oklch --background values from app.css.
// Light mode is always #ffffff (all themes use oklch(1 0 0) as :root default).
// Dark mode varies per theme.

type ThemeColorEntry = { readonly light: string; readonly dark: string }; // TODO: Proper Valibot Schema

/**
 * Map of theme identifier → hex background colors for light and dark modes.
 * Used by theme-color meta tags and manifest.
 *
 * oklch → hex conversions computed offline (see design doc for values).
 */
export const THEME_COLORS: Record<(typeof SUPPORTED_THEMES)[number], ThemeColorEntry> = { // TODO: Proper Valibot Schema
	'': { light: '#ffffff', dark: '#242424' },
	midnight: { light: '#ffffff', dark: '#1a1f2e' },
	warm: { light: '#ffffff', dark: '#2a2420' },
	forest: { light: '#ffffff', dark: '#1c2722' },
	ocean: { light: '#ffffff', dark: '#1b2528' },
	rose: { light: '#ffffff', dark: '#281c24' },
	lavender: { light: '#ffffff', dark: '#211c2d' },
	sunset: { light: '#ffffff', dark: '#2b231e' },
	slate: { light: '#ffffff', dark: '#232527' },
	copper: { light: '#ffffff', dark: '#2a2520' },
	aurora: { light: '#ffffff', dark: '#1b2725' },
	amethyst: { light: '#ffffff', dark: '#261b2c' },
};

// ── Icons ────────────────────────────────────────────────────────────────────
// Must match the files in static/. Shared by manifest route and meta tags.

type IconEntry = { // TODO: Proper Valibot Schema
	readonly src: string;
	readonly sizes: string;
	readonly type: string;
	readonly purpose?: string;
};

export const ICONS: readonly IconEntry[] = [
	{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
	{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
	{ src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
	{ src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

// ── Fonts ────────────────────────────────────────────────────────────────────
// Self-hosted font configuration. Used by app.css (@font-face) and
// the Vite HTML template plugin (error.html inline styles).

/** CSS font-family stack for body text (Inter + system fallbacks). */
export const FONT_FAMILIES =
	"'Inter', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";

/** CSS font-family stack for display/accent text (Rajdhani). */
export const FONT_DISPLAY_FAMILIES = "'Rajdhani', ui-sans-serif, system-ui, sans-serif";

type FontFaceEntry = { // TODO: Proper Valibot Schema
	readonly family: string;
	readonly style: string;
	readonly weight: string;
	readonly src: string;
};

/** Self-hosted @font-face definitions. Paths are relative to static/. */
export const FONT_FACES: readonly FontFaceEntry[] = [
	{ family: 'Inter', style: 'normal', weight: '100 900', src: '/fonts/inter-latin.woff2' },
	{ family: 'Rajdhani', style: 'normal', weight: '600', src: '/fonts/rajdhani-latin-600.woff2' },
	{ family: 'Rajdhani', style: 'normal', weight: '700', src: '/fonts/rajdhani-latin-700.woff2' },
];

// ── Security / contact ───────────────────────────────────────────────────────
// Used by security.txt route.

export const SECURITY_CONTACT_URL = 'https://github.com/nicholascostadev/webforge/security'; // TODO: Wrong
export const SECURITY_POLICY_URL = 'https://github.com/nicholascostadev/webforge/security/policy'; // TODO: Wrong
export const SECURITY_CANONICAL_URL = 'https://webforge.dev/.well-known/security.txt'; // TODO: Wrong
export const SECURITY_PREFERRED_LANGUAGES = 'en, ja, zh, ko, fr, de, es'; // TODO: Should be dynamic based on actual available languages
