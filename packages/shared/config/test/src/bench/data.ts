/**
 * Benchmark data generators for creating consistent, reproducible test data at scale.
 *
 * @module
 *
 * Use these utilities to generate data outside of `bench()` calls so the generation
 * cost is excluded from the measurement. Data is deterministic (based on index/position)
 * so benchmarks produce consistent results across runs.
 *
 * @example
 * ```typescript
 * import { describe, bench } from 'vitest';
 * import { generateStrings, generateFilePaths, generateObjects } from '@/test-presets/bench/data';
 *
 * // Pre-generate data outside bench() calls
 * const strings1k = generateStrings(1_000);
 * const paths10k = generateFilePaths(10_000);
 * const users = generateObjects(5_000, (i) => ({ id: i, name: `user-${i}`, active: i % 2 === 0 }));
 *
 * describe('string processing throughput', () => {
 *   bench('process 1k strings', () => {
 *     strings1k.forEach(processString);
 *   });
 *
 *   bench('filter 10k file paths', () => {
 *     paths10k.filter((p) => p.endsWith('.ts'));
 *   });
 *
 *   bench('serialize 5k users', () => {
 *     JSON.stringify(users);
 *   });
 * });
 * ```
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Options for generating file paths.
 */
export type GenerateFilePathsOptions = {
  /**
   * File extensions to cycle through.
   * @default ['.ts', '.js', '.json', '.svelte']
   */
  extensions?: string[];

  /**
   * Maximum directory nesting depth.
   * @default 4
   */
  maxDepth?: number;

  /**
   * Base directory prefix for all paths.
   * @default 'src'
   */
  base?: string;
};

// =============================================================================
// Constants
// =============================================================================

/**
 * Character set used for generating random strings.
 * Includes lowercase letters and digits for realistic-looking data.
 */
const CHARS: string = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Directory name segments used for generating realistic file paths.
 */
const DIR_SEGMENTS: readonly string[] = [
  'src',
  'lib',
  'utils',
  'components',
  'hooks',
  'services',
  'api',
  'types',
  'schemas',
  'routes',
  'handlers',
  'adapters',
  'domain',
  'config',
  'tests',
  'helpers',
  'models',
  'views',
  'controllers',
  'middleware',
];

/**
 * File name stems used for generating realistic file paths.
 */
const FILE_NAMES: readonly string[] = [
  'index',
  'main',
  'app',
  'config',
  'utils',
  'helpers',
  'types',
  'schema',
  'handler',
  'service',
  'client',
  'server',
  'router',
  'store',
  'context',
  'provider',
  'factory',
  'builder',
  'parser',
  'formatter',
];

// =============================================================================
// API
// =============================================================================

/**
 * Generate a deterministic string from an index and target length.
 * Not cryptographically random — optimized for speed and reproducibility.
 *
 * @param {number} index - Seed index for deterministic generation
 * @param {number} length - Target length of the generated string
 * @returns {string} A deterministic string of the specified length
 */
function deterministicString(index: number, length: number): string {
  const chars: string[] = [];
  let seed: number = index;

  for (let i: number = 0; i < length; i++) {
    chars.push(CHARS[seed % CHARS.length] ?? '');
    seed = (seed * 31 + 7) % 2_147_483_647;
  }

  return chars.join('');
}

/**
 * Generate an array of deterministic strings for benchmarking.
 *
 * Strings are generated using a fast deterministic algorithm (not `Math.random()`),
 * so the same `count` and `length` always produce the same output.
 *
 * @param {number} count - Number of strings to generate
 * @param {number} length - Length of each string in characters. Default: `80`
 * @returns {string[]} Array of generated strings
 *
 * @example
 * ```typescript
 * import { generateStrings } from '@/test-presets/bench/data';
 *
 * // Generate 10k strings of 80 chars each:
 * const strings = generateStrings(10_000);
 *
 * // Generate 1k short strings (for key lookup benchmarks):
 * const keys = generateStrings(1_000, 8);
 *
 * // Use in a benchmark:
 * bench('lowercase transform', () => {
 *   strings.forEach((s) => s.toLowerCase());
 * });
 * ```
 */
export function generateStrings(count: number, length: number = 80): string[] {
  const result: string[] = [];

  for (let i: number = 0; i < count; i++) {
    result.push(deterministicString(i, length));
  }

  return result;
}

/**
 * Generate realistic-looking file paths for benchmarking file processing code.
 *
 * Paths use real-looking directory names (`src`, `utils`, `components`, etc.)
 * and file names (`index`, `config`, `handler`, etc.) with configurable
 * extensions and nesting depth.
 *
 * @param {number} count - Number of paths to generate
 * @param {GenerateFilePathsOptions} options - Path generation configuration
 * @returns {string[]} Array of file path strings (e.g., `'src/utils/helpers/parser.ts'`)
 *
 * @example
 * ```typescript
 * import { generateFilePaths } from '@/test-presets/bench/data';
 *
 * // Default paths (TypeScript project structure):
 * const paths = generateFilePaths(5_000);
 * // e.g., ['src/utils/index.ts', 'src/components/helpers/config.js', ...]
 *
 * // Custom extensions for a Svelte project:
 * const sveltePaths = generateFilePaths(3_000, {
 *   extensions: ['.svelte', '.ts', '.css'],
 *   maxDepth: 3,
 * });
 *
 * // Benchmarking glob matching:
 * bench('glob filter', () => {
 *   paths.filter((p) => p.match(/src\/.*\.ts$/));
 * });
 * ```
 */
export function generateFilePaths(count: number, options: GenerateFilePathsOptions = {}): string[] {
  const {
    extensions = ['.ts', '.js', '.json', '.svelte'],
    maxDepth = 4,
    base = 'src',
  }: GenerateFilePathsOptions = options;

  const result: string[] = [];

  for (let i: number = 0; i < count; i++) {
    // Deterministic depth: 1 to maxDepth
    const depth: number = (i % maxDepth) + 1;

    const segments: string[] = [base];
    let seed: number = i;

    for (let d: number = 0; d < depth - 1; d++) {
      segments.push(DIR_SEGMENTS[seed % DIR_SEGMENTS.length] ?? '');
      seed = (seed * 31 + 7) % 2_147_483_647;
    }

    const fileName: string | undefined = FILE_NAMES[seed % FILE_NAMES.length];
    const ext: string | undefined = extensions[i % extensions.length];
    segments.push(`${fileName}${ext}`);

    result.push(segments.join('/'));
  }

  return result;
}

/**
 * Generate typed objects using a factory function.
 *
 * A thin wrapper around `Array.from` that communicates intent and provides
 * a clean API for generating benchmark datasets.
 *
 * @typeParam T - The type of objects to generate
 * @param {number} count - Number of objects to generate
 * @param {(index: number) => T} factory - Function that creates one object given its index (0-based)
 * @returns {T[]} Array of generated objects
 *
 * @example
 * ```typescript
 * import { generateObjects } from '@/test-presets/bench/data';
 *
 * // Generate user objects:
 * const users = generateObjects(10_000, (i) => ({
 *   id: i,
 *   name: `user-${i}`,
 *   email: `user-${i}@example.com`,
 *   active: i % 3 !== 0,
 * }));
 *
 * // Generate task result objects:
 * const results = generateObjects(5_000, (i) => ({
 *   file: `/src/file-${i}.ts`,
 *   status: i % 10 === 0 ? 'error' : 'success',
 *   duration: (i * 7) % 500,
 * }));
 *
 * bench('filter active users', () => {
 *   users.filter((u) => u.active);
 * });
 * ```
 */
export function generateObjects<T>(count: number, factory: (index: number) => T): T[] {
  return Array.from({ length: count }, (_: unknown, i: number): T => factory(i));
}

/**
 * Create a large string of a given byte size for throughput benchmarking.
 *
 * Generates a string by repeating a pattern until the target size is reached.
 * Useful for benchmarking parsers, serializers, and I/O operations.
 *
 * @param {number} bytes - Target size in bytes (characters for ASCII patterns)
 * @param {string} pattern - Repeating character or string. Default: `'x'`
 * @returns {string} A string of approximately the requested byte size
 *
 * @example
 * ```typescript
 * import { generatePayload } from '@/test-presets/bench/data';
 *
 * // 1 MB payload:
 * const large = generatePayload(1024 * 1024);
 *
 * // JSON-like payload:
 * const json = generatePayload(100_000, '{"key":"value"},');
 *
 * bench('parse large payload', () => {
 *   processPayload(large);
 * });
 *
 * bench('parse 100KB JSON array', () => {
 *   JSON.parse(`[${json.slice(0, -1)}]`);
 * });
 * ```
 */
export function generatePayload(bytes: number, pattern: string = 'x'): string {
  if (pattern.length === 0) {
    throw new Error('generatePayload: pattern must not be empty');
  }

  if (pattern.length === 1) {
    return pattern.repeat(bytes);
  }

  const repetitions: number = Math.ceil(bytes / pattern.length);

  return pattern.repeat(repetitions).slice(0, bytes);
}

/**
 * Generate nested object structures for deep traversal benchmarks.
 *
 * Creates a tree where each node has `breadth` children, up to `depth` levels.
 * Leaf nodes contain a string value. Useful for benchmarking recursive algorithms,
 * deep cloning, serialization, and tree traversal.
 *
 * Total nodes: approximately `breadth^depth` (exponential — keep depth small).
 *
 * @param {number} depth - Number of nesting levels. Keep ≤ 8 to avoid excessive memory.
 * @param {number} breadth - Number of children per node. Default: `3`
 * @returns {Record<string, unknown>} A nested object tree
 *
 * @example
 * ```typescript
 * import { generateNestedObjects } from '@/test-presets/bench/data';
 *
 * // Moderate tree: 3^4 = 81 leaf nodes
 * const tree = generateNestedObjects(4, 3);
 *
 * // Wide shallow tree: 10^2 = 100 leaf nodes
 * const wide = generateNestedObjects(2, 10);
 *
 * bench('deep clone', () => {
 *   structuredClone(tree);
 * });
 *
 * bench('JSON round-trip', () => {
 *   JSON.parse(JSON.stringify(tree));
 * });
 * ```
 */
export function generateNestedObjects(depth: number, breadth: number = 3): Record<string, unknown> {
  if (depth <= 0) {
    return { value: 'leaf' };
  }

  const node: Record<string, unknown> = {};

  for (let i: number = 0; i < breadth; i++) {
    node[`child_${i}`] = generateNestedObjects(depth - 1, breadth);
  }

  return node;
}
