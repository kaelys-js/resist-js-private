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
import type { Str, Bool, Command, Path } from '@/schemas/common';
import { ok, err, ERRORS, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import { execSyncSafe } from '@/utils/core/shell';
import { readFile, parseJsonWithComments } from '@/utils/core/fs';
import { safeStringify } from '@/utils/core/object';

// =============================================================================
// Git metadata
// =============================================================================

/** Schema for git metadata used in build-time injection. */
const GitInfoSchema = v.strictObject({
  /** Short commit hash (7 characters). */
  commit: v.pipe(v.string(), v.length(7)),
  /** Full commit hash (40 characters). */
  commitFull: v.pipe(v.string(), v.length(40)),
  /** Current branch name. */
  branch: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
  /** Whether the working tree has uncommitted changes. */
  dirty: v.boolean(),
});

/** Git metadata for build-time injection. */
type GitInfo = v.InferOutput<typeof GitInfoSchema>;

/**
 * Reads git metadata for build-time injection.
 *
 * Uses the shared execSyncSafe utility for type-safe command execution.
 * Returns a Result so callers can handle failures explicitly.
 *
 * @returns {Result<GitInfo>} Git commit (short + full), branch name, and dirty flag
 *
 * @example
 * ```typescript
 * const result = getGitInfo();
 * if (!result.ok) return result;
 * console.log(result.data.commit);
 * ```
 */
function getGitInfo(): Result<GitInfo> {
  const commitResult: Result<Str> = execSyncSafe('git rev-parse --short HEAD' as Command); // cast safe: literal is non-empty
  if (!commitResult.ok) return commitResult;

  const fullResult: Result<Str> = execSyncSafe('git rev-parse HEAD' as Command); // cast safe: literal is non-empty
  if (!fullResult.ok) return fullResult;

  const branchResult: Result<Str> = execSyncSafe('git rev-parse --abbrev-ref HEAD' as Command); // cast safe: literal is non-empty
  if (!branchResult.ok) return branchResult;

  const porcelainResult: Result<Str> = execSyncSafe('git status --porcelain' as Command); // cast safe: literal is non-empty
  if (!porcelainResult.ok) return porcelainResult;

  return ok(GitInfoSchema, {
    commit: commitResult.data,
    commitFull: fullResult.data,
    branch: branchResult.data,
    dirty: porcelainResult.data.trim().length > 0,
  });
}

/**
 * Reads the package version from the calling product's package.json.
 *
 * Uses the shared readFile and parseJsonWithComments utilities.
 *
 * @returns {Result<Str>} Package version string
 *
 * @example
 * ```typescript
 * const result = getPackageVersion();
 * if (!result.ok) return result;
 * console.log(result.data);
 * ```
 */
function getPackageVersion(): Result<Str> {
  const fileResult: Result<Str> = readFile('./package.json' as Path); // cast safe: literal is non-empty
  if (!fileResult.ok) return fileResult;

  const parsed: Result<Record<Str, unknown>> = parseJsonWithComments<Record<Str, unknown>>(fileResult.data);
  if (!parsed.ok) return parsed;

  const { version }: Record<Str, unknown> = parsed.data;
  if (typeof version !== 'string' || version.length === 0) {
    return err(ERRORS.CONFIG.INVALID, { meta: { field: 'version', file: './package.json' } });
  }
  return ok(v.string(), version);
}

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
  extraConfig: v.optional(v.custom<Partial<UserConfig>>((): Bool => true), {}), // cast safe: external Vite type
});

/** Options for the shared Vite configuration factory. See {@link CreateViteConfigOptionsSchema}. */
export type CreateViteConfigOptions = v.InferOutput<typeof CreateViteConfigOptionsSchema>;

/**
 * Create a complete Vite configuration.
 *
 * Provides git metadata defines, server watch ignores, and SSR config.
 * Each product supplies its own plugins and optional overrides.
 *
 * @param {CreateViteConfigOptions} options - Configuration options (validated via {@link CreateViteConfigOptionsSchema})
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
export function createViteConfig(
  options: CreateViteConfigOptions,
): UserConfig {
  const optionsResult: Result<CreateViteConfigOptions> = safeParse(
    CreateViteConfigOptionsSchema,
    options,
  );
  if (!optionsResult.ok) throw optionsResult.error; // integration boundary: Vite doesn't understand Result

  const { plugins, ssrNoExternal, extraDefines, extraConfig } = optionsResult.data;

  const gitResult: Result<GitInfo> = getGitInfo();
  if (!gitResult.ok) throw gitResult.error; // integration boundary: Vite doesn't understand Result

  const versionResult: Result<Str> = getPackageVersion();
  if (!versionResult.ok) throw versionResult.error; // integration boundary: Vite doesn't understand Result

  const git: GitInfo = gitResult.data;
  const version: Str = versionResult.data;

  return defineConfig({
    plugins,
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
      noExternal: ssrNoExternal,
    },
    ...extraConfig,
  });
}

