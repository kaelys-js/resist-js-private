/**
 * Node Test Preset
 *
 * Vitest configuration factory for Node.js packages.
 * Extends the base preset with `environment: 'node'`.
 *
 * @module
 */

import { resolve } from 'node:path';

import { defineConfig, type ViteUserConfig } from 'vitest/config';
import * as v from 'valibot';

import { NameSchema, PathSchema, type Str } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';
import { baseTestConfig } from '@/test-presets/base';

// =============================================================================
// Schemas
// =============================================================================

/** Schema for Node.js Vitest preset options. */
const NodeTestOptionsSchema = v.strictObject({
  /** Package name for the self-referencing alias (e.g. '@/cli'). */
  packageName: v.optional(NameSchema),
  /** The calling file's `import.meta.dirname` — required when `packageName` is set. */
  dirname: v.optional(PathSchema),
  /** Additional test file patterns beyond the default include globs. */
  include: v.optional(v.array(v.string()), []),
  /** Additional patterns to exclude from coverage. */
  coverageExclude: v.optional(v.array(v.string()), []),
});

/** Options for configuring a Node.js Vitest preset. See {@link NodeTestOptionsSchema}. */
export type NodeTestOptions = v.InferOutput<typeof NodeTestOptionsSchema>;

// =============================================================================
// API
// =============================================================================

/**
 * Creates a Vitest configuration for Node.js packages.
 *
 * @param {NodeTestOptions} rawOptions - Customisation options (package alias, extra includes, coverage excludes)
 * @returns {ViteUserConfig} A complete Vitest `UserConfig` with the Node environment
 *
 * @example
 * ```typescript
 * import { createNodeTestConfig } from '@/test-presets/node';
 * export default createNodeTestConfig({ packageName: '@/cli', dirname: import.meta.dirname });
 * ```
 */
export function createNodeTestConfig(rawOptions: NodeTestOptions): ViteUserConfig {
  const optionsResult: Result<NodeTestOptions> = safeParse(NodeTestOptionsSchema, rawOptions);

  if (!optionsResult.ok) {
    throw optionsResult.error; // integration boundary: vitest config doesn't understand Result
  }

  const { packageName, dirname, include, coverageExclude }: NodeTestOptions =
    // cast safe: safeParse validates, shallow destructure into mutable bindings
    optionsResult.data as NodeTestOptions;
  const alias: Record<Str, Str> =
    packageName && dirname ? { [packageName]: resolve(dirname, './src') } : {};
  const base: ViteUserConfig['test'] = baseTestConfig ?? {};

  return defineConfig({
    test: {
      ...base,
      environment: 'node',
      include: [...(base.include ?? []), ...(include ?? [])],
      coverage: {
        ...base.coverage,
        exclude: [...(base.coverage?.exclude ?? []), ...(coverageExclude ?? [])],
      },
    },
    resolve: Object.keys(alias).length > 0 ? { alias } : undefined,
  });
}
