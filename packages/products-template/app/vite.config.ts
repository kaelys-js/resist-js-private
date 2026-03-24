/**
 * Vite configuration for the product template.
 *
 * @module
 *
 * Uses the shared factory from `@/config/tooling/vite` for git metadata,
 * server watch config, and SSR settings.
 */

import { sveltekit } from '@sveltejs/kit/vite';

import { createViteConfig } from '@/config/tooling/vite';

export default createViteConfig({
  plugins: [sveltekit()],
});
