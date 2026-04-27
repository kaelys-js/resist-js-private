/**
 * Tests for the File Hash Cache.
 *
 * Tests cache operations: store/retrieve, hash validation,
 * cache invalidation, and disk persistence.
 *
 * @module
 */

import { describe, expect, it, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import type { LintResult } from './types.ts';
import { LintCache, computeHash, computeRuleHash } from './cache.ts';

// =============================================================================
// Test helpers
// =============================================================================

/**
 * Generate a unique temp file path for cache tests.
 *
 * @returns A unique temporary file path string
 */
function tempCachePath(): string {
  return join(
    tmpdir(),
    `.test-lint-cache-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );
}

/**
 * Clean up a temp file if it exists.
 *
 * @param path - Path to the temp file to remove
 */
function cleanup(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    /* fine */
  }
}

/**
 * Create a mock LintResult.
 *
 * @param ruleId - Rule ID for the mock result
 * @param file - File path for the mock result
 * @returns A LintResult with default values
 */
function mockResult(ruleId: string, file: string): LintResult {
  return {
    ruleId,
    file,
    line: 1,
    column: 1,
    severity: 'warning',
    message: 'test message',
    fix: { range: { start: 0, end: 0 }, text: '' },
  };
}

// =============================================================================
// computeHash
// =============================================================================

describe('computeHash', () => {
  it('returns a hex string', () => {
    const hash: string = computeHash('hello world');
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it('returns same hash for same content', () => {
    expect(computeHash('test')).toBe(computeHash('test'));
  });

  it('returns different hash for different content', () => {
    expect(computeHash('hello')).not.toBe(computeHash('world'));
  });
});

// =============================================================================
// computeRuleHash
// =============================================================================

describe('computeRuleHash', () => {
  it('returns a hex string', () => {
    const hash: string = computeRuleHash(['rule/a', 'rule/b']);
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it('returns same hash regardless of input order', () => {
    expect(computeRuleHash(['rule/b', 'rule/a'])).toBe(computeRuleHash(['rule/a', 'rule/b']));
  });

  it('returns different hash when rules change', () => {
    expect(computeRuleHash(['rule/a'])).not.toBe(computeRuleHash(['rule/a', 'rule/b']));
  });

  it('returns different hash when a rule severity flips off→error', () => {
    const ids: string[] = ['rule/a'];
    const off: string = computeRuleHash(ids, { 'rule/a': 'off' });
    const on: string = computeRuleHash(ids, { 'rule/a': 'error' });
    expect(off).not.toBe(on);
  });

  it('returns different hash when a rule entry is added with off severity', () => {
    const ids: string[] = ['rule/a', 'rule/b'];
    const without: string = computeRuleHash(ids, { 'rule/a': 'error' });
    const withB: string = computeRuleHash(ids, { 'rule/a': 'error', 'rule/b': 'off' });
    expect(without).not.toBe(withB);
  });

  it('returns same hash regardless of rules-map key order', () => {
    const ids: string[] = ['rule/a', 'rule/b'];
    const ab: string = computeRuleHash(ids, { 'rule/a': 'error', 'rule/b': 'warn' });
    const ba: string = computeRuleHash(ids, { 'rule/b': 'warn', 'rule/a': 'error' });
    expect(ab).toBe(ba);
  });

  it('returns same hash when rulesConfig defaults to empty', () => {
    expect(computeRuleHash(['rule/a'])).toBe(computeRuleHash(['rule/a'], {}));
  });
});

// =============================================================================
// LintCache — basic operations
// =============================================================================

describe('LintCache — basic operations', () => {
  it('empty cache returns null for unknown files', () => {
    const cache: LintCache = LintCache.empty('test-hash');
    expect(cache.get('/path/to/file.ts', 'content')).toBeNull();
  });

  it('stores and retrieves results', () => {
    const cache: LintCache = LintCache.empty('test-hash');
    const results: LintResult[] = [mockResult('rule/a', '/path/to/file.ts')];

    cache.set('/path/to/file.ts', 'content', results);
    const cached: LintResult[] | null = cache.get('/path/to/file.ts', 'content');

    expect(cached).not.toBeNull();
    expect(cached).toHaveLength(1);
    expect(cached?.[0]?.ruleId).toBe('rule/a');
  });

  it('returns null when content changes (cache miss)', () => {
    const cache: LintCache = LintCache.empty('test-hash');
    cache.set('/path/to/file.ts', 'original content', []);

    const cached: LintResult[] | null = cache.get('/path/to/file.ts', 'modified content');
    expect(cached).toBeNull();
  });

  it('tracks hit count', () => {
    const cache: LintCache = LintCache.empty('test-hash');
    cache.set('/path/to/file.ts', 'content', []);

    cache.get('/path/to/file.ts', 'content');
    cache.get('/path/to/file.ts', 'content');

    expect(cache.getHitCount()).toBe(2);
  });

  it('tracks miss count', () => {
    const cache: LintCache = LintCache.empty('test-hash');

    cache.get('/path/to/file.ts', 'content');
    cache.get('/path/to/other.ts', 'content');

    expect(cache.getMissCount()).toBe(2);
  });

  it('reports entry count', () => {
    const cache: LintCache = LintCache.empty('test-hash');
    expect(cache.getEntryCount()).toBe(0);

    cache.set('/path/a.ts', 'a', []);
    cache.set('/path/b.ts', 'b', []);
    expect(cache.getEntryCount()).toBe(2);
  });
});

// =============================================================================
// LintCache — disk persistence
// =============================================================================

describe('LintCache — disk persistence', () => {
  const cachePaths: string[] = [];

  afterEach(() => {
    for (const path of cachePaths) {
      cleanup(path);
    }
    cachePaths.length = 0;
  });

  it('saves and loads from disk', () => {
    const path: string = tempCachePath();
    cachePaths.push(path);

    const cache: LintCache = LintCache.empty('rule-hash-1');
    cache.set('/path/to/file.ts', 'content', [mockResult('rule/a', '/path/to/file.ts')]);
    cache.save(path);

    const loaded: LintCache = LintCache.load(path, 'rule-hash-1');
    const cached: LintResult[] | null = loaded.get('/path/to/file.ts', 'content');

    expect(cached).not.toBeNull();
    expect(cached).toHaveLength(1);
  });

  it('returns empty cache for missing file', () => {
    const loaded: LintCache = LintCache.load('/nonexistent/path.json', 'hash');
    expect(loaded.getEntryCount()).toBe(0);
  });

  it('returns empty cache for corrupt file', () => {
    const path: string = tempCachePath();
    cachePaths.push(path);

    writeFileSync(path, 'not valid json {{{{', 'utf8');

    const loaded: LintCache = LintCache.load(path, 'hash');
    expect(loaded.getEntryCount()).toBe(0);
  });

  it('returns empty cache when version mismatches', () => {
    const path: string = tempCachePath();
    cachePaths.push(path);

    writeFileSync(path, JSON.stringify({ version: 'old', ruleHash: 'hash', entries: {} }), 'utf8');

    const loaded: LintCache = LintCache.load(path, 'hash');
    expect(loaded.getEntryCount()).toBe(0);
  });

  it('returns empty cache when ruleHash mismatches', () => {
    const path: string = tempCachePath();
    cachePaths.push(path);

    const cache: LintCache = LintCache.empty('old-rules');
    cache.set('/path/file.ts', 'content', []);
    cache.save(path);

    const loaded: LintCache = LintCache.load(path, 'new-rules');
    expect(loaded.getEntryCount()).toBe(0);
  });

  it('deletes cache file', () => {
    const path: string = tempCachePath();
    cachePaths.push(path);

    writeFileSync(path, '{}', 'utf8');
    expect(existsSync(path)).toBe(true);

    LintCache.delete(path);
    expect(existsSync(path)).toBe(false);
  });

  it('delete on nonexistent file does not throw', () => {
    expect(() => LintCache.delete('/nonexistent/path.json')).not.toThrow();
  });
});

// =============================================================================
// Tool cache (per-package, per-tool result cache)
// =============================================================================

describe('LintCache.getTool / setTool', () => {
  const cachePaths: string[] = [];

  afterEach(() => {
    for (const path of cachePaths) {
      cleanup(path);
    }
    cachePaths.length = 0;
  });

  it('returns null when no tool entry exists', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    expect(cache.getTool('tsgo', '/pkg/a', 'fp1')).toBeNull();
  });

  it('returns cached results when fingerprint matches', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    const results: LintResult[] = [
      {
        file: '/pkg/a/src/x.ts',
        line: 1,
        column: 1,
        severity: 'error',
        message: 'TS error',
        ruleId: 'tsgo/TS2322',
        fix: { range: { start: 0, end: 0 }, text: '' },
      },
    ];
    cache.setTool('tsgo', '/pkg/a', 'fp1', results);
    expect(cache.getTool('tsgo', '/pkg/a', 'fp1')).toEqual(results);
  });

  it('returns null when fingerprint differs', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    cache.setTool('tsgo', '/pkg/a', 'fp1', []);
    expect(cache.getTool('tsgo', '/pkg/a', 'fp2')).toBeNull();
  });

  it('keys entries by toolName so two tools can cache the same package independently', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    const tsgoResults: LintResult[] = [];
    const svelteResults: LintResult[] = [
      {
        file: '/pkg/a/src/A.svelte',
        line: 5,
        column: 3,
        severity: 'warning',
        message: 'mismatch',
        ruleId: 'svelte-check/warning',
        fix: { range: { start: 0, end: 0 }, text: '' },
      },
    ];
    cache.setTool('tsgo', '/pkg/a', 'fp1', tsgoResults);
    cache.setTool('svelte-check', '/pkg/a', 'fp1', svelteResults);
    expect(cache.getTool('tsgo', '/pkg/a', 'fp1')).toEqual(tsgoResults);
    expect(cache.getTool('svelte-check', '/pkg/a', 'fp1')).toEqual(svelteResults);
  });

  it('keys entries by pkgDir so two packages can cache the same tool independently', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    cache.setTool('tsgo', '/pkg/a', 'fp1', []);
    cache.setTool('tsgo', '/pkg/b', 'fp1', []);
    expect(cache.getTool('tsgo', '/pkg/a', 'fp1')).toEqual([]);
    expect(cache.getTool('tsgo', '/pkg/b', 'fp1')).toEqual([]);
  });

  it('overwrites prior entry on second setTool call', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    cache.setTool('tsgo', '/pkg/a', 'fp1', []);
    const newResults: LintResult[] = [
      {
        file: '/pkg/a/src/x.ts',
        line: 9,
        column: 1,
        severity: 'error',
        message: 'new',
        ruleId: 'tsgo/TS9999',
        fix: { range: { start: 0, end: 0 }, text: '' },
      },
    ];
    cache.setTool('tsgo', '/pkg/a', 'fp2', newResults);
    expect(cache.getTool('tsgo', '/pkg/a', 'fp1')).toBeNull();
    expect(cache.getTool('tsgo', '/pkg/a', 'fp2')).toEqual(newResults);
  });

  it('persists tool entries across save/load', () => {
    const path: string = tempCachePath();
    cachePaths.push(path);

    const cache: LintCache = LintCache.empty('rule-hash');
    const results: LintResult[] = [
      {
        file: '/pkg/a/src/x.ts',
        line: 1,
        column: 1,
        severity: 'error',
        message: 'TS error',
        ruleId: 'tsgo/TS2322',
        fix: { range: { start: 0, end: 0 }, text: '' },
      },
    ];
    cache.setTool('tsgo', '/pkg/a', 'fp1', results);
    cache.save(path);

    const loaded: LintCache = LintCache.load(path, 'rule-hash');
    expect(loaded.getTool('tsgo', '/pkg/a', 'fp1')).toEqual(results);
  });

  it('increments hit counter on tool cache hit', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    cache.setTool('tsgo', '/pkg/a', 'fp1', []);
    const before: number = cache.getHitCount();
    cache.getTool('tsgo', '/pkg/a', 'fp1');
    expect(cache.getHitCount()).toBe(before + 1);
  });

  it('increments miss counter on tool cache miss', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    const before: number = cache.getMissCount();
    cache.getTool('tsgo', '/pkg/a', 'fp1');
    expect(cache.getMissCount()).toBe(before + 1);
  });

  it('migrates pre-v2 caches missing toolEntries to empty toolEntries', () => {
    const path: string = tempCachePath();
    cachePaths.push(path);

    /* Write a "version 2" cache that lacks the toolEntries key (defensive
     * migration path). The runtime should not crash; getTool should miss. */
    writeFileSync(
      path,
      JSON.stringify({ version: '2', ruleHash: 'rule-hash', entries: {} }),
      'utf8',
    );

    const loaded: LintCache = LintCache.load(path, 'rule-hash');
    expect(loaded.getTool('tsgo', '/pkg/a', 'fp1')).toBeNull();
  });
});

// =============================================================================
// Workspace fingerprint short-circuit
// =============================================================================

describe('LintCache.getWorkspaceFingerprint / setWorkspaceFingerprint', () => {
  const cachePaths: string[] = [];

  afterEach(() => {
    for (const path of cachePaths) {
      cleanup(path);
    }
    cachePaths.length = 0;
  });

  it('getWorkspaceFingerprint returns null on a fresh cache', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    expect(cache.getWorkspaceFingerprint()).toBeNull();
  });

  it('setWorkspaceFingerprint persists for subsequent get calls', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    cache.setWorkspaceFingerprint('abc123');
    expect(cache.getWorkspaceFingerprint()).toBe('abc123');
  });

  it('setWorkspaceFingerprint overwrites prior value', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    cache.setWorkspaceFingerprint('first');
    cache.setWorkspaceFingerprint('second');
    expect(cache.getWorkspaceFingerprint()).toBe('second');
  });

  it('persists across save/load', () => {
    const path: string = tempCachePath();
    cachePaths.push(path);

    const cache: LintCache = LintCache.empty('rule-hash');
    cache.setWorkspaceFingerprint('persistent-fp');
    cache.save(path);

    const loaded: LintCache = LintCache.load(path, 'rule-hash');
    expect(loaded.getWorkspaceFingerprint()).toBe('persistent-fp');
  });

  it('getAllByPath returns empty array when no entries match', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    expect(cache.getAllByPath(['/path/missing.ts'])).toEqual([]);
  });

  it('getAllByPath returns concatenated results for files in the cache', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    const aResults: LintResult[] = [
      {
        file: '/pkg/a/x.ts',
        line: 1,
        column: 1,
        severity: 'error',
        message: 'A',
        ruleId: 'r/A',
        fix: { range: { start: 0, end: 0 }, text: '' },
      },
    ];
    const bResults: LintResult[] = [
      {
        file: '/pkg/b/y.ts',
        line: 2,
        column: 1,
        severity: 'warning',
        message: 'B',
        ruleId: 'r/B',
        fix: { range: { start: 0, end: 0 }, text: '' },
      },
    ];
    cache.set('/pkg/a/x.ts', 'content-a', aResults);
    cache.set('/pkg/b/y.ts', 'content-b', bResults);

    const out: LintResult[] = cache.getAllByPath(['/pkg/a/x.ts', '/pkg/b/y.ts']);
    expect(out).toHaveLength(2);
    expect(out[0]?.message).toBe('A');
    expect(out[1]?.message).toBe('B');
  });

  it('getAllByPath skips paths missing from the cache without error', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    cache.set('/pkg/a/x.ts', 'content', [
      {
        file: '/pkg/a/x.ts',
        line: 1,
        column: 1,
        severity: 'error',
        message: 'A',
        ruleId: 'r/A',
        fix: { range: { start: 0, end: 0 }, text: '' },
      },
    ]);
    const out: LintResult[] = cache.getAllByPath([
      '/pkg/a/x.ts',
      '/pkg/missing.ts',
      '/pkg/also-missing.ts',
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.message).toBe('A');
  });

  it('getAllByPath preserves input order', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    const a: LintResult = {
      file: '/a.ts',
      line: 1,
      column: 1,
      severity: 'error',
      message: 'A',
      ruleId: 'r/A',
      fix: { range: { start: 0, end: 0 }, text: '' },
    };
    const b: LintResult = {
      file: '/b.ts',
      line: 1,
      column: 1,
      severity: 'error',
      message: 'B',
      ruleId: 'r/B',
      fix: { range: { start: 0, end: 0 }, text: '' },
    };
    cache.set('/a.ts', 'ac', [a]);
    cache.set('/b.ts', 'bc', [b]);

    expect(cache.getAllByPath(['/a.ts', '/b.ts'])[0]?.message).toBe('A');
    expect(cache.getAllByPath(['/b.ts', '/a.ts'])[0]?.message).toBe('B');
  });

  it('migrates pre-β cache (no workspaceFingerprint) cleanly to null', () => {
    const path: string = tempCachePath();
    cachePaths.push(path);

    /* Cache shape from before β: version 2, no workspaceFingerprint key. */
    writeFileSync(
      path,
      JSON.stringify({
        version: '2',
        ruleHash: 'rule-hash',
        entries: {},
        toolEntries: {},
      }),
      'utf8',
    );

    const loaded: LintCache = LintCache.load(path, 'rule-hash');
    expect(loaded.getWorkspaceFingerprint()).toBeNull();
  });
});

// =============================================================================
// Workspace rule cache (per-rule input-fingerprint cache)
// =============================================================================

describe('Workspace rule cache via getTool/setTool', () => {
  it('uses `workspace:<ruleId>` namespace + synthetic / pkgDir', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    const results: LintResult[] = [
      {
        file: '/docs/plans/2026-04-24-foo.md',
        line: 12,
        column: 1,
        severity: 'error',
        message: 'incomplete task',
        ruleId: 'plans/no-incomplete-tasks',
        fix: { range: { start: 0, end: 0 }, text: '' },
      },
    ];
    cache.setTool('workspace:plans/no-incomplete-tasks', '/', 'fp1', results);

    /* Same key returns cached. */
    expect(cache.getTool('workspace:plans/no-incomplete-tasks', '/', 'fp1')).toEqual(results);

    /* Different ruleId is independent. */
    expect(cache.getTool('workspace:plans/files-exist', '/', 'fp1')).toBeNull();

    /* Different fingerprint invalidates. */
    expect(cache.getTool('workspace:plans/no-incomplete-tasks', '/', 'fp2')).toBeNull();
  });

  it('two workspace rules can cache against same fingerprint independently', () => {
    const cache: LintCache = LintCache.empty('rule-hash');
    const a: LintResult[] = [
      {
        file: '/a',
        line: 1,
        column: 1,
        severity: 'error',
        message: 'A',
        ruleId: 'plans/files-exist',
        fix: { range: { start: 0, end: 0 }, text: '' },
      },
    ];
    const b: LintResult[] = [
      {
        file: '/b',
        line: 1,
        column: 1,
        severity: 'error',
        message: 'B',
        ruleId: 'plans/no-empty-plan-sections',
        fix: { range: { start: 0, end: 0 }, text: '' },
      },
    ];
    cache.setTool('workspace:plans/files-exist', '/', 'shared-fp', a);
    cache.setTool('workspace:plans/no-empty-plan-sections', '/', 'shared-fp', b);
    expect(cache.getTool('workspace:plans/files-exist', '/', 'shared-fp')).toEqual(a);
    expect(cache.getTool('workspace:plans/no-empty-plan-sections', '/', 'shared-fp')).toEqual(b);
  });
});
