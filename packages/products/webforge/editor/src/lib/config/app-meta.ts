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

/** Application display name. */
export const APP_NAME: Str = 'Storylyne';

/** Short name for PWA manifest and home screen. */
export const APP_SHORT_NAME: Str = 'Storylyne';

/** Marketing tagline shown in meta tags. */
export const APP_TAGLINE: Str = 'Your Story, Rendered';

/** App description for PWA manifest and meta tags. */
export const APP_DESCRIPTION: Str = 'Your Story, Rendered';

/** PWA manifest application ID. */
export const APP_ID: Str = '/';

/** PWA manifest scope. */
export const APP_SCOPE: Str = '/';

/** PWA manifest start URL. */
export const APP_START_URL: Str = '/';

/** Schema for valid PWA display modes. */
export const AppDisplaySchema = v.picklist(['standalone', 'fullscreen', 'minimal-ui', 'browser']);

/** PWA manifest display mode. */
export const APP_DISPLAY: v.InferOutput<typeof AppDisplaySchema> = 'standalone';

/** Schema for valid app category strings (PWA manifest `categories` field). */
export const AppCategoriesSchema = v.array(v.string());

/** PWA manifest categories. Validated against {@link AppCategoriesSchema}. */
export const APP_CATEGORIES: v.InferOutput<typeof AppCategoriesSchema> = [
	'games',
	'developer tools',
	'design',
];

// ── Storage ──────────────────────────────────────────────────────────────────

/** Prefix for all localStorage and cookie keys. Derived from {@link APP_NAME} to prevent collisions with other apps on the same origin. */
export const STORAGE_PREFIX: Str = APP_NAME.toLowerCase();

/**
 * Builds a namespaced localStorage/cookie key.
 *
 * @param suffix - The key-specific suffix (e.g. 'editor-state', 'mode')
 * @returns Prefixed key string (e.g. 'storylyne:editor-state')
 *
 * @example
 * storageKey('editor-state') // 'storylyne:editor-state'
 * storageKey('mode')         // 'storylyne:mode'
 */
export function storageKey(suffix: Str): Str {
	return `${STORAGE_PREFIX}:${suffix}`;
}

/**
 * Short prefix for URL debug/override parameters.
 * Derived from the first 3 characters of {@link APP_NAME} to prevent collisions with other query params.
 */
export const URL_PARAM_PREFIX: Str = `${APP_NAME.slice(0, 3).toLowerCase()}.`;

// ── Theme colors ─────────────────────────────────────────────────────────────
// Hex equivalents of the oklch --background values from app.css.
// Light mode is always #ffffff (all themes use oklch(1 0 0) as :root default).
// Dark mode varies per theme.

/** Schema for a single theme color entry (light + dark hex values). */
export const ThemeColorEntrySchema = v.strictObject({
	/** Light mode hex background color. */
	light: v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/)),
	/** Dark mode hex background color. */
	dark: v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/)),
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

// ── Display override ─────────────────────────────────────────────────────────
// Preferred display modes in priority order. Enables Window Controls Overlay
// when supported, falling back to standalone.

/** Schema for valid display override modes. */
export const DisplayOverrideSchema = v.array(
	v.picklist(['window-controls-overlay', 'standalone', 'fullscreen', 'minimal-ui', 'browser']),
);

/**
 * PWA manifest `display_override` array.
 * Browsers try each mode in order and use the first one supported.
 * `window-controls-overlay` enables the title bar area for app content.
 */
export const DISPLAY_OVERRIDE: v.InferOutput<typeof DisplayOverrideSchema> = [
	'window-controls-overlay',
	'standalone',
];

// ── Icons ────────────────────────────────────────────────────────────────────
// Must match the files in static/. Shared by manifest route and meta tags.

/** Schema for a single PWA icon entry. */
export const IconEntrySchema = v.strictObject({
	/** Path to icon file (relative to static/). */
	src: v.string(),
	/** Icon dimensions (e.g. `'192x192'`). */
	sizes: v.pipe(v.string(), v.regex(/^\d+x\d+$/)),
	/** MIME type of the icon (e.g. `'image/png'`). */
	type: v.picklist(['image/png', 'image/svg+xml']),
	/** Icon purpose (e.g. `'maskable'`). */
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

// ── Screenshots ─────────────────────────────────────────────────────────────
// PWA install UI screenshots. Must match the files in static/.
// At least one "wide" and one "narrow" screenshot are required for richer
// install prompts on desktop and mobile respectively.

/** Schema for a single PWA screenshot entry. */
export const ScreenshotEntrySchema = v.strictObject({
	/** Path to screenshot file (relative to static/). */
	src: v.string(),
	/** Screenshot dimensions (e.g. `'1280x720'`). */
	sizes: v.pipe(v.string(), v.regex(/^\d+x\d+$/)),
	/** MIME type of the screenshot (e.g. `'image/png'`). */
	type: v.picklist(['image/png', 'image/jpeg', 'image/webp']),
	/** Form factor: `'wide'` for desktop, `'narrow'` for mobile. */
	form_factor: v.picklist(['wide', 'narrow']),
	/** Descriptive label for accessibility. */
	label: v.string(),
});

/** A PWA manifest screenshot definition. */
export type ScreenshotEntry = v.InferOutput<typeof ScreenshotEntrySchema>;

/** PWA manifest screenshots for richer install UI. */
export const SCREENSHOTS: readonly ScreenshotEntry[] = [
	{
		src: '/screenshots/desktop.png',
		sizes: '1280x720',
		type: 'image/png',
		form_factor: 'wide',
		label: 'Storylyne editor — desktop view',
	},
	{
		src: '/screenshots/mobile.png',
		sizes: '540x720',
		type: 'image/png',
		form_factor: 'narrow',
		label: 'Storylyne editor — mobile view',
	},
];

// ── Fonts ────────────────────────────────────────────────────────────────────
// Self-hosted font configuration. Used by app.css (@font-face) and
// the Vite HTML template plugin (error.html inline styles).

/** CSS font-family stack for body text (Inter + system fallbacks). */
export const FONT_FAMILIES: Str =
	"'Inter', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";

/** CSS font-family stack for display/accent text (Rajdhani). */
export const FONT_DISPLAY_FAMILIES: Str = "'Rajdhani', ui-sans-serif, system-ui, sans-serif";

/** Schema for a self-hosted @font-face definition. */
export const FontFaceEntrySchema = v.strictObject({
	/** CSS font-family name. */
	family: v.string(),
	/** Font style (e.g. `'normal'`, `'italic'`). */
	style: v.picklist(['normal', 'italic']),
	/** Font weight or weight range (e.g. `'600'`, `'100 900'`). */
	weight: v.string(),
	/** Path to font file (relative to static/). */
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

/** Security vulnerability contact URL for security.txt. */
export const SECURITY_CONTACT_URL: Str = 'https://github.com/storylyne/storylyne/security';

/** Security policy URL for security.txt. */
export const SECURITY_POLICY_URL: Str = 'https://github.com/storylyne/storylyne/security/policy';

/** Canonical URL for security.txt. */
export const SECURITY_CANONICAL_URL: Str = 'https://storylyne.dev/.well-known/security.txt';

/**
 * Preferred languages for security.txt.
 * Derived dynamically from {@link SUPPORTED_LOCALES} at the security.txt route
 * to avoid a circular dependency (editor-state → app-meta → editor-state).
 * This fallback is only used if the route can't import SUPPORTED_LOCALES directly.
 */
/** Preferred languages for security.txt (comma-separated BCP 47 tags). */
export const SECURITY_PREFERRED_LANGUAGES: Str = 'en, ja, zh, ko, fr, de, es';
