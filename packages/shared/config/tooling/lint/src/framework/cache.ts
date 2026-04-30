/**
 * Custom Linter — File Hash Cache
 *
 * Caches file content hashes and lint results for incremental runs.
 * When a file hasn't changed (same hash), cached results are reused
 * instead of re-running all rules. Cache invalidates when rules change.
 *
 * @module
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

import * as v from 'valibot';

import type { LintResult } from '@/lint/framework/types.ts';

// =============================================================================
// Constants
// =============================================================================

/** Current cache format version. Bump this to invalidate all caches. */
const CACHE_VERSION: string = '2';

/** Default cache file name. */
export const CACHE_FILENAME: string = '.resist-lint-cache.json';

// =============================================================================
// Types
// =============================================================================

/** Schema for a single cache entry (one file). */
export const CacheEntrySchema = v.strictObject({
  /** MD5 hash of the file content. */
  hash: v.string(),
  /** File modification time (ms since epoch). */
  mtime: v.number(),
  /** Cached lint results for this file. */
  results: v.custom<LintResult[]>((val: unknown): boolean => Array.isArray(val)),
});

/** A single cache entry. See {@link CacheEntrySchema}. */
export type CacheEntry = v.InferOutput<typeof CacheEntrySchema>;

/** Schema for a per-tool, per-package cache entry. */
export const ToolCacheEntrySchema = v.strictObject({
  /** Aggregate hash of all input files (path + mtime + size). */
  inputHash: v.string(),
  /** Cached lint results from this tool for this package. */
  results: v.custom<LintResult[]>((val: unknown): boolean => Array.isArray(val)),
});

/** A single tool cache entry. See {@link ToolCacheEntrySchema}. */
export type ToolCacheEntry = v.InferOutput<typeof ToolCacheEntrySchema>;

/** Schema for the full lint cache file. */
export const LintCacheSchema = v.strictObject({
  /** Cache format version. */
  version: v.string(),
  /** Hash of all rule IDs — invalidates cache when rules change. */
  ruleHash: v.string(),
  /** Map of file path → cached entry. */
  entries: v.record(v.string(), CacheEntrySchema),
  /** Map of `<toolName>|<pkgDir>` → cached tool entry. */
  toolEntries: v.record(v.string(), ToolCacheEntrySchema),
  /** Aggregate fingerprint of the last-linted file set (path+mtime+size).
   * When the current invocation's fingerprint matches, we know no input file
   * has changed and the entire per-file rule loop can be short-circuited. */
  workspaceFingerprint: v.optional(v.string()),
});

/** The full lint cache. See {@link LintCacheSchema}. */
export type LintCacheData = v.InferOutput<typeof LintCacheSchema>;

// =============================================================================
// Cache Class
// =============================================================================

/**
 * File hash cache for incremental lint runs.
 *
 * Stores MD5 hashes of file contents alongside their lint results.
 * When a file is checked, its current hash is compared to the cached hash.
 * If they match, cached results are returned without re-linting.
 *
 * The cache also tracks a "rule hash" — a hash of all rule IDs. When rules
 * are added, removed, or renamed, the entire cache is invalidated.
 *
 * @example
 * ```typescript
 * const cache = LintCache.load('/path/to/.resist-lint-cache.json', ruleHash);
 * const cached = cache.get('src/foo.ts', fileContent);
 * if (cached) {
 *   // Use cached results
 * } else {
 *   const results = await runRules(file, content);
 *   cache.set('src/foo.ts', fileContent, results);
 * }
 * cache.save('/path/to/.resist-lint-cache.json');
 * ```
 */
export class LintCache {
  /** Internal cache data. */
  private data: LintCacheData;

  /** Number of cache hits in this session. */
  private hitCount: number = 0;

  /** Number of cache misses in this session. */
  private missCount: number = 0;

  /**
   * Create a new cache instance.
   *
   * @param {LintCacheData} data - Initial cache data
   */
  constructor(data: LintCacheData) {
    this.data = data;
  }

  /**
   * Load a cache from disk.
   *
   * If the file doesn't exist, is corrupt, or has a mismatched version/ruleHash,
   * returns an empty cache.
   *
   * @param {string} cachePath - Path to the cache file
   * @param {string} ruleHash - Current rule hash to validate against
   * @returns {LintCache} Loaded or empty cache
   */
  static load(cachePath: string, ruleHash: string): LintCache {
    try {
      const raw: string = readFileSync(cachePath, 'utf8');
      const parsed: unknown = JSON.parse(raw);

      /* Validate shape */
      if (!parsed || typeof parsed !== 'object') {
        return LintCache.empty(ruleHash);
      }

      const obj: Record<string, unknown> = parsed as Record<string, unknown>;

      /* Check version */
      if (obj.version !== CACHE_VERSION) {
        return LintCache.empty(ruleHash);
      }

      /* Check rule hash */
      if (obj.ruleHash !== ruleHash) {
        return LintCache.empty(ruleHash);
      }

      /* Migrate older shapes that lack toolEntries (defensive — CACHE_VERSION
       * bump should already invalidate, but be tolerant). */
      const data: LintCacheData = parsed as LintCacheData;

      if (!data.toolEntries) {
        data.toolEntries = {};
      }
      return new LintCache(data);
    } catch {
      return LintCache.empty(ruleHash);
    }
  }

  /**
   * Create an empty cache.
   *
   * @param {string} ruleHash - Rule hash for this cache
   * @returns {LintCache} Empty cache instance
   */
  static empty(ruleHash: string): LintCache {
    return new LintCache({
      version: CACHE_VERSION,
      ruleHash,
      entries: {},
      toolEntries: {},
    });
  }

  /**
   * Save the cache to disk.
   *
   * @param {string} cachePath - Path to write the cache file
   */
  save(cachePath: string): void {
    try {
      writeFileSync(cachePath, JSON.stringify(this.data), 'utf8');
    } catch {
      /* Cache write failed — non-critical, continue */
    }
  }

  /**
   * Delete a cache file from disk.
   *
   * @param {string} cachePath - Path to the cache file to delete
   */
  static delete(cachePath: string): void {
    try {
      unlinkSync(cachePath);
    } catch {
      /* File doesn't exist or can't be deleted — fine */
    }
  }

  /**
   * Get cached results for a file.
   *
   * Returns null if:
   * - The file is not in the cache
   * - The file content hash doesn't match
   *
   * @param {string} filePath - Absolute file path
   * @param {string} content - Current file content
   * @returns {LintResult[] | null} Cached results or null for cache miss
   */
  get(filePath: string, content: string): LintResult[] | null {
    const entry: CacheEntry | undefined = this.data.entries[filePath];

    if (!entry) {
      this.missCount++;
      return null;
    }

    const currentHash: string = computeHash(content);

    if (entry.hash !== currentHash) {
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return entry.results;
  }

  /**
   * Update the cache with results for a file.
   *
   * @param {string} filePath - Absolute file path
   * @param {string} content - File content
   * @param {LintResult[]} results - Lint results for this file
   */
  set(filePath: string, content: string, results: LintResult[]): void {
    this.data.entries[filePath] = {
      hash: computeHash(content),
      mtime: Date.now(),
      results,
    };
  }

  /**
   * Get cached results for a tool's run on a package.
   *
   * Returns null if no entry exists OR the input fingerprint differs.
   *
   * @param toolName - Tool identifier (e.g. 'svelte-check', 'tsgo')
   * @param pkgDir - Absolute package directory the tool ran in
   * @param inputHash - Fingerprint of the package's input file set
   * @returns Cached results, or null on miss
   */
  getTool(toolName: string, pkgDir: string, inputHash: string): LintResult[] | null {
    const key: string = `${toolName}|${pkgDir}`;
    const entry: ToolCacheEntry | undefined = this.data.toolEntries[key];

    if (!entry) {
      this.missCount++;
      return null;
    }
    if (entry.inputHash !== inputHash) {
      this.missCount++;
      return null;
    }
    this.hitCount++;
    return entry.results;
  }

  /**
   * Update the cache with a tool's results for a package.
   *
   * @param toolName - Tool identifier
   * @param pkgDir - Absolute package directory
   * @param inputHash - Fingerprint of the input file set
   * @param results - Tool diagnostics for this package
   */
  setTool(toolName: string, pkgDir: string, inputHash: string, results: LintResult[]): void {
    const key: string = `${toolName}|${pkgDir}`;
    this.data.toolEntries[key] = { inputHash, results };
  }

  /**
   * Get the cached aggregate workspace fingerprint, or null if none stored.
   *
   * @returns Hex-encoded fingerprint or null
   */
  getWorkspaceFingerprint(): string | null {
    return this.data.workspaceFingerprint ?? null;
  }

  /**
   * Store a new aggregate workspace fingerprint.
   *
   * @param fingerprint - Hex-encoded fingerprint of the input file set
   */
  setWorkspaceFingerprint(fingerprint: string): void {
    this.data.workspaceFingerprint = fingerprint;
  }

  /**
   * Bulk-fetch cached results for a list of file paths without per-file
   * content hashing. Caller MUST have already verified the workspace
   * fingerprint matches — otherwise stale results may be returned.
   *
   * Files not present in the cache are silently skipped.
   *
   * @param filePaths - Absolute paths to fetch
   * @returns Concatenated cached results in input order
   */
  getAllByPath(filePaths: readonly string[]): LintResult[] {
    const out: LintResult[] = [];

    for (const f of filePaths) {
      const entry: CacheEntry | undefined = this.data.entries[f];

      if (entry) {
        out.push(...entry.results);
      }
    }
    return out;
  }

  /**
   * Get the number of cache hits in this session.
   *
   * @returns {number} Hit count
   */
  getHitCount(): number {
    return this.hitCount;
  }

  /**
   * Get the number of cache misses in this session.
   *
   * @returns {number} Miss count
   */
  getMissCount(): number {
    return this.missCount;
  }

  /**
   * Get the total number of cached entries.
   *
   * @returns {number} Entry count
   */
  getEntryCount(): number {
    return Object.keys(this.data.entries).length;
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Compute an MD5 hash of a string.
 *
 * @param {string} content - String to hash
 * @returns {string} Hex-encoded MD5 hash
 */
export function computeHash(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

/**
 * Compute a hash representing the current set of rules AND their
 * resolved severity from the user's `.resist-lint.jsonc` config.
 *
 * When rules are added, removed, renamed, OR have their severity
 * flipped (e.g. `"off"` → `"error"`), this hash changes, causing the
 * entire cache to invalidate. Hashing only `ruleIds` (the previous
 * behavior) was a bug: a rule flipping from `"off"` to `"error"`
 * leaves the rule-id set unchanged, so the cache reused stale
 * "no diagnostics" results for files whose content hadn't changed,
 * silently hiding the newly-active rule's findings.
 *
 * @param {string[]} ruleIds - Array of all loaded rule IDs (unsorted OK).
 * @param {Record<string, unknown>} rulesConfig - The merged `rules` map
 *   from `.resist-lint.jsonc` (rule-id → severity, "off" / "warn" /
 *   "error" / `[severity, options]`). Object key order is normalized
 *   internally so callers don't need to sort.
 * @returns {string} Hex-encoded MD5 hash of (rule IDs + resolved rules map).
 */
export function computeRuleHash(
  ruleIds: string[],
  rulesConfig: Record<string, unknown> = {},
): string {
  const sortedIds: string[] = [...ruleIds].toSorted();
  const sortedKeys: string[] = Object.keys(rulesConfig).toSorted();
  const sortedRules: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    sortedRules[key] = rulesConfig[key];
  }

  const payload: string = `${sortedIds.join('\n')}\n----\n${JSON.stringify(sortedRules)}`;

  return computeHash(payload);
}
