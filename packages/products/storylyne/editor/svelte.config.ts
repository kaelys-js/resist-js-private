/**
 * SvelteKit configuration for the Storylyne editor.
 *
 * Uses the shared factory from `@/config/tooling/svelte` which auto-syncs
 * aliases from root tsconfig.json, adds CSP, git versioning, and vitePreprocess.
 *
 * @module
 */

import adapter from '@sveltejs/adapter-cloudflare';
import { createSvelteConfig } from '@/config/tooling/svelte';
import type { Config } from '@sveltejs/kit';

/** Storylyne editor SvelteKit configuration. */
const config: Config = createSvelteConfig({
  adapter: adapter({
    platformProxy: {
      persist: true,
    },
  }),
});

export default config;
