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
import { baseTestConfig } from './base.ts';

/**
 * Options for configuring a Node.js Vitest preset.
 */
export type NodeTestOptions = {
  /** Package name for the self-referencing alias (e.g. '@/cli'). */
  packageName?: string;
  /** The calling file's `import.meta.dirname` — required when `packageName` is set. */
  dirname?: string;
  /** Additional test file patterns beyond the default include globs. */
  include?: string[];
  /** Additional patterns to exclude from coverage */
  coverageExclude?: string[];
};

/**
 * Creates a Vitest configuration for Node.js packages.
 *
 * @param options - Customisation options (package alias, extra includes, coverage excludes)
 * @returns A complete Vitest `UserConfig` with the Node environment
 */
export function createNodeTestConfig(options: NodeTestOptions = {}): ViteUserConfig {
  const { packageName, dirname, include = [], coverageExclude = [] } = options;
  const alias = packageName && dirname ? { [packageName]: resolve(dirname, './src') } : {};

  const base = baseTestConfig ?? {};

  return defineConfig({
    test: {
      ...base,
      environment: 'node',
      include: [...(base.include ?? []), ...include],
      coverage: {
        ...base.coverage,
        exclude: [...(base.coverage?.exclude ?? []), ...coverageExclude],
      },
    },
    resolve: Object.keys(alias).length > 0 ? { alias } : undefined,
  });
}
