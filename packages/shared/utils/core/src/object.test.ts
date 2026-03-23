/**
 * Tests for object utilities.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { NonNegativeInteger, Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { deepFreeze, deepMerge, safeStringify } from './object';

// ── deepFreeze ──────────────────────────────────────────────────────────

describe('deepFreeze', () => {
  it('freezes top-level object', () => {
    const obj = { a: 1, b: 'two' };
    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
  });

  it('recursively freezes nested objects', () => {
    const obj = { nested: { deep: { value: 42 } } };
    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen.nested)).toBe(true);
    expect(Object.isFrozen(frozen.nested.deep)).toBe(true);
  });

  it('freezes arrays', () => {
    const obj = { items: [1, 2, 3] };
    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen.items)).toBe(true);
  });

  it('skips already-frozen objects', () => {
    const inner = Object.freeze({ value: 1 });
    const obj = { inner };
    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.inner)).toBe(true);
  });
});

// ── deepMerge ───────────────────────────────────────────────────────────

describe('deepMerge', () => {
  it('merges source overrides into target', () => {
    const target = { a: 1, b: 2 };
    const source = { b: 99 };
    const merged = deepMerge(target, source);
    expect(merged.a).toBe(1);
    expect(merged.b).toBe(99);
  });

  it('preserves target values not in source', () => {
    const target = { a: 1, b: 2, c: 3 };
    const source = { b: 99 };
    const merged = deepMerge(target, source);
    expect(merged.a).toBe(1);
    expect(merged.c).toBe(3);
  });

  it('recursively merges nested objects', () => {
    const target = { db: { host: 'localhost', port: 5432 }, debug: false };
    const source = { db: { host: 'prod.db.com' } };
    const merged = deepMerge(target, source as typeof target);
    expect(merged.db.host).toBe('prod.db.com');
    expect(merged.db.port).toBe(5432);
    expect(merged.debug).toBe(false);
  });

  it('replaces arrays (not concatenates)', () => {
    const target = { items: [1, 2, 3] };
    const source = { items: [4, 5] };
    const merged = deepMerge(target, source);
    expect(merged.items).toEqual([4, 5]);
  });

  it('ignores undefined source values', () => {
    const target = { a: 1, b: 2 };
    const source = { a: undefined };
    const merged = deepMerge(target, source);
    expect(merged.a).toBe(1);
  });
});

// ── safeStringify ───────────────────────────────────────────────────────

describe('safeStringify', () => {
  it('serializes plain object to JSON string', () => {
    const result: Result<Str> = safeStringify({ key: 'value' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const parsed = JSON.parse(result.data);
      expect(parsed.key).toBe('value');
    }
  });

  it('handles circular references with [Circular] placeholder', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    const result: Result<Str> = safeStringify(obj);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('[Circular]');
    }
  });

  it('handles BigInt values with [BigInt: N] placeholder', () => {
    const result: Result<Str> = safeStringify({ big: BigInt(42) } as never);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('[BigInt: 42]');
    }
  });

  it('uses numeric indent', () => {
    const result: Result<Str> = safeStringify({ a: 1 }, 4 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // 4-space indent produces lines starting with 4 spaces
      expect(result.data).toContain('    "a"');
    }
  });

  it('uses string indent (tab)', () => {
    const result: Result<Str> = safeStringify({ a: 1 }, '\t');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('\t"a"');
    }
  });
});
