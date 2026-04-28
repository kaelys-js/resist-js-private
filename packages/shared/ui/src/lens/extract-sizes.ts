/**
 * Source size extraction from raw Svelte component sources.
 *
 * Computes raw source byte sizes per component directory from the
 * eager `import.meta.glob('?raw')` map. Used by LensDependencyTree
 * to show file size impact of each dependency.
 *
 * @example
 * ```typescript
 * import { extractSourceSizes, formatBytes } from './extract-sizes.js';
 * const sizes = extractSourceSizes(rawSources, extractDir);
 * // { button: 1420, dialog: 3200, badge: 680 }
 * console.log(formatBytes(sizes['button'])); // '1.4 kB'
 * ```
 *
 * @module
 */
import type { Num, Str } from '@/schemas/common';

/**
 * Compute raw source sizes per component directory.
 *
 * Iterates the raw source map (keyed by glob path), extracts the
 * component directory name via `extractDirFn`, and sums the
 * `String.length` of all files in each directory.
 *
 * @param allSources - Map of glob keys → raw source strings
 * @param extractDirFn - Function to extract directory name from a glob key
 * @returns Map of component directory → total source character count
 *
 * @example
 * ```typescript
 * const sizes = extractSourceSizes(rawSources, extractDir);
 * // { button: 1420, dialog: 3200 }
 * ```
 */
export function extractSourceSizes(
  allSources: Record<Str, Str>,
  extractDirFn: (key: Str) => Str,
): Record<Str, Num> {
  const sizes: Record<Str, Num> = {};

  for (const [key, source] of Object.entries(allSources)) {
    const dir: Str = extractDirFn(key);
    if (!dir) {
      continue;
    }
    sizes[dir] = ((sizes[dir] ?? 0) + source.length) as Num;
  }

  return sizes;
}

/**
 * Format a byte count into a human-readable string.
 *
 * Uses B for values under 1024, kB for kilobytes, MB for megabytes.
 * Always uses one decimal place for kB and MB.
 *
 * @param bytes - The byte count to format
 * @returns Formatted string like '1.4 kB' or '512 B'
 *
 * @example
 * ```typescript
 * formatBytes(0);       // '0 B'
 * formatBytes(1536);    // '1.5 kB'
 * formatBytes(1048576); // '1.0 MB'
 * ```
 */
export function formatBytes(bytes: Num): Str {
  if (bytes < 1024) {
    return `${String(bytes)} B` as Str;
  }
  if (bytes < 1_048_576) {
    return `${(bytes / 1024).toFixed(1)} kB` as Str;
  }
  return `${(bytes / 1_048_576).toFixed(1)} MB` as Str;
}
