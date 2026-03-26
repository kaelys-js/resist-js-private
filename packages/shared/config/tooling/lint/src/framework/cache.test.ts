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

/** Generate a unique temp file path for cache tests. */
function tempCachePath(): string {
  return join(
    tmpdir(),
    `.test-lint-cache-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );
}

/** Clean up a temp file if it exists. */
function cleanup(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    /* fine */
  }
}

/** Create a mock LintResult. */
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
