import type { LayoutServerLoad } from './$types';

/**
 * Root layout server load — provides user, project, and scene data to all routes.
 *
 * Fetches data via the DataService abstraction (mock in dev, D1 in prod).
 * When no user is authenticated, returns nulls/empty arrays so auth-gated
 * UI can conditionally hide.
 *
 * @param event - SvelteKit layout server load event
 * @returns Layout data containing locale, user, project, and scenes
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	const { user } = locals;

	if (!user) {
		return { locale: locals.locale, user: null, project: null, scenes: [] };
	}

	const projectResult = await locals.db.projects.getByOwner(user.id);
	const project = projectResult.ok ? projectResult.data : null;

	if (!project) {
		return { locale: locals.locale, user, project: null, scenes: [] };
	}

	const scenesResult = await locals.db.scenes.getByProject(project.id);
	const scenes = scenesResult.ok ? scenesResult.data : [];

	return { locale: locals.locale, user, project, scenes };
};
