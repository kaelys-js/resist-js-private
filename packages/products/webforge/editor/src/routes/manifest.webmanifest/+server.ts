/**
 * Dynamic web app manifest route.
 *
 * Generates `manifest.webmanifest` from the central app metadata config
 * ({@link module:$lib/config/app-meta}). Prerendered at build time by
 * adapter-static → produces a static JSON file in the output directory.
 *
 * @module
 */

import * as v from 'valibot';
import type { RequestHandler } from './$types';
import {
	APP_CATEGORIES,
	APP_DESCRIPTION,
	APP_DISPLAY,
	APP_ID,
	APP_NAME,
	APP_SCOPE,
	APP_SHORT_NAME,
	APP_START_URL,
	IconEntrySchema,
	ICONS,
	THEME_COLORS,
} from '$lib/config/app-meta';

export const prerender = true;

/** Schema for the PWA web manifest JSON. */
const WebManifestSchema = v.strictObject({
	/** Full application name for PWA manifest. */
	name: v.string(),
	/** Abbreviated name for home screen display. */
	short_name: v.string(),
	/** Application description for stores and install prompts. */
	description: v.string(),
	/** URL launched when the PWA is opened. */
	start_url: v.string(),
	/** Unique application identifier for PWA manifest. */
	id: v.string(),
	/** Navigation scope restricting URLs the PWA can navigate to. */
	scope: v.string(),
	/** PWA display mode (standalone, fullscreen, minimal-ui, browser). */
	display: v.picklist(['standalone', 'fullscreen', 'minimal-ui', 'browser']),
	/** Background color shown during app loading (hex). */
	background_color: v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/)),
	/** Theme color for browser chrome and task switcher (hex). */
	theme_color: v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/)),
	/** App store categories for discovery. */
	categories: v.array(v.string()),
	/** PWA icon definitions for various sizes and purposes. */
	icons: v.array(IconEntrySchema),
});

/**
 * Generates the PWA web manifest JSON response.
 *
 * Assembles the manifest from app-meta constants, validates against
 * {@link WebManifestSchema}, and returns with appropriate cache headers.
 *
 * @returns JSON response with `application/manifest+json` content type
 */
export const GET: RequestHandler = () => {
	const manifest: v.InferOutput<typeof WebManifestSchema> = {
		name: APP_NAME,
		short_name: APP_SHORT_NAME,
		description: APP_DESCRIPTION,
		start_url: APP_START_URL,
		id: APP_ID,
		scope: APP_SCOPE,
		display: APP_DISPLAY,
		background_color: THEME_COLORS[''].dark,
		theme_color: THEME_COLORS[''].dark,
		categories: [...APP_CATEGORIES],
		icons: [...ICONS],
	};

	return new Response(JSON.stringify(manifest, null, '\t'), {
		headers: {
			'Content-Type': 'application/manifest+json',
			'Cache-Control': 'public, max-age=86400',
		},
	});
};
