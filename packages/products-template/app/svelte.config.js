/**
 * SvelteKit configuration for the product template.
 *
 * Uses the shared factory from `@/config/tooling/svelte` which auto-syncs
 * aliases from root tsconfig.json, adds CSP, git versioning, and vitePreprocess.
 *
 * Dynamic import is required because `svelte.config.js` is loaded by bare Node
 * before Vite starts — Node ESM cannot resolve deeply-nested workspace package
 * names like `@/config/tooling/svelte`.
 */

import adapter from '@sveltejs/adapter-static';
import path from 'node:path';

/** Monorepo root directory (3 levels up from template app package). */
const root = path.resolve(import.meta.dirname, '../../..');

const { createSvelteConfig } = await import(
  path.join(root, 'packages/shared/config/tooling/svelte/src/index.js')
);

/** @type {import('@sveltejs/kit').Config} */
const config = createSvelteConfig({
  adapter: adapter({
    pages: 'build',
    assets: 'build',
    fallback: 'index.html',
    precompress: false,
    strict: true,
  }),
});

export default config;
