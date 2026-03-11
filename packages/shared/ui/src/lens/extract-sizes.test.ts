/**
 * Tests for extract-sizes.ts — source size extraction from raw Svelte component sources.
 */
import { describe, it, expect } from 'vitest';
import type { Str, Num } from '@/schemas/common';
import { extractSourceSizes, formatBytes } from './extract-sizes.js';

describe('extractSourceSizes', () => {
  /**
   * Simple directory extractor for tests — mirrors extractDir from lens-utils.
   *
   * @param key - Glob key path
   * @returns Component directory name
   */
  function extractDir(key: Str): Str {
    const parts: Str[] = key.split('/');
    return parts.length >= 2 ? (parts.at(-2) ?? '') : '';
  }

  it('computes byte sizes per component directory', () => {
    const sources: Record<Str, Str> = {
      '@/ui/button/button.svelte': 'a'.repeat(100),
      '@/ui/badge/badge.svelte': 'b'.repeat(200),
    };
    const sizes: Record<Str, Num> = extractSourceSizes(sources, extractDir);
    expect(sizes['button']).toBe(100);
    expect(sizes['badge']).toBe(200);
  });

  it('sums multiple files in the same directory', () => {
    const sources: Record<Str, Str> = {
      '@/ui/dialog/dialog-content.svelte': 'a'.repeat(300),
      '@/ui/dialog/dialog-header.svelte': 'b'.repeat(150),
      '@/ui/dialog/dialog-footer.svelte': 'c'.repeat(50),
    };
    const sizes: Record<Str, Num> = extractSourceSizes(sources, extractDir);
    expect(sizes['dialog']).toBe(500);
  });

  it('returns empty record for empty sources', () => {
    const sizes: Record<Str, Num> = extractSourceSizes({}, extractDir);
    expect(sizes).toEqual({});
  });

  it('skips entries with empty directory names', () => {
    const sources: Record<Str, Str> = {
      'button.svelte': 'a'.repeat(100),
    };
    const sizes: Record<Str, Num> = extractSourceSizes(sources, extractDir);
    expect(Object.keys(sizes)).toHaveLength(0);
  });

  it('handles unicode content correctly (byte length)', () => {
    // UTF-8: 'é' is 2 bytes, '🎉' is 4 bytes — but we measure char length for simplicity
    const sources: Record<Str, Str> = {
      '@/ui/test/test.svelte': '🎉'.repeat(10),
    };
    const sizes: Record<Str, Num> = extractSourceSizes(sources, extractDir);
    // String.length counts UTF-16 code units; '🎉' is 2 code units
    expect(sizes['test']).toBe(20);
  });
});

describe('formatBytes', () => {
  it('formats bytes under 1024 as B', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 kB');
    expect(formatBytes(1536)).toBe('1.5 kB');
    expect(formatBytes(2048)).toBe('2.0 kB');
    expect(formatBytes(10_240)).toBe('10.0 kB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1_048_576)).toBe('1.0 MB');
    expect(formatBytes(1_572_864)).toBe('1.5 MB');
  });

  it('uses one decimal place', () => {
    expect(formatBytes(1100)).toBe('1.1 kB');
    expect(formatBytes(2560)).toBe('2.5 kB');
  });
});
