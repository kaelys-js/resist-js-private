/**
 * SvelteKit configuration for the product template.
 *
 * Uses the shared factory from `@/config/tooling/svelte` which auto-syncs
 * aliases from root tsconfig.json, adds CSP, git versioning, and vitePreprocess.
 *
 * @module
 */

import adapter from '@sveltejs/adapter-static';
import type { Config } from '@sveltejs/kit';

import { createSvelteConfig } from '@/config/tooling/svelte';

/** Product template SvelteKit configuration. */
const config: Config = createSvelteConfig({
  adapter: adapter({
    pages: 'build',
    assets: 'build',
    fallback: 'index.html',
    precompress: false,
    strict: true,
  }),
});

export default config;
