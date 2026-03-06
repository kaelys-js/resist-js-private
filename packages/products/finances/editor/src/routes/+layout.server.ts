/**
 * Root layout server load — provides user and preference data to all routes.
 *
 * Fetches data via the DataService abstraction (mock in dev, D1 in prod).
 * When no user is authenticated, returns null so auth-gated UI can
 * conditionally hide.
 *
 * User data is always returned synchronously because it's small (set by
 * the auth hook).
 *
 * @module
 */

import type { LayoutServerLoad } from './$types';

/**
 * Root layout server load function.
 *
 * @param root0 - SvelteKit layout server load event
 * @param root0.locals - Server-side locals containing user, locale, and sidebar state
 * @returns Layout data containing locale, sidebar state, and user
 */
export const load: LayoutServerLoad = ({ locals }) => {
	return {
		locale: locals.locale,
		sidebarPx: locals.sidebarPx,
		sidebarOpen: locals.sidebarOpen,
		user: locals.user ?? null,
	};
};
