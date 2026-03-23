/**
 * Benchmark data generation utilities for vitest bench files.
 *
 * Pre-generate data outside of `bench()` calls so generation cost is excluded
 * from measurements. All generators are deterministic for reproducible results.
 *
 * @example
 * ```typescript
 * import { generateStrings, generateFilePaths, generateObjects, generatePayload } from '@/test-presets/bench';
 * ```
 *
 * @module
 */

export {
  generateStrings,
  generateFilePaths,
  generateObjects,
  generatePayload,
  generateNestedObjects,
  type GenerateFilePathsOptions,
} from './data.ts';
