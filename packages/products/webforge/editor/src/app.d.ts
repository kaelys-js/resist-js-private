import type { EditorDevtools } from '$lib/debug/devtools-api.svelte';

declare global {
	namespace App {
		interface Error {
			message: string;
			errorId?: string;
		}
		interface Locals {
			locale: string;
		}
	}

	// Devtools global — only present when debug mode is enabled
	interface Window {
		__EDITOR_DEVTOOLS__?: EditorDevtools;
	}
}

export {};
