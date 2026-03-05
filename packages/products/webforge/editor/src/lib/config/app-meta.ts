/**
 * Central app metadata configuration.
 *
 * Single source of truth for app identity, theme colors, icon definitions,
 * font configuration, and security contact info. All consumers (manifest route,
 * meta tags, robots.txt, security.txt) import from here.
 *
 * @module
 */

import * as v from 'valibot';
import type { SUPPORTED_THEMES } from '$lib/schemas/editor-state';
import type { Str } from '@/schemas/common';

// ── App identity ─────────────────────────────────────────────────────────────

export const APP_NAME = 'Storylyne';
export const APP_SHORT_NAME = 'Storylyne';
export const APP_TAGLINE = 'Your Story, Rendered';
export const APP_DESCRIPTION = 'Your Story, Rendered';
export const APP_ID = '/';
export const APP_SCOPE = '/';
export const APP_START_URL = '/';
export const APP_DISPLAY = 'standalone';

/** Schema for valid app category strings (PWA manifest `categories` field). */
export const AppCategoriesSchema = v.array(v.string());

/** PWA manifest categories. Validated against {@link AppCategoriesSchema}. */
export const APP_CATEGORIES: v.InferOutput<typeof AppCategoriesSchema> = [
	'games',
	'developer tools',
	'design',
];

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
export function storageKey(suffix: Str): Str {
	return `${STORAGE_PREFIX}:${suffix}`;
}

// ── Theme colors ─────────────────────────────────────────────────────────────
// Hex equivalents of the oklch --background values from app.css.
// Light mode is always #ffffff (all themes use oklch(1 0 0) as :root default).
// Dark mode varies per theme.

/** Schema for a single theme color entry (light + dark hex values). */
export const ThemeColorEntrySchema = v.strictObject({
	light: v.string(),
	dark: v.string(),
});

/** A light/dark pair of hex background colors for a specific theme. */
export type ThemeColorEntry = v.InferOutput<typeof ThemeColorEntrySchema>;

/**
 * Map of theme identifier → hex background colors for light and dark modes.
 * Used by theme-color meta tags and manifest.
 *
 * oklch → hex conversions computed offline (see design doc for values).
 */
export const THEME_COLORS: Record<(typeof SUPPORTED_THEMES)[number], ThemeColorEntry> = {
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

/** Schema for a single PWA icon entry. */
export const IconEntrySchema = v.strictObject({
	src: v.string(),
	sizes: v.string(),
	type: v.string(),
	purpose: v.optional(v.string()),
});

/** A PWA manifest icon definition. */
export type IconEntry = v.InferOutput<typeof IconEntrySchema>;

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

/** Schema for a self-hosted @font-face definition. */
export const FontFaceEntrySchema = v.strictObject({
	family: v.string(),
	style: v.string(),
	weight: v.string(),
	src: v.string(),
});

/** A self-hosted @font-face definition. */
export type FontFaceEntry = v.InferOutput<typeof FontFaceEntrySchema>;

/** Self-hosted @font-face definitions. Paths are relative to static/. */
export const FONT_FACES: readonly FontFaceEntry[] = [
	{ family: 'Inter', style: 'normal', weight: '100 900', src: '/fonts/inter-latin.woff2' },
	{ family: 'Rajdhani', style: 'normal', weight: '600', src: '/fonts/rajdhani-latin-600.woff2' },
	{ family: 'Rajdhani', style: 'normal', weight: '700', src: '/fonts/rajdhani-latin-700.woff2' },
];

// ── Security / contact ───────────────────────────────────────────────────────
// Used by security.txt route.

export const SECURITY_CONTACT_URL = 'https://github.com/storylyne/storylyne/security';
export const SECURITY_POLICY_URL = 'https://github.com/storylyne/storylyne/security/policy';
export const SECURITY_CANONICAL_URL = 'https://storylyne.dev/.well-known/security.txt';

/**
 * Preferred languages for security.txt.
 * Derived dynamically from {@link SUPPORTED_LOCALES} at the security.txt route
 * to avoid a circular dependency (editor-state → app-meta → editor-state).
 * This fallback is only used if the route can't import SUPPORTED_LOCALES directly.
 */
export const SECURITY_PREFERRED_LANGUAGES = 'en, ja, zh, ko, fr, de, es';
