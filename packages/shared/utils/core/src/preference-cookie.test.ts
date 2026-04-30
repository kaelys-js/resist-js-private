/**
 * Tests for the shared preference cookie utility.
 *
 * Covers read/write/sanitize of client-side preference cookies used for
 * SSR hydration flash prevention (sidebar width, theme, sidebar open state).
 *
 * @vitest-environment jsdom
 * @module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Str, Num } from '@/schemas/common';

import {
  setPreferenceCookie,
  getPreferenceCookie,
  sanitizeSidebarWidth,
  sanitizeSidebarOpen,
  sanitizeTheme,
} from './preference-cookie';

/** Test storage prefix matching the editor's convention. */
const PREFIX: Str = 'testapp';

/**
 * Helper to build a prefixed cookie key.
 *
 * @param name - The unprefixed cookie name.
 * @returns The cookie name with the test prefix applied.
 */
function prefixedKey(name: Str): Str {
  return `${PREFIX}:${name}`;
}

/** Test theme list matching the editor's supported themes. */
const TEST_THEMES: readonly Str[] = [
  '' as Str,
  'midnight' as Str,
  'warm' as Str,
  'forest' as Str,
  'ocean' as Str,
  'rose' as Str,
  'lavender' as Str,
  'sunset' as Str,
  'slate' as Str,
  'copper' as Str,
  'aurora' as Str,
  'amethyst' as Str,
];

describe('preference-cookie', () => {
  // ── setPreferenceCookie ──────────────────────────────────────────────
  describe('setPreferenceCookie', () => {
    beforeEach(() => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });
    });

    it('sets a cookie with correct attributes', () => {
      const result = setPreferenceCookie(PREFIX, 'sidebar-px' as Str, '350' as Str);
      expect(result.ok).toBe(true);
      expect(document.cookie).toContain(`${prefixedKey('sidebar-px' as Str)}=350`);
      expect(document.cookie).toContain('max-age=31536000');
      expect(document.cookie).toContain('path=/');
      expect(document.cookie).toContain('SameSite=Lax');
    });

    it('sets an empty value cookie', () => {
      const result = setPreferenceCookie(PREFIX, 'theme' as Str, '' as Str);
      expect(result.ok).toBe(true);
      expect(document.cookie).toContain(`${prefixedKey('theme' as Str)}=`);
    });

    it('returns ok for valid inputs', () => {
      const result = setPreferenceCookie(PREFIX, 'test' as Str, 'value' as Str);
      expect(result.ok).toBe(true);
    });
  });

  // ── getPreferenceCookie ──────────────────────────────────────────────
  describe('getPreferenceCookie', () => {
    it('reads an existing cookie value', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: `${prefixedKey('sidebar-px' as Str)}=350; other=foo`,
      });
      const value: Str | null = getPreferenceCookie(PREFIX, 'sidebar-px' as Str);
      expect(value).toBe('350');
    });

    it('returns null when cookie does not exist', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'other=foo',
      });
      const value: Str | null = getPreferenceCookie(PREFIX, 'sidebar-px' as Str);
      expect(value).toBeNull();
    });

    it('returns null for empty cookie string', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });
      const value: Str | null = getPreferenceCookie(PREFIX, 'theme' as Str);
      expect(value).toBeNull();
    });

    it('handles multiple cookies correctly', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: `${prefixedKey('mode' as Str)}=dark; ${prefixedKey('theme' as Str)}=midnight; ${prefixedKey('sidebar-px' as Str)}=400`,
      });
      expect(getPreferenceCookie(PREFIX, 'theme' as Str)).toBe('midnight');
      expect(getPreferenceCookie(PREFIX, 'sidebar-px' as Str)).toBe('400');
      expect(getPreferenceCookie(PREFIX, 'mode' as Str)).toBe('dark');
    });

    it('handles cookie value with leading whitespace', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: `${prefixedKey('theme' as Str)}= midnight`,
      });
      expect(getPreferenceCookie(PREFIX, 'theme' as Str)).toBe('midnight');
    });
  });

  // ── sanitizeSidebarWidth ─────────────────────────────────────────────
  describe('sanitizeSidebarWidth', () => {
    it('accepts a valid sidebar width', () => {
      const result: Num | null = sanitizeSidebarWidth('350' as Str);
      expect(result).toBe(350);
    });

    it('rejects below minimum (100)', () => {
      expect(sanitizeSidebarWidth('50' as Str)).toBeNull();
    });

    it('rejects above maximum (1000)', () => {
      expect(sanitizeSidebarWidth('1500' as Str)).toBeNull();
    });

    it('accepts boundary value 100', () => {
      expect(sanitizeSidebarWidth('100' as Str)).toBe(100);
    });

    it('accepts boundary value 1000', () => {
      expect(sanitizeSidebarWidth('1000' as Str)).toBe(1000);
    });

    it('returns null for non-numeric string', () => {
      expect(sanitizeSidebarWidth('abc' as Str)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(sanitizeSidebarWidth('' as Str)).toBeNull();
    });

    it('returns null for null input', () => {
      expect(sanitizeSidebarWidth(null)).toBeNull();
    });

    it('returns null for XSS injection attempt', () => {
      expect(sanitizeSidebarWidth('"><script>alert(1)</script>' as Str)).toBeNull();
    });

    it('returns null for NaN-producing input', () => {
      expect(sanitizeSidebarWidth('NaN' as Str)).toBeNull();
    });

    it('returns null for Infinity', () => {
      expect(sanitizeSidebarWidth('Infinity' as Str)).toBeNull();
    });

    it('rounds float values to nearest integer', () => {
      expect(sanitizeSidebarWidth('350.7' as Str)).toBe(351);
    });
  });

  // ── sanitizeSidebarOpen ──────────────────────────────────────────────
  describe('sanitizeSidebarOpen', () => {
    it('returns true for "true"', () => {
      expect(sanitizeSidebarOpen('true' as Str)).toBe(true);
    });

    it('returns false for "false"', () => {
      expect(sanitizeSidebarOpen('false' as Str)).toBe(false);
    });

    it('returns null for null input', () => {
      expect(sanitizeSidebarOpen(null)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(sanitizeSidebarOpen('' as Str)).toBeNull();
    });

    it('returns null for XSS injection', () => {
      expect(sanitizeSidebarOpen('"><script>' as Str)).toBeNull();
    });

    it('is case-sensitive (rejects uppercase)', () => {
      expect(sanitizeSidebarOpen('True' as Str)).toBeNull();
      expect(sanitizeSidebarOpen('FALSE' as Str)).toBeNull();
    });
  });

  // ── sanitizeTheme ────────────────────────────────────────────────────
  describe('sanitizeTheme', () => {
    it('accepts a valid theme name', () => {
      const result: Str = sanitizeTheme('midnight' as Str, TEST_THEMES);
      expect(result).toBe('midnight');
    });

    it('accepts empty string (default theme)', () => {
      expect(sanitizeTheme('' as Str, TEST_THEMES)).toBe('');
    });

    it('returns empty string for unsupported theme', () => {
      expect(sanitizeTheme('neon' as Str, TEST_THEMES)).toBe('');
    });

    it('returns empty string for null input', () => {
      expect(sanitizeTheme(null, TEST_THEMES)).toBe('');
    });

    it('returns empty string for XSS injection', () => {
      expect(sanitizeTheme('"><script>alert(1)</script>' as Str, TEST_THEMES)).toBe('');
    });

    it('accepts all supported themes', () => {
      const namedThemes: readonly Str[] = TEST_THEMES.filter((t: Str) => t !== ('' as Str));

      for (const theme of namedThemes) {
        expect(sanitizeTheme(theme, TEST_THEMES)).toBe(theme);
      }
    });

    it('is case-sensitive (rejects uppercase)', () => {
      expect(sanitizeTheme('Midnight' as Str, TEST_THEMES)).toBe('');
    });
  });
});
