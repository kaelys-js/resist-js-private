/**
 * Svelte Test Preset
 *
 * Vitest configuration factory for Svelte component packages.
 * Extends the base preset with jsdom environment, Svelte Vite plugin,
 * and globals enabled (required by Testing Library).
 *
 * @module
 */

import { resolve } from 'node:path';
import { defineConfig, type ViteUserConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { baseTestConfig } from './base.ts';

/**
 * Options for configuring a Svelte Vitest preset.
 */
export type SvelteTestOptions = {
	/** Package name for the self-referencing alias (e.g. '@/ui'). */
	packageName?: string;
	/** The calling file's `import.meta.dirname` — required when `packageName` is set. */
	dirname?: string;
	include?: string[];
	coverageExclude?: string[];
	/** Additional Vite plugins */
	plugins?: ViteUserConfig['plugins'];
};

/**
 * Creates a Vitest configuration for Svelte component packages.
 *
 * @param options - Customisation options (package alias, extra includes, coverage excludes, plugins)
 * @returns A complete Vitest `UserConfig` with jsdom environment and Svelte plugin
 */
export function createSvelteTestConfig(options: SvelteTestOptions = {}): ViteUserConfig {
	const { packageName, dirname, include = [], coverageExclude = [], plugins = [] } = options;
	const alias = packageName && dirname ? { [packageName]: resolve(dirname, './src') } : {};

	const base = baseTestConfig ?? {};

	return defineConfig({
		plugins: [svelte({ hot: false }), ...plugins],
		test: {
			...base,
			environment: 'jsdom',

			// Testing Library relies on globals for automatic cleanup.
			globals: true,

			include: [...(base.include ?? []), ...include],
			coverage: {
				...base.coverage,
				provider: 'v8',
				// Include Svelte component files in coverage.
				include: ['src/**/*.ts', 'src/**/*.svelte'],
				exclude: [...(base.coverage?.exclude ?? []), ...coverageExclude],
			},
		},
		resolve: Object.keys(alias).length > 0 ? { alias } : undefined,
	});
}
