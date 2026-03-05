import type { EditorDevtools } from '$lib/debug/devtools-api.svelte';
import type { BuildInfo } from '$lib/schemas/build-info';

// TODO: Proper commenting in file

declare global {
	// Vite `define` build-time constants (see vite.config.ts)
	const __APP_VERSION__: string;
	const __GIT_COMMIT__: string;
	const __GIT_COMMIT_FULL__: string;
	const __GIT_BRANCH__: string;
	const __GIT_DIRTY__: boolean;
	const __BUILD_TIMESTAMP__: string;

	namespace App {
		interface Error {
			message: string; // TODO: Use Specific Valibot Type
			errorId?: string; // TODO: Use Specific Valibot Type
		}
		interface Locals {
			locale: string; // TODO: Use Specific Valibot Type
		}
	}

	// Devtools global — only present when debug mode is enabled
	// Build info global — set once in root layout for external tooling
	interface Window {
		__EDITOR_DEVTOOLS__?: EditorDevtools;
		__STORYLYNE_BUILD__?: BuildInfo;
	}
}

export {};
