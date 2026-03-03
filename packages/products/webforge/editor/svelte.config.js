import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../../..');

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'dist',
			assets: 'dist',
			fallback: 'index.html',
		}),
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
