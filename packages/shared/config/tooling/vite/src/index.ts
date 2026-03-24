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
 * ```typescript
 * import { sveltekit } from '@sveltejs/kit/vite';
 * import tailwindcss from '@tailwindcss/vite';
 * import { createViteConfig } from '@/config/tooling/vite';
 *
 * export default createViteConfig({
 *   plugins: [tailwindcss(), sveltekit()],
 * });
 * ```
 */

import * as v from 'valibot';
import { defineConfig, type UserConfig, type PluginOption } from 'vite';
import type { Str, Bool, Path } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import { getGitInfo, getPackageVersion, type GitInfo } from '@/utils/core/git';
import { safeStringify } from '@/utils/core/object';

/**
 * Stringify a value for Vite define injection.
 *
 * Wraps safeStringify and throws at the integration boundary if
 * serialization fails (should never happen for build metadata primitives).
 *
 * @param {unknown} value - The value to stringify
 * @returns {Str} JSON-serialized string
 *
 * @example
 * ```typescript
 * const json = jsonDefine('hello');
 * // json === '"hello"'
 * ```
 */
function jsonDefine(value: unknown): Str {
  const result: Result<Str> = safeStringify(value);
  if (!result.ok) throw result.error; // integration boundary: Vite config must not silently fail
  return result.data;
}

// =============================================================================
// Factory
// =============================================================================

/** Schema for Vite configuration factory options. */
const CreateViteConfigOptionsSchema = v.strictObject({
  /** Vite plugins to include (required — each product provides its own). */
  plugins: v.custom<PluginOption[]>((): Bool => true), // cast safe: external Vite type, validated by Vite at runtime
  /** Packages to exclude from SSR externalization. */
  ssrNoExternal: v.optional(v.array(v.string()), ['@lucide/svelte']),
  /** Additional define entries to merge with git metadata. */
  extraDefines: v.optional(v.record(v.string(), v.string()), {}),
  /** Additional Vite UserConfig to spread (deep merge is NOT performed). */
  extraConfig: v.optional(
    v.custom<Partial<UserConfig>>((): Bool => true),
    {},
  ), // cast safe: external Vite type
});

/** Options for the shared Vite configuration factory. See {@link CreateViteConfigOptionsSchema}. */
export type CreateViteConfigOptions = v.InferOutput<typeof CreateViteConfigOptionsSchema>;

/** Input type for {@link createViteConfig} — optional fields may be omitted. */
export type CreateViteConfigInput = v.InferInput<typeof CreateViteConfigOptionsSchema>;

/**
 * Create a complete Vite configuration.
 *
 * Provides git metadata defines, server watch ignores, and SSR config.
 * Each product supplies its own plugins and optional overrides.
 *
 * @param {CreateViteConfigInput} options - Configuration options (validated via {@link CreateViteConfigOptionsSchema})
 * @returns {UserConfig} Vite UserConfig via defineConfig
 *
 * @example
 * ```typescript
 * // Minimal usage
 * export default createViteConfig({
 *   plugins: [sveltekit()],
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Full usage with overrides
 * export default createViteConfig({
 *   plugins: [tailwindcss(), previewWsPlugin(), sveltekit(), devtoolsJson()],
 *   ssrNoExternal: ['@lucide/svelte', 'some-other-pkg'],
 *   extraDefines: { __CUSTOM_FLAG__: '"true"' },
 * });
 * ```
 */
export function createViteConfig(options: CreateViteConfigInput): UserConfig {
  const optionsResult: Result<CreateViteConfigOptions> = safeParse(
    CreateViteConfigOptionsSchema,
    options,
  );
  if (!optionsResult.ok) throw optionsResult.error; // integration boundary: Vite doesn't understand Result

  const { plugins, ssrNoExternal, extraDefines, extraConfig }: CreateViteConfigOptions =
    optionsResult.data as CreateViteConfigOptions; // cast safe: safeParse validates and fills defaults

  const gitResult: Result<GitInfo> = getGitInfo();
  if (!gitResult.ok) throw gitResult.error; // integration boundary: Vite doesn't understand Result

  // cast safe: string literal is a valid non-empty path
  const versionResult: Result<Str> = getPackageVersion('./package.json' as Path);
  if (!versionResult.ok) throw versionResult.error; // integration boundary: Vite doesn't understand Result

  const git: GitInfo = gitResult.data;
  const version: Str = versionResult.data;

  return defineConfig({
    plugins: [...plugins],
    define: {
      __APP_VERSION__: jsonDefine(version),
      __GIT_COMMIT__: jsonDefine(git.commit),
      __GIT_COMMIT_FULL__: jsonDefine(git.commitFull),
      __GIT_BRANCH__: jsonDefine(git.branch),
      __GIT_DIRTY__: jsonDefine(git.dirty),
      __BUILD_TIMESTAMP__: jsonDefine(new Date().toISOString()),
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
      noExternal: [...ssrNoExternal],
    },
    ...extraConfig,
  });
}
