import path from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tsconfigPaths(), svelte({ hot: false }), svelteTesting()],
	resolve: {
		alias: {
			'$app/environment': path.resolve(import.meta.dirname, 'src/test-mocks/app-environment.ts'),
		},
	},
	test: {
		name: 'editor',
		environment: 'jsdom',
		globals: true,
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
		exclude: ['e2e/**'],
		setupFiles: ['./src/test-setup-component.ts'],
		server: {
			deps: {
				inline: ['@lucide/svelte', 'bits-ui', 'mode-watcher', 'runed', 'svelte-toolbelt'],
			},
		},
		reporters: ['default'],
	},
});
