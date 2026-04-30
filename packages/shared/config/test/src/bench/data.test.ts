/**
 * Tests for benchmark data generators.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import {
  generateFilePaths,
  generateNestedObjects,
  generateObjects,
  generatePayload,
  generateStrings,
} from './data';

describe('bench/data', () => {
  describe('generateStrings', () => {
    it('returns an empty array when count is 0', () => {
      expect(generateStrings(0)).toEqual([]);
    });

    it('returns the requested number of strings', () => {
      const result: string[] = generateStrings(5);
      expect(result).toHaveLength(5);
    });

    it('defaults length to 80 characters', () => {
      const result: string[] = generateStrings(1);
      expect(result[0]?.length).toBe(80);
    });

    it('honors a custom length', () => {
      const result: string[] = generateStrings(3, 12);

      for (const s of result) {
        expect(s).toHaveLength(12);
      }
    });

    it('produces length-0 strings when length is 0', () => {
      const result: string[] = generateStrings(3, 0);
      expect(result).toEqual(['', '', '']);
    });

    it('is deterministic across calls', () => {
      const a: string[] = generateStrings(10, 16);
      const b: string[] = generateStrings(10, 16);
      expect(a).toEqual(b);
    });

    it('produces strings containing only lowercase letters and digits', () => {
      const result: string[] = generateStrings(20, 40);

      for (const s of result) {
        expect(s).toMatch(/^[a-z0-9]+$/);
      }
    });
  });

  describe('generateFilePaths', () => {
    it('returns an empty array when count is 0', () => {
      expect(generateFilePaths(0)).toEqual([]);
    });

    it('returns the requested count', () => {
      expect(generateFilePaths(7)).toHaveLength(7);
    });

    it('defaults to base "src" and default extensions', () => {
      const paths: string[] = generateFilePaths(8);

      for (const p of paths) {
        expect(p.startsWith('src/')).toBe(true);
        expect(p).toMatch(/\.(ts|js|json|svelte)$/);
      }
    });

    it('cycles through extensions in order', () => {
      const paths: string[] = generateFilePaths(8, {
        extensions: ['.a', '.b'],
        maxDepth: 1,
        base: 'root',
      });
      /* With maxDepth=1, every path is just "root/<file><ext>". Extensions alternate. */
      const endings: string[] = paths
        .slice(0, 4)
        .map((p: string): string => (p.endsWith('.a') ? '.a' : '.b'));
      expect(endings).toEqual(['.a', '.b', '.a', '.b']);
    });

    it('honors a custom base directory', () => {
      const paths: string[] = generateFilePaths(3, { base: 'custom' });

      for (const p of paths) {
        expect(p.startsWith('custom/')).toBe(true);
      }
    });

    it('respects maxDepth=1 (base + filename only)', () => {
      const paths: string[] = generateFilePaths(4, { maxDepth: 1, base: 'r' });

      for (const p of paths) {
        /* 2 segments: "r" + file.ext */
        expect(p.split('/')).toHaveLength(2);
      }
    });

    it('cycles depths from 1 to maxDepth', () => {
      const paths: string[] = generateFilePaths(8, { maxDepth: 4, base: 'x' });
      /* Depth = (i % 4) + 1, so segment counts = 2,3,4,5,2,3,4,5 */
      const lengths: number[] = paths.map((p: string): number => p.split('/').length);
      expect(lengths).toEqual([2, 3, 4, 5, 2, 3, 4, 5]);
    });

    it('is deterministic across calls', () => {
      const a: string[] = generateFilePaths(30);
      const b: string[] = generateFilePaths(30);
      expect(a).toEqual(b);
    });

    it('honors a custom extensions array', () => {
      const paths: string[] = generateFilePaths(4, { extensions: ['.zzz'] });

      for (const p of paths) {
        expect(p.endsWith('.zzz')).toBe(true);
      }
    });
  });

  describe('generateObjects', () => {
    it('returns an empty array when count is 0', () => {
      expect(generateObjects(0, (i: number): number => i)).toEqual([]);
    });

    it('invokes the factory with 0-based indices', () => {
      const seen: number[] = [];
      generateObjects(3, (i: number): number => {
        seen.push(i);
        return i;
      });
      expect(seen).toEqual([0, 1, 2]);
    });

    it('returns objects produced by the factory', () => {
      type U = { id: number; name: string };
      const users: U[] = generateObjects<U>(3, (i: number): U => ({ id: i, name: `u${i}` }));
      expect(users).toEqual([
        { id: 0, name: 'u0' },
        { id: 1, name: 'u1' },
        { id: 2, name: 'u2' },
      ]);
    });
  });

  describe('generatePayload', () => {
    it('throws when pattern is empty', () => {
      expect((): string => generatePayload(10, '')).toThrow(/pattern must not be empty/);
    });

    it('defaults to single-char "x" pattern', () => {
      expect(generatePayload(5)).toBe('xxxxx');
    });

    it('returns empty string when bytes is 0 (single-char pattern)', () => {
      expect(generatePayload(0)).toBe('');
    });

    it('returns empty string when bytes is 0 (multi-char pattern)', () => {
      expect(generatePayload(0, 'ab')).toBe('');
    });

    it('repeats single-char pattern exactly "bytes" times', () => {
      expect(generatePayload(7, 'z')).toBe('zzzzzzz');
    });

    it('repeats multi-char pattern and slices to exact byte length', () => {
      /* Pattern "abc" (length 3), bytes=7 → repeats 3x = "abcabcabc" → slice to 7 = "abcabca" */
      expect(generatePayload(7, 'abc')).toBe('abcabca');
    });

    it('returns exactly bytes characters for multi-char pattern aligned to boundary', () => {
      expect(generatePayload(6, 'ab')).toBe('ababab');
    });
  });

  describe('generateNestedObjects', () => {
    it('returns a leaf object when depth is 0', () => {
      expect(generateNestedObjects(0)).toEqual({ value: 'leaf' });
    });

    it('returns a leaf object when depth is negative', () => {
      expect(generateNestedObjects(-3)).toEqual({ value: 'leaf' });
    });

    it('uses default breadth of 3', () => {
      const tree: Record<string, unknown> = generateNestedObjects(1);
      expect(Object.keys(tree)).toEqual(['child_0', 'child_1', 'child_2']);
    });

    it('honors custom breadth', () => {
      const tree: Record<string, unknown> = generateNestedObjects(1, 5);
      expect(Object.keys(tree)).toEqual(['child_0', 'child_1', 'child_2', 'child_3', 'child_4']);
    });

    it('produces leaves at every branch at depth 2', () => {
      const tree: Record<string, unknown> = generateNestedObjects(2, 2);
      expect(tree).toEqual({
        child_0: {
          child_0: { value: 'leaf' },
          child_1: { value: 'leaf' },
        },
        child_1: {
          child_0: { value: 'leaf' },
          child_1: { value: 'leaf' },
        },
      });
    });

    it('produces an empty object when breadth is 0 and depth > 0', () => {
      /* Loop runs 0 times, node returned unmutated. */
      expect(generateNestedObjects(3, 0)).toEqual({});
    });
  });
});
