/**
 * SvelteKit configuration.
 *
 * Configures adapter-static for SPA output, CSP directives for production,
 * git commit versioning for cache invalidation, and workspace `@/` path aliases
 * that mirror the root tsconfig so SvelteKit can resolve shared packages.
 *
 * This is a plain `.js` config file loaded directly by SvelteKit's Node.js
 * tooling — Valibot schemas and TypeScript types are not available here.
 */

import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { execSync } from 'node:child_process';
import path from 'node:path';

/** Monorepo root directory (4 levels up from editor package). */
const root = path.resolve(import.meta.dirname, '../../../..');

/** Whether we're in development mode (non-production NODE_ENV). */
const isDev = process.env.NODE_ENV !== 'production';

/**
 * CSP directives for production builds.
 *
 * Disabled in dev because Vite injects inline HMR scripts that SvelteKit
 * cannot add nonces to, causing CSP violations that block hot reloading.
 * In production (adapter-static), SvelteKit embeds CSP as <meta> tags with hashes.
 *
 * @type {import('@sveltejs/kit').Config['kit']['csp'] | undefined}
 */
const csp = isDev
	? undefined
	: {
			mode: /** @type {const} */ ('hash'),
			directives: {
				'default-src': [/** @type {const} */ ('self')],
				'script-src': [/** @type {const} */ ('self'), 'wasm-unsafe-eval'],
				'style-src': [/** @type {const} */ ('self'), 'unsafe-inline'],
				'img-src': [/** @type {const} */ ('self'), 'data:', 'blob:'],
				'font-src': [/** @type {const} */ ('self')],
				'connect-src': [/** @type {const} */ ('self'), 'ws:', 'wss:'],
				'worker-src': [/** @type {const} */ ('self'), 'blob:'],
				'child-src': [/** @type {const} */ ('self'), 'blob:'],
				'frame-ancestors': [/** @type {const} */ ('none')],
				'base-uri': [/** @type {const} */ ('self')],
				'form-action': [/** @type {const} */ ('self')],
				'object-src': [/** @type {const} */ ('none')],
			},
		};

/**
 * Short git commit hash for SvelteKit version tracking.
 * Used by `kit.version.name` for client-side cache invalidation.
 *
 * @type {string}
 */
const gitCommit = (() => {
	try {
		return execSync('git rev-parse --short HEAD').toString().trim();
	} catch {
		return 'unknown';
	}
})();

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		version: {
			name: gitCommit,
		},
		adapter: adapter({
			pages: 'dist',
			assets: 'dist',
			fallback: 'index.html',
		}),
		csp,
		alias: {
			'@/schemas/common': path.join(root, 'packages/shared/schemas/common/src/index.ts'),
			'@/schemas/result': path.join(root, 'packages/shared/schemas/result/src/result.ts'),
			'@/schemas/result/*': path.join(root, 'packages/shared/schemas/result/src/*'),
			'@/schemas/function': path.join(root, 'packages/shared/schemas/function/src/function.ts'),
			'@/schemas/function/*': path.join(root, 'packages/shared/schemas/function/src/*'),
			'@/schemas/generic/*': path.join(root, 'packages/shared/schemas/generic/src/*'),
			'@/utils/result/*': path.join(root, 'packages/shared/utils/result/src/*'),
			'@/utils/core': path.join(root, 'packages/shared/utils/core/src/index.ts'),
			'@/utils/core/*': path.join(root, 'packages/shared/utils/core/src/*'),
			'@/locale/svelte': path.join(root, 'packages/shared/locale/src/svelte.svelte.ts'),
			'@/locale/*': path.join(root, 'packages/shared/locale/src/*'),
			'@/config/test/*': path.join(root, 'packages/shared/config/test/src/*'),
			'@/config/test/harness': path.join(root, 'packages/shared/config/test/src/harness/index.ts'),
			'@/config/test/harness/*': path.join(root, 'packages/shared/config/test/src/harness/*'),
		},
	},
};

export default config;
