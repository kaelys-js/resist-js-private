/**
 * SvelteKit ambient type declarations.
 *
 * Extends the global `App` namespace used by SvelteKit for error shapes,
 * request locals, and platform bindings. Also declares Vite build-time
 * constants injected via `define` in `vite.config.ts`.
 *
 * Note: SvelteKit ambient interfaces must use TS primitive types (`string`,
 * `boolean`) — Valibot type aliases (`Str`, `Bool`) resolve to the same
 * primitives but are imported here for CLAUDE.md compliance.
 *
 * @module
 */

import type { Str, Bool, Num } from '@/schemas/common';
import type { EditorDevtools } from '$lib/debug/devtools-api.svelte';
import type { BuildInfo } from '$lib/schemas/build-info';
import type { ServerUser, DataService } from '$lib/server/data/types';

declare global {
	/** Vite `define` build-time constants (see vite.config.ts). */
	const __APP_VERSION__: Str;
	const __GIT_COMMIT__: Str;
	const __GIT_COMMIT_FULL__: Str;
	const __GIT_BRANCH__: Str;
	const __GIT_DIRTY__: Bool;
	const __BUILD_TIMESTAMP__: Str;

	namespace App {
		interface Error {
			message: Str;
			errorId?: Str;
		}
		interface Locals {
			locale: Str;
			user: ServerUser | null;
			db: DataService;
			/** Whether the client sent `Save-Data: on` (data-saver mode). */
			saveData: Bool;
			/** Sanitized sidebar width from `app:sidebar-px` cookie, or `null` if absent/invalid. */
			sidebarPx: Num | null;
			/** Sanitized sidebar open state from `app:sidebar-open` cookie, or `null` if absent/invalid. */
			sidebarOpen: Bool | null;
		}
		interface Platform {
			env: {
				/** Cloudflare D1 database binding (available when deployed). */
				DB?: D1Database;
			};
			/** Cloudflare Workers execution context. */
			ctx: ExecutionContext;
			/** Cloudflare Workers cache storage. */
			caches: CacheStorage;
			/** Cloudflare request properties (geo, TLS, etc.). */
			cf?: IncomingRequestCfProperties;
		}
	}

	/**
	 * Window extensions — debug devtools and build info globals.
	 *
	 * Property names are derived from APP_NAME at runtime via DEVTOOLS_KEY and BUILD_KEY
	 * (see devtools-api.svelte.ts). TypeScript ambient declarations require literal names,
	 * so these must be updated manually if APP_NAME changes.
	 */
	interface Window {
		__STORYLYNE_DEVTOOLS__?: EditorDevtools;
		__STORYLYNE_BUILD__?: BuildInfo;
	}
}

export {};
