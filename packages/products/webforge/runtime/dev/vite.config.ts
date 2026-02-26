import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vite';

const __dirname: string = dirname(fileURLToPath(import.meta.url));

const root: string = resolve(__dirname, '../../../../..');
const shared: string = resolve(root, 'packages/shared');

export default defineConfig({
	root: __dirname,
	plugins: [tsconfigPaths({ root })],
	publicDir: resolve(__dirname, '../../../../../assets'),
	server: {
		port: 3100,
		host: true,
	},
	resolve: {
		alias: [
			{ find: '@babylonjs/inspector', replacement: '@babylonjs/inspector' },
			// Exact barrel imports (must come before wildcard patterns)
			{ find: /^@\/schemas\/common$/, replacement: resolve(shared, 'schemas/common/src/index.ts') },
			{
				find: /^@\/schemas\/result$/,
				replacement: resolve(shared, 'schemas/result/src/result.ts'),
			},
			{
				find: /^@\/schemas\/function$/,
				replacement: resolve(shared, 'schemas/function/src/function.ts'),
			},
			{ find: /^@\/utils\/core$/, replacement: resolve(shared, 'utils/core/src/index.ts') },
			{
				find: /^@\/config\/test\/harness$/,
				replacement: resolve(shared, 'config/test/src/harness/index.ts'),
			},
			// Wildcard subpath imports (capture group preserves the subpath)
			{
				find: /^@\/schemas\/result\/(.+)/,
				replacement: `${resolve(shared, 'schemas/result/src')}/$1`,
			},
			{
				find: /^@\/schemas\/function\/(.+)/,
				replacement: `${resolve(shared, 'schemas/function/src')}/$1`,
			},
			{
				find: /^@\/schemas\/generic\/(.+)/,
				replacement: `${resolve(shared, 'schemas/generic/src')}/$1`,
			},
			{
				find: /^@\/utils\/result\/(.+)/,
				replacement: `${resolve(shared, 'utils/result/src')}/$1`,
			},
			{
				find: /^@\/utils\/core\/(.+)/,
				replacement: `${resolve(shared, 'utils/core/src')}/$1`,
			},
			{ find: /^@\/locale\/(.+)/, replacement: `${resolve(shared, 'locale/src')}/$1` },
			{
				find: /^@\/config\/test\/harness\/(.+)/,
				replacement: `${resolve(shared, 'config/test/src/harness')}/$1`,
			},
			{
				find: /^@\/config\/test\/(.+)/,
				replacement: `${resolve(shared, 'config/test/src')}/$1`,
			},
		],
	},
});
