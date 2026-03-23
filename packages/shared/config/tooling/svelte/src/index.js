/**
 * Shared SvelteKit configuration factory.
 *
 * Builds a complete SvelteKit config with auto-synced aliases from the root
 * tsconfig.json, CSP directives, git commit versioning, and vitePreprocess.
 *
 * Must be `.js` — SvelteKit loads `svelte.config.js` via Node before any
 * TypeScript tooling is available.
 *
 * @example
 * // packages/products/storylyne/editor/svelte.config.js
 * import adapter from '@sveltejs/adapter-cloudflare';
 * import { createSvelteConfig } from '@/config/tooling/svelte';
 *
 * export default createSvelteConfig({
 *   adapter: adapter({ platformProxy: { persist: true } }),
 * });
 */

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/* ------------------------------------------------------------------ */
/*  Shared template paths                                              */
/* ------------------------------------------------------------------ */

/**
 * Absolute paths to the shared SvelteKit HTML templates.
 *
 * Used by `createSvelteConfig` for `kit.files.appTemplate` / `kit.files.errorTemplate`,
 * and by the Vite template plugins (`templateAppHtml`, `templateErrorHtml`) for
 * in-place placeholder resolution at build time.
 *
 * @type {{ appHtml: string, errorHtml: string }}
 */
export const TEMPLATE_PATHS = {
  appHtml: path.resolve(import.meta.dirname, 'templates/app.html'),
  errorHtml: path.resolve(import.meta.dirname, 'templates/error.html'),
};

/**
 * Walk up from a starting directory to find the monorepo root.
 *
 * Identifies the root by the presence of `pnpm-workspace.yaml`.
 *
 * @param {string} startDir - Directory to start searching from.
 * @returns {string} Absolute path to the monorepo root.
 */
function findMonorepoRoot(startDir) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error(
    `Could not find monorepo root (no pnpm-workspace.yaml found above ${startDir})`,
  );
}

/**
 * Read tsconfig.json paths from the monorepo root and convert them to
 * SvelteKit kit.alias entries.
 *
 * Strips `.ts` extensions from non-wildcard paths since SvelteKit resolves
 * aliases differently from TypeScript. Wildcard paths (`*`) keep their
 * glob pattern but drop the `.ts` suffix.
 *
 * @param {string} root - Absolute path to the monorepo root.
 * @returns {Record<string, string>} Alias map for `kit.alias`.
 */
function buildAliasesFromTsconfig(root) {
  const tsconfigPath = path.join(root, 'tsconfig.json');
  const raw = readFileSync(tsconfigPath, 'utf8');

  // Strip single-line comments (tsconfig allows them via JSONC)
  const stripped = raw.replaceAll(/\/\/.*$/gm, '');
  const tsconfig = JSON.parse(stripped);

  const paths = tsconfig?.compilerOptions?.paths;
  if (!paths) return {};

  /** @type {Record<string, string>} */
  const aliases = {};

  for (const [alias, targets] of Object.entries(paths)) {
    // tsconfig paths are arrays — take the first entry
    const [target] = /** @type {string[]} */ (targets);
    if (!target) continue;

    // Convert relative tsconfig path (e.g. "./packages/shared/...") to absolute,
    // stripping the .ts extension for non-wildcard entries
    let resolved = target;

    if (alias.endsWith('/*')) {
      // Wildcard alias: @/utils/core/* -> ./packages/shared/utils/core/src/*.ts
      // Strip trailing .ts from the glob pattern: *.ts -> *
      resolved = resolved.replace(/\*\.ts$/, '*');
    } else if (!resolved.endsWith('.svelte.ts') && resolved.endsWith('.ts')) {
      // Exact alias: @/schemas/common -> ./packages/shared/schemas/common/src/index.ts
      // Strip .ts extension entirely, BUT keep .svelte.ts
      resolved = resolved.slice(0, -3);
    }

    aliases[alias] = path.join(root, resolved);
  }

  return aliases;
}

/**
 * Get the short git commit hash for version tracking.
 *
 * Used by `kit.version.name` for client-side cache invalidation.
 *
 * @returns {string} Short commit hash or 'unknown' if git is unavailable.
 */
function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    /* git unavailable (CI, fresh clone) — non-critical */
    return 'unknown';
  }
}

/**
 * CSP directives for production builds.
 *
 * Disabled in dev because Vite injects inline HMR scripts that SvelteKit
 * cannot add nonces to, causing CSP violations that block hot reloading.
 *
 * Uses `'auto'` mode: hashes for prerendered pages and nonces for SSR pages.
 *
 * @type {NonNullable<import('@sveltejs/kit').Config['kit']>['csp'] | undefined}
 */
const csp =
  process.env.NODE_ENV === 'production'
    ? {
        mode: /** @type {const} */ ('auto'),
        directives: {
          'default-src': [/** @type {const} */ ('self')],
          'script-src': [/** @type {const} */ ('self'), 'wasm-unsafe-eval'],
          'style-src': [/** @type {const} */ ('self'), 'unsafe-inline'],
          'img-src': [/** @type {const} */ ('self'), 'data:', 'blob:'],
          'font-src': [/** @type {const} */ ('self')],
          'connect-src': [
            /** @type {const} */ ('self'),
            /** @type {any} */ ('ws:'),
            /** @type {any} */ ('wss:'),
          ],
          'worker-src': [/** @type {const} */ ('self'), 'blob:'],
          'child-src': [/** @type {const} */ ('self'), 'blob:'],
          'frame-ancestors': [/** @type {const} */ ('none')],
          'base-uri': [/** @type {const} */ ('self')],
          'form-action': [/** @type {const} */ ('self')],
          'object-src': [/** @type {const} */ ('none')],
        },
      }
    : undefined;

/**
 * Create a complete SvelteKit configuration.
 *
 * Auto-reads aliases from root tsconfig.json so they never go out of sync.
 * Includes CSP, git versioning, and vitePreprocess by default.
 *
 * @param {object} options - Configuration options.
 * @param {import('@sveltejs/kit').Adapter} options.adapter - SvelteKit adapter (required — each product picks their own).
 * @param {boolean} [options.enableCsp] - Whether to enable CSP directives in production.
 * @param {Record<string, string>} [options.extraAliases] - Additional aliases to merge (product-specific).
 * @param {{ appTemplate?: string, errorTemplate?: string }} [options.files] - Custom template paths (override shared defaults).
 * @param {Partial<import('@sveltejs/kit').Config['kit']>} [options.extraKit] - Additional kit options to merge.
 * @returns {import('@sveltejs/kit').Config} Complete SvelteKit config.
 *
 * @example
 * import adapter from '@sveltejs/adapter-cloudflare';
 * import { createSvelteConfig } from '@/config/tooling/svelte';
 *
 * export default createSvelteConfig({
 *   adapter: adapter({ platformProxy: { persist: true } }),
 * });
 *
 * @example
 * // Custom template location for app.html only
 * export default createSvelteConfig({
 *   adapter: adapter(),
 *   files: { appTemplate: './src/custom-app.html' },
 * });
 */
export function createSvelteConfig({
  adapter,
  enableCsp = true,
  extraAliases = {},
  files = {},
  extraKit = {},
}) {
  const root = findMonorepoRoot(process.cwd());
  const aliases = buildAliasesFromTsconfig(root);

  /** @type {import('@sveltejs/kit').Config} */
  const config = {
    preprocess: vitePreprocess(),
    kit: {
      version: {
        name: getGitCommit(),
      },
      adapter,
      files: {
        appTemplate: files.appTemplate ?? TEMPLATE_PATHS.appHtml,
        errorTemplate: files.errorTemplate ?? TEMPLATE_PATHS.errorHtml,
      },
      ...(enableCsp ? { csp } : {}),
      alias: {
        ...aliases,
        ...extraAliases,
      },
      ...extraKit,
    },
  };

  return config;
}
