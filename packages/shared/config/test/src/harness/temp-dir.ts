/**
 * Temporary directory utilities for test lifecycle management.
 *
 * Eliminates the repetitive pattern of `mkdtempSync` + `rmSync` in beforeEach/afterEach
 * hooks. Provides a managed `TempDir` object with convenience methods for writing,
 * reading, and resolving paths relative to the temp directory.
 *
 * Two usage patterns:
 * - **Manual**: `createTempDir()` — caller manages lifecycle (call `cleanup()` when done)
 * - **Hook-based**: `useTempDir()` — auto create/cleanup per test via beforeEach/afterEach
 *
 * @example
 * ```typescript
 * import { describe, it, expect, beforeEach, afterEach } from 'vitest';
 * import { useTempDir } from '@/config/test/harness/temp-dir';
 *
 * describe('config loader', () => {
 *   const getTempDir = useTempDir({ beforeEach, afterEach });
 *
 *   it('reads config from disk', () => {
 *     const dir = getTempDir();
 *     dir.write('config.json', JSON.stringify({ port: 3000 }));
 *     const config = loadConfig(dir.path);
 *     expect(config.port).toBe(3000);
 *   });
 * });
 * ```
 *
 * @module
 */

import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

/**
 * A managed temporary directory with convenience methods for file operations.
 *
 * All relative paths are resolved against the temp directory root.
 * Parent directories are created automatically when writing files.
 */
export type TempDir = {
  /** Absolute path to the temp directory. */
  readonly path: string;

  /**
   * Write a file relative to the temp directory.
   * Creates parent directories automatically if they don't exist.
   *
   * @param relativePath - Path relative to the temp dir (e.g., 'src/index.ts')
   * @param content - File content as a string
   * @returns Absolute path to the written file
   *
   * @example
   * ```typescript
   * const filePath = dir.write('src/index.ts', 'export const x = 1;');
   * // filePath: '/tmp/test-abc123/src/index.ts'
   * ```
   */
  write(relativePath: string, content: string): string;

  /**
   * Create a directory relative to the temp directory.
   * Creates parent directories automatically (like `mkdir -p`).
   *
   * @param relativePath - Directory path relative to the temp dir
   * @returns Absolute path to the created directory
   *
   * @example
   * ```typescript
   * const dirPath = dir.mkdir('src/utils');
   * // dirPath: '/tmp/test-abc123/src/utils'
   * ```
   */
  mkdir(relativePath: string): string;

  /**
   * Resolve a path relative to the temp directory without creating anything.
   *
   * @param segments - Path segments to join (e.g., 'src', 'index.ts')
   * @returns Absolute path
   *
   * @example
   * ```typescript
   * const configPath = dir.resolve('config', 'app.json');
   * // configPath: '/tmp/test-abc123/config/app.json'
   * ```
   */
  resolve(...segments: string[]): string;

  /**
   * Read a file relative to the temp directory as a UTF-8 string.
   *
   * @param relativePath - Path relative to the temp dir
   * @returns File contents as a string
   * @throws If the file does not exist
   *
   * @example
   * ```typescript
   * dir.write('data.txt', 'hello');
   * expect(dir.read('data.txt')).toBe('hello');
   * ```
   */
  read(relativePath: string): string;

  /**
   * Check if a path exists relative to the temp directory.
   *
   * @param relativePath - Path relative to the temp dir
   * @returns `true` if the path exists (file or directory)
   *
   * @example
   * ```typescript
   * dir.write('file.txt', 'content');
   * expect(dir.exists('file.txt')).toBe(true);
   * expect(dir.exists('missing.txt')).toBe(false);
   * ```
   */
  exists(relativePath: string): boolean;

  /**
   * Remove the temp directory and all its contents.
   * Called automatically by `useTempDir` in the afterEach hook.
   * Safe to call multiple times.
   */
  cleanup(): void;
};

/**
 * Create a managed temporary directory.
 *
 * The caller is responsible for calling `cleanup()` when done. For automatic
 * lifecycle management tied to test hooks, use `useTempDir()` instead.
 *
 * @param prefix - Prefix for the temp directory name. Default: `'test-'`
 * @returns A `TempDir` instance with convenience methods
 *
 * @example
 * ```typescript
 * import { createTempDir } from '@/config/test/harness/temp-dir';
 *
 * const dir = createTempDir('my-test-');
 * try {
 *   dir.write('package.json', '{}');
 *   // ... run test logic ...
 * } finally {
 *   dir.cleanup();
 * }
 * ```
 */
export function createTempDir(prefix = 'test-'): TempDir {
  const path = mkdtempSync(join(tmpdir(), prefix));

  return {
    path,

    write(relativePath: string, content: string): string {
      const fullPath = join(path, relativePath);
      const dir = dirname(fullPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(fullPath, content, 'utf8');
      return fullPath;
    },

    mkdir(relativePath: string): string {
      const fullPath = join(path, relativePath);
      mkdirSync(fullPath, { recursive: true });
      return fullPath;
    },

    resolve(...segments: string[]): string {
      return join(path, ...segments);
    },

    read(relativePath: string): string {
      return readFileSync(join(path, relativePath), 'utf8');
    },

    exists(relativePath: string): boolean {
      return existsSync(join(path, relativePath));
    },

    cleanup(): void {
      rmSync(path, { recursive: true, force: true });
    },
  };
}

/**
 * Register `beforeEach`/`afterEach` hooks that create and clean up a temp
 * directory for each test. Returns a getter function that provides the current
 * test's `TempDir`.
 *
 * Must be called at the `describe` block level (not inside `it`).
 *
 * @param hooks - Object containing `beforeEach` and `afterEach` functions
 *   (pass them explicitly from vitest to support `globals: false`)
 * @param prefix - Prefix for the temp directory name. Default: `'test-'`
 * @returns A getter function `() => TempDir` that returns the current test's temp dir
 *
 * @example
 * ```typescript
 * import { describe, it, expect, beforeEach, afterEach } from 'vitest';
 * import { useTempDir } from '@/config/test/harness/temp-dir';
 *
 * describe('file writer', () => {
 *   const getTempDir = useTempDir({ beforeEach, afterEach });
 *
 *   it('creates output file', () => {
 *     const dir = getTempDir();
 *     writeOutput(dir.path, 'result.txt', 'done');
 *     expect(dir.exists('result.txt')).toBe(true);
 *     expect(dir.read('result.txt')).toBe('done');
 *   });
 *
 *   it('creates nested structure', () => {
 *     const dir = getTempDir();
 *     dir.write('src/utils/helper.ts', 'export const x = 1;');
 *     dir.write('src/index.ts', 'export { x } from "./utils/helper";');
 *     expect(dir.exists('src/utils/helper.ts')).toBe(true);
 *   });
 * });
 * ```
 */
export function useTempDir(
  hooks: {
    beforeEach: (fn: () => void) => void;
    afterEach: (fn: () => void) => void;
  },
  prefix = 'test-',
): () => TempDir {
  let current: TempDir | undefined;

  hooks.beforeEach(() => {
    current = createTempDir(prefix);
  });

  hooks.afterEach(() => {
    current?.cleanup();
    current = undefined;
  });

  return (): TempDir => {
    if (!current) {
      throw new Error(
        'useTempDir: no temp dir available. Ensure this is called inside a test ' +
          '(after beforeEach has run). Did you call useTempDir() at the describe level?',
      );
    }
    return current;
  };
}
