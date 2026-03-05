import type { EditorDevtools } from '$lib/debug/devtools-api.svelte';

// TODO: Proper commenting in file

declare global {
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
	interface Window {
		__EDITOR_DEVTOOLS__?: EditorDevtools;
	}
}

export {};
