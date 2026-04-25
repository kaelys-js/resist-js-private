/**
 * Tests for ANSI escape-sequence utilities.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { ANSI_REGEX, stripAnsi } from './ansi';

describe('ansi', () => {
  describe('ANSI_REGEX', () => {
    it('matches an SGR color sequence', () => {
      expect(ANSI_REGEX.test('\u001B[31m')).toBe(true);
    });

    it('matches the SGR reset sequence', () => {
      // Reset the lastIndex to 0 because /g flag retains state across calls.
      ANSI_REGEX.lastIndex = 0;
      expect(ANSI_REGEX.test('\u001B[0m')).toBe(true);
    });

    it('matches a cursor-position sequence', () => {
      ANSI_REGEX.lastIndex = 0;
      expect(ANSI_REGEX.test('\u001B[2;5H')).toBe(true);
    });

    it('matches an erase-screen sequence', () => {
      ANSI_REGEX.lastIndex = 0;
      expect(ANSI_REGEX.test('\u001B[2J')).toBe(true);
    });

    it('matches a compound SGR sequence (bold + color)', () => {
      ANSI_REGEX.lastIndex = 0;
      expect(ANSI_REGEX.test('\u001B[1;31m')).toBe(true);
    });

    it('does not match plain ASCII text', () => {
      ANSI_REGEX.lastIndex = 0;
      expect(ANSI_REGEX.test('hello world')).toBe(false);
    });

    it('does not match the empty string', () => {
      ANSI_REGEX.lastIndex = 0;
      expect(ANSI_REGEX.test('')).toBe(false);
    });
  });

  describe('stripAnsi', () => {
    it('returns an empty string unchanged', () => {
      const result: Str = stripAnsi('' as Str);
      expect(result).toBe('');
    });

    it('returns plain ASCII unchanged', () => {
      const result: Str = stripAnsi('hello world' as Str);
      expect(result).toBe('hello world');
    });

    it('removes a single SGR color sequence', () => {
      const result: Str = stripAnsi('\u001B[31mError\u001B[0m' as Str);
      expect(result).toBe('Error');
    });

    it('removes multiple interleaved SGR sequences', () => {
      const input: Str = '\u001B[31mError:\u001B[0m \u001B[1mfile\u001B[0m not found' as Str;
      const result: Str = stripAnsi(input);
      expect(result).toBe('Error: file not found');
    });

    it('removes cursor-position sequences', () => {
      const result: Str = stripAnsi('\u001B[2;5Habc' as Str);
      expect(result).toBe('abc');
    });

    it('removes erase-screen sequences', () => {
      const result: Str = stripAnsi('\u001B[2Jcleared' as Str);
      expect(result).toBe('cleared');
    });

    it('preserves surrounding unicode characters', () => {
      const result: Str = stripAnsi('\u001B[31m🚀 ✅\u001B[0m' as Str);
      expect(result).toBe('🚀 ✅');
    });

    it('preserves length of stripped plain text', () => {
      const result: Str = stripAnsi('\u001B[31m/src/index.ts\u001B[0m' as Str);
      expect(result).toBe('/src/index.ts');
      expect(result.length).toBe(13);
    });
  });
});
