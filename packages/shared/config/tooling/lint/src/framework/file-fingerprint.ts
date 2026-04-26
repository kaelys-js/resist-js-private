/**
 * Custom Linter — File Fingerprinting
 *
 * Cheap aggregate hash of a set of files based on (path, mtime, size) tuples.
 * Used by the tool cache (svelte-check / tsgo per-package result cache) to
 * decide if a package's inputs have changed since the last cached run.
 *
 * `(path, mtime, size)` is the standard tool-cache fingerprint approach
 * (used by webpack, esbuild, biome). It catches every real edit without
 * the cost of reading 1000+ file contents on every invocation.
 *
 * @module
 */

import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';

/**
 * Compute an aggregate sha256 fingerprint of the given files.
 *
 * For each file the fingerprint includes path, mtime (ms), and size.
 * Missing files contribute a sentinel so the hash still differs from a
 * run where the file existed. Inputs are sorted for deterministic output.
 *
 * @param files - Absolute file paths to fingerprint
 * @returns Hex-encoded sha256 hash
 */
export function fingerprintFiles(files: readonly string[]): string {
  const h: ReturnType<typeof createHash> = createHash('sha256');
  const sorted: string[] = [...files].toSorted();
  for (const f of sorted) {
    try {
      const s: import('node:fs').Stats = statSync(f);
      h.update(`${f}:${s.mtimeMs}:${s.size}\n`);
    } catch {
      h.update(`${f}:MISSING\n`);
    }
  }
  return h.digest('hex');
}
