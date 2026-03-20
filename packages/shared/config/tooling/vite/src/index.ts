/**
 * Shared Vite configuration factory.
 *
 * Builds a complete Vite config with git metadata defines, server watch
 * ignores, SSR noExternal, and plugin orchestration. Each product provides
 * its own plugins (tailwind, sveltekit, etc.) and optional overrides.
 *
 * @module
 *
 * @example
 * import { sveltekit } from '@sveltejs/kit/vite';
 * import tailwindcss from '@tailwindcss/vite';
 * import { createViteConfig } from '@/config/tooling/vite';
 *
 * export default createViteConfig({
 *   plugins: [tailwindcss(), sveltekit()],
 * });
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig, type UserConfig, type PluginOption } from 'vite';
import type { Str, Num, Bool } from '@/schemas/common';

/* ------------------------------------------------------------------ */
/*  Git metadata                                                       */
/* ------------------------------------------------------------------ */

/**
 * Reads git metadata for build-time injection.
 *
 * @returns Git commit (short + full), branch name, and dirty flag
 */
function getGitInfo(): {
  commit: Str;
  commitFull: Str;
  branch: Str;
  dirty: Bool;
} {
  try {
    return {
      commit: execSync('git rev-parse --short HEAD').toString().trim(),
      commitFull: execSync('git rev-parse HEAD').toString().trim(),
      branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
      dirty: execSync('git status --porcelain').toString().trim().length > 0,
    };
  } catch {
    /* git unavailable (CI, fresh clone) — non-critical */
    return { commit: 'unknown', commitFull: 'unknown', branch: 'unknown', dirty: false };
  }
}

/**
 * Reads the package version from the calling product's `package.json`.
 *
 * @returns Package version string or 'unknown'
 */
function getPackageVersion(): Str {
  try {
    const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
    return pkg.version ?? 'unknown';
  } catch {
    /* package.json unavailable — non-critical */
    return 'unknown';
  }
}

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

/**
 * Options for the shared Vite configuration factory.
 */
export interface CreateViteConfigOptions {
  /** Vite plugins to include (required — each product provides its own). */
  plugins: PluginOption[];

  /**
   * Packages to exclude from SSR externalization.
   *
   * @default ['@lucide/svelte']
   */
  ssrNoExternal?: Str[];

  /** Additional `define` entries to merge with git metadata. */
  extraDefines?: Record<Str, Str>;

  /** Additional Vite UserConfig to spread (deep merge is NOT performed). */
  extraConfig?: Partial<UserConfig>;
}

/**
 * Create a complete Vite configuration.
 *
 * Provides git metadata defines, server watch ignores, and SSR config.
 * Each product supplies its own plugins and optional overrides.
 *
 * @param options - Configuration options
 * @returns Vite UserConfig via `defineConfig()`
 *
 * @example
 * // Minimal usage
 * export default createViteConfig({
 *   plugins: [sveltekit()],
 * });
 *
 * @example
 * // Full usage with overrides
 * export default createViteConfig({
 *   plugins: [tailwindcss(), previewWsPlugin(), sveltekit(), devtoolsJson()],
 *   ssrNoExternal: ['@lucide/svelte', 'some-other-pkg'],
 *   extraDefines: { __CUSTOM_FLAG__: JSON.stringify(true) },
 * });
 */
export function createViteConfig({
  plugins,
  ssrNoExternal = ['@lucide/svelte'],
  extraDefines = {},
  extraConfig = {},
}: CreateViteConfigOptions) {
  const git = getGitInfo();
  const version: Str = getPackageVersion();

  return defineConfig({
    plugins,
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __GIT_COMMIT__: JSON.stringify(git.commit),
      __GIT_COMMIT_FULL__: JSON.stringify(git.commitFull),
      __GIT_BRANCH__: JSON.stringify(git.branch),
      __GIT_DIRTY__: JSON.stringify(git.dirty),
      __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
      ...extraDefines,
    },
    server: {
      watch: {
        /* Reduce file watcher pressure on macOS — avoids EPERM errors
           when SvelteKit scans routes concurrently with other watchers */
        ignored: ['**/.svelte-kit/**', '**/node_modules/**', '**/.vite/**'],
      },
    },
    ssr: {
      noExternal: ssrNoExternal,
    },
    ...extraConfig,
  });
}

/* ------------------------------------------------------------------ */
/*  Lazy plugin                                                        */
/* ------------------------------------------------------------------ */

/**
 * Options for creating a lazy Vite plugin.
 */
export interface LazyPluginOptions {
  /** Unique plugin name. */
  name: Str;
  /** Module path to load via `ssrLoadModule` (relative to project root). */
  modulePath: Str;
  /** Name of the setup function exported by the module. */
  setupFn: Str;
}

/**
 * Creates a dev-only Vite plugin that defers module loading to `ssrLoadModule`.
 *
 * This avoids esbuild's inability to resolve workspace `@/` aliases at config
 * bundling time. The real module is loaded at runtime through Vite's pipeline
 * which handles TS compilation and alias resolution.
 *
 * @param options - Plugin name, module path, and setup function name
 * @returns Vite plugin that lazily loads the real implementation
 *
 * @example
 * createLazyPlugin({
 *   name: 'lens-preview-ws',
 *   modulePath: './src/lib/server/preview/vite-plugin-preview-ws.ts',
 *   setupFn: 'setupPreviewWs',
 * })
 */
export function createLazyPlugin({ name, modulePath, setupFn }: LazyPluginOptions): PluginOption {
  return {
    name,
    apply: 'serve' as const,

    async configureServer(server): Promise<void> {
      const mod = await server.ssrLoadModule(modulePath);
      mod[setupFn](server);
    },
  };
}

export {
  templateAppHtml,
  templateErrorHtml,
  generateFontFaceCss,
  deriveErrorIdPrefix,
  resolveErrorHtml,
  resolveAppHtml,
} from './vite-plugin-template-html.ts';
export type {
  FontFaceEntry,
  ErrorHtmlConfig,
  AppHtmlConfig,
} from './vite-plugin-template-html.ts';
