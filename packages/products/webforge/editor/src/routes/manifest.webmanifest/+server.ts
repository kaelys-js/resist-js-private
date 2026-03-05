/**
 * Dynamic web app manifest route.
 *
 * Generates manifest.webmanifest from the central app metadata config.
 * Prerendered at build time by adapter-static → produces a static JSON file.
 */

// TODO: Proper Commenting
// TODO: Proper Response Headers (Shared With Other Routes)
// TODO: Proper Schema For Manifest

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
	ICONS,
	THEME_COLORS,
} from '$lib/config/app-meta';

export const prerender = true;

export const GET: RequestHandler = () => {
	const manifest = {
		name: APP_NAME,
		short_name: APP_SHORT_NAME,
		description: APP_DESCRIPTION,
		start_url: APP_START_URL,
		id: APP_ID,
		scope: APP_SCOPE,
		display: APP_DISPLAY,
		background_color: THEME_COLORS[''].dark,
		theme_color: THEME_COLORS[''].dark,
		categories: APP_CATEGORIES,
		icons: ICONS,
	};

	return new Response(JSON.stringify(manifest, null, '\t'), {
		headers: { 'Content-Type': 'application/manifest+json' },
	});
};
