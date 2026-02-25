import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vite';

const __dirname: string = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	root: __dirname,
	plugins: [tsconfigPaths({ root: resolve(__dirname, '../../../..') })],
	server: {
		port: 3100,
		host: true,
	},
	resolve: {
		alias: {
			'@babylonjs/inspector': '@babylonjs/inspector',
		},
	},
});
