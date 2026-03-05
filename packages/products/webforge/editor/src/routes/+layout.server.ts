/**
 * Root layout server load — provides user, project, and scene data to all routes.
 *
 * Fetches data via the DataService abstraction (mock in dev, D1 in prod).
 * When no user is authenticated, returns nulls/empty arrays so auth-gated
 * UI can conditionally hide.
 *
 * @module
 */

import type { LayoutServerLoad } from './$types';

/**
 * Root layout server load function.
 *
 * @param root0 - SvelteKit layout server load event
 * @param root0.locals - Server-side locals containing user, locale, and db
 * @param root0.url - The current request URL
 * @returns Layout data containing locale, user, project, and scenes
 */
export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { user } = locals;

	if (!user) {
		return { locale: locals.locale, user: null, project: null, scenes: [] };
	}

	const projectResult = await locals.db.projects.getByOwner(user.id);
	if (!projectResult.ok) return { locale: locals.locale, user, project: null, scenes: [] };
	const project = projectResult.data;

	if (!project) {
		return { locale: locals.locale, user, project: null, scenes: [] };
	}

	// Simulate empty scene list via URL override (?wf.scenes=empty)
	if (url.searchParams.get('wf.scenes') === 'empty') {
		return { locale: locals.locale, user, project, scenes: [] };
	}

	const scenesResult = await locals.db.scenes.getByProject(project.id);
	if (!scenesResult.ok) return { locale: locals.locale, user, project, scenes: [] };
	const scenes = scenesResult.data;

	return { locale: locals.locale, user, project, scenes };
};
