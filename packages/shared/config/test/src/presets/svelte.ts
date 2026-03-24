/**
 * Svelte Test Preset
 *
 * Vitest configuration factory for Svelte component packages.
 * Extends the base preset with jsdom environment, Svelte Vite plugin,
 * and globals enabled (required by Testing Library).
 *
 * @module
 */

import { resolve } from 'node:path';

import { defineConfig, type ViteUserConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import * as v from 'valibot';

import { NameSchema, PathSchema, type Str, type Bool } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';
import { baseTestConfig } from '@/test-presets/base';

// =============================================================================
// Schemas
// =============================================================================

/** Schema for Svelte Vitest preset options. */
const SvelteTestOptionsSchema = v.strictObject({
  /** Package name for the self-referencing alias (e.g. '@/ui'). */
  packageName: v.optional(NameSchema),
  /** The calling file's `import.meta.dirname` — required when `packageName` is set. */
  dirname: v.optional(PathSchema),
  /** Additional test file patterns beyond the default include globs. */
  include: v.optional(v.array(v.string()), []),
  /** Additional patterns to exclude from coverage. */
  coverageExclude: v.optional(v.array(v.string()), []),
  /** Additional Vite plugins. */
  plugins: v.optional(
    v.custom<ViteUserConfig['plugins']>((): Bool => true),
    [],
  ), // cast safe: external Vite type
});

/** Options for configuring a Svelte Vitest preset. See {@link SvelteTestOptionsSchema}. */
export type SvelteTestOptions = v.InferOutput<typeof SvelteTestOptionsSchema>;

// =============================================================================
// API
// =============================================================================

/**
 * Creates a Vitest configuration for Svelte component packages.
 *
 * @param {SvelteTestOptions} rawOptions - Customisation options (package alias, extra includes, coverage excludes, plugins)
 * @returns {ViteUserConfig} A complete Vitest `UserConfig` with jsdom environment and Svelte plugin
 *
 * @example
 * ```typescript
 * import { createSvelteTestConfig } from '@/test-presets/svelte';
 * export default createSvelteTestConfig({ packageName: '@/ui', dirname: import.meta.dirname });
 * ```
 */
export function createSvelteTestConfig(rawOptions: SvelteTestOptions): ViteUserConfig {
  const optionsResult: Result<SvelteTestOptions> = safeParse(SvelteTestOptionsSchema, rawOptions);

  if (!optionsResult.ok) {
    throw optionsResult.error; // integration boundary: vitest config doesn't understand Result
  }

  // cast safe: safeParse validates, shallow destructure into mutable bindings
  const { packageName, dirname, include, coverageExclude, plugins }: SvelteTestOptions =
    optionsResult.data as SvelteTestOptions;
  const alias: Record<Str, Str> =
    packageName && dirname ? { [packageName]: resolve(dirname, './src') } : {};
  const base: ViteUserConfig['test'] = baseTestConfig ?? {};

  return defineConfig({
    plugins: [svelte({ hot: false }), ...(plugins ?? [])],
    test: {
      ...base,
      environment: 'jsdom',
      globals: true,
      include: [...(base.include ?? []), ...(include ?? [])],
      coverage: {
        ...base.coverage,
        provider: 'v8',
        include: ['src/**/*.ts', 'src/**/*.svelte'],
        exclude: [...(base.coverage?.exclude ?? []), ...(coverageExclude ?? [])],
      },
    },
    resolve: Object.keys(alias).length > 0 ? { alias } : undefined,
  });
}
