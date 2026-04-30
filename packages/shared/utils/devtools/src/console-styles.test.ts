/**
 * Tests for the console-styles devtools utilities — colour
 * tokens, timestamp formatter, and snapshot diff helper.
 *
 * @module
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { styles, formatTimestamp, diffSnapshot } from './console-styles';
import type { Str } from '@/schemas/common';

describe('styles', () => {
  it('has all expected keys', () => {
    const expected = [
      'storeBadge',
      'propPath',
      'oldValue',
      'newValue',
      'timestamp',
      'debugBadge',
      'warnBadge',
      'errorBadge',
      'keyLabel',
      'valueText',
      'reset',
    ];

    for (const key of expected) {
      expect(styles).toHaveProperty(key);
    }
  });

  it('all values are non-empty strings', () => {
    for (const [key, value] of Object.entries(styles)) {
      expect(typeof value).toBe('string');
      expect(value.length, `styles.${key} should be non-empty`).toBeGreaterThan(0);
    }
  });

  it('has vitals style keys', () => {
    const vitalsKeys = ['vitalPrefix', 'metricName', 'ratingGood', 'ratingWarn', 'ratingPoor'];

    for (const key of vitalsKeys) {
      expect(styles).toHaveProperty(key);
      expect(typeof (styles as Record<string, unknown>)[key]).toBe('string');
    }
  });
});

describe('formatTimestamp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns HH:MM:SS.mmm format', () => {
    // Set a known time: 2026-01-15T14:30:45.123Z
    vi.setSystemTime(new Date('2026-01-15T14:30:45.123Z'));
    const ts: Str = formatTimestamp();
    // Should match HH:MM:SS.mmm pattern (timezone-dependent, so check format only)
    expect(ts).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
  });

  it('includes milliseconds', () => {
    vi.setSystemTime(new Date('2026-06-01T00:00:00.789Z'));
    const ts: Str = formatTimestamp();
    expect(ts).toMatch(/\.789$/);
  });
});

describe('diffSnapshot', () => {
  it('returns empty array for identical objects', () => {
    const obj = { a: 1, b: 'hello' };
    expect(diffSnapshot(obj, { ...obj })).toEqual([]);
  });

  it('detects single changed value', () => {
    const prev = { theme: 'warm', mode: 'light' };
    const next = { theme: 'midnight', mode: 'light' };
    const diffs = diffSnapshot(prev, next);
    expect(diffs).toEqual([{ key: 'theme', old: 'warm', new: 'midnight' }]);
  });

  it('detects multiple changed values', () => {
    const prev = { a: 1, b: 2, c: 3 };
    const next = { a: 10, b: 2, c: 30 };
    const diffs = diffSnapshot(prev, next);
    expect(diffs).toHaveLength(2);
    expect(diffs).toContainEqual({ key: 'a', old: 1, new: 10 });
    expect(diffs).toContainEqual({ key: 'c', old: 3, new: 30 });
  });

  it('detects added keys', () => {
    const prev = { a: 1 };
    const next = { a: 1, b: 2 };
    const diffs = diffSnapshot(prev, next);
    expect(diffs).toEqual([{ key: 'b', old: undefined, new: 2 }]);
  });

  it('detects removed keys', () => {
    const prev = { a: 1, b: 2 };
    const next = { a: 1 };
    const diffs = diffSnapshot(prev, next);
    expect(diffs).toEqual([{ key: 'b', old: 2, new: undefined }]);
  });

  it('detects nested object changes via JSON comparison', () => {
    const prev = { config: { x: 1, y: 2 } };
    const next = { config: { x: 1, y: 99 } };
    const diffs = diffSnapshot(prev, next);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]!.key).toBe('config');
  });

  it('returns empty for both empty objects', () => {
    expect(diffSnapshot({}, {})).toEqual([]);
  });

  it('handles boolean changes', () => {
    const prev = { enabled: true };
    const next = { enabled: false };
    const diffs = diffSnapshot(prev, next);
    expect(diffs).toEqual([{ key: 'enabled', old: true, new: false }]);
  });

  it('treats null vs object as different', () => {
    const prev = { a: null };
    const next = { a: {} };
    const diffs = diffSnapshot(prev as Record<string, unknown>, next);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]!.key).toBe('a');
  });

  it('treats undefined vs missing key as same (both undefined)', () => {
    const prev: Record<string, unknown> = { a: undefined };
    const next: Record<string, unknown> = {};
    const diffs = diffSnapshot(prev, next);
    // Both prev['a'] and next['a'] are undefined — no diff
    expect(diffs).toHaveLength(0);
  });

  it('treats two different object refs with identical JSON as equal', () => {
    const prev = { config: { x: 1, y: 2 } };
    const next = { config: { x: 1, y: 2 } };
    // Different refs but same JSON.stringify → no diff (covers JSON comparison true branch)
    expect(diffSnapshot(prev, next)).toEqual([]);
  });
});
