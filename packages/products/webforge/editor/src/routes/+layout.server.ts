/**
 * Root layout server load — provides user, project, and scene data to all routes.
 *
 * Fetches data via the DataService abstraction (mock in dev, D1 in prod).
 * When no user is authenticated, returns nulls/empty arrays so auth-gated
 * UI can conditionally hide.
 *
 * **Project and scene data are returned as promises (not awaited)** so
 * SvelteKit can stream them to the client. The page renders immediately
 * with skeleton placeholders; data fills in when each promise resolves.
 *
 * - `adapter-static`: promises are awaited during prerendering (no streaming).
 * - `adapter-cloudflare`: promises stream via HTTP chunked encoding.
 * - `vite dev`: dev server streams, so skeletons are visible during development.
 *
 * User data is always returned synchronously because it's small (set by
 * the auth hook). Project/scene data may grow large, so it streams.
 *
 * @module
 */

import type { Bool } from '@/schemas/common';
import type { LayoutServerLoad } from './$types';
import type { ServerProject, ServerScene } from '$lib/server/data/types';

/**
 * Root layout server load function.
 *
 * @param root0 - SvelteKit layout server load event
 * @param root0.locals - Server-side locals containing user, locale, and db
 * @param root0.url - The current request URL
 * @returns Layout data containing locale, user (sync), project (streamed), and scenes (streamed)
 */
export const load: LayoutServerLoad = ({ locals, url }) => {
	const { user } = locals;

	if (!user) {
		return {
			locale: locals.locale,
			sidebarPx: locals.sidebarPx,
			user: null,
			project: null,
			scenes: [] as readonly ServerScene[],
		};
	}

	// Capture URL params synchronously before entering async context.
	// SvelteKit warns about URL access in promise handlers, but we only
	// need a snapshot of the search params at load time.
	const emptyScenes: Bool = url.searchParams.get('wf.scenes') === 'empty';

	// Stream project — page renders immediately with NavUserSkeleton.
	// Async IIFE avoids .then() chains (prefer-await-to-then lint rule).
	const projectPromise: Promise<ServerProject | null> = (async () => {
		const result = await locals.db.projects.getByOwner(user.id);
		return result.ok ? (result.data ?? null) : null;
	})();

	// Stream scenes — chained from project since scenes need project ID.
	// While project loads, NavScenesSkeleton shows. Once project resolves,
	// scenes load; if project is null, scenes resolve to empty immediately.
	const scenesPromise: Promise<readonly ServerScene[]> = (async () => {
		const project = await projectPromise;
		if (!project) return [] as readonly ServerScene[];
		if (emptyScenes) return [] as readonly ServerScene[];
		const result = await locals.db.scenes.getByProject(project.id);
		return result.ok ? result.data : ([] as readonly ServerScene[]);
	})();

	return {
		locale: locals.locale,
		sidebarPx: locals.sidebarPx,
		user,
		project: projectPromise,
		scenes: scenesPromise,
	};
};
