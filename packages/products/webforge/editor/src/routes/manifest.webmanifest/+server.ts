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
	name: v.string(),
	short_name: v.string(),
	description: v.string(),
	start_url: v.string(),
	id: v.string(),
	scope: v.string(),
	display: v.string(),
	background_color: v.string(),
	theme_color: v.string(),
	categories: v.array(v.string()),
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
