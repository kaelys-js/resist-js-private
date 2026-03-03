import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		environment: 'node',
		globals: false,
		restoreMocks: true,
		isolate: true,
		pool: 'threads',
		sequence: { shuffle: false },
		passWithNoTests: true,
		bail: 0,
		retry: 0,
		testTimeout: 10_000,
		hookTimeout: 10_000,
		include: ['src/**/*.test.ts'],
		benchmark: {
			include: ['src/**/*.bench.ts'],
			reporters: ['default'],
		},
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/*.bench.ts', 'src/**/*.d.ts'],
			thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 },
			reportsDirectory: 'coverage',
			reporter: ['text-summary', 'json', 'html'],
			skipFull: true,
			reportOnFailure: true,
		},
		reporters: ['default', 'json'],
		outputFile: { json: 'coverage/test-results.json' },
		projects: [
			{
				extends: true,
				test: {
					name: 'schemas-common',
					root: 'packages/shared/schemas/common',
				},
			},
			{
				extends: true,
				test: {
					name: 'schemas-result',
					root: 'packages/shared/schemas/result',
				},
			},
			{
				extends: true,
				test: {
					name: 'schemas-function',
					root: 'packages/shared/schemas/function',
				},
			},
			{
				extends: true,
				test: {
					name: 'schemas-generic',
					root: 'packages/shared/schemas/generic',
				},
			},
			{
				extends: true,
				test: {
					name: 'utils-result',
					root: 'packages/shared/utils/result',
				},
			},
			{
				extends: true,
				test: {
					name: 'utils-core',
					root: 'packages/shared/utils/core',
				},
			},
			{
				extends: true,
				test: {
					name: 'locale',
					root: 'packages/shared/locale',
				},
			},
			{
				extends: true,
				test: {
					name: 'runtime',
					root: 'packages/products/webforge/runtime',
					setupFiles: ['./src/test-setup.ts'],
					server: {
						deps: {
							inline: [
								'@babylonjs/core',
								'@babylonjs/materials',
								'@babylonjs/loaders',
								'@babylonjs/gui',
							],
						},
					},
				},
			},
			{
				extends: true,
				test: {
					name: 'plugin-api',
					root: 'packages/products/webforge/plugin-api',
				},
			},
			{
				extends: true,
				plugins: [svelte({ hot: false }), svelteTesting()],
				test: {
					name: 'editor',
					root: 'packages/products/webforge/editor',
					environment: 'jsdom',
					globals: true,
					setupFiles: ['./src/test-setup-component.ts'],
					alias: {
						$lib: 'packages/products/webforge/editor/src/lib',
						'$lib/*': 'packages/products/webforge/editor/src/lib/*',
					},
					server: {
						deps: {
							inline: ['@lucide/svelte', 'bits-ui', 'mode-watcher', 'runed', 'svelte-toolbelt'],
						},
					},
				},
			},
		],
	},
});
