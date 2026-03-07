/**
 * Tests for preference cookie utility.
 *
 * Covers read/write/sanitize of client-side preference cookies used for
 * SSR hydration flash prevention (sidebar width, theme).
 *
 * @module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Str, Num } from '@/schemas/common';
import {
	setPreferenceCookie,
	getPreferenceCookie,
	sanitizeSidebarWidth,
	sanitizeTheme,
} from './preference-cookie';

describe('preference-cookie', () => {
	// ── setPreferenceCookie ──────────────────────────────────────────────
	describe('setPreferenceCookie', () => {
		beforeEach(() => {
			// Reset document.cookie mock between tests
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: '',
			});
		});

		it('sets a cookie with correct attributes', () => {
			const result = setPreferenceCookie('sidebar-px', '350');
			expect(result.ok).toBe(true);
			expect(document.cookie).toContain('finances:sidebar-px=350');
			expect(document.cookie).toContain('max-age=31536000');
			expect(document.cookie).toContain('path=/');
			expect(document.cookie).toContain('SameSite=Lax');
		});

		it('sets an empty value cookie', () => {
			const result = setPreferenceCookie('theme', '');
			expect(result.ok).toBe(true);
			expect(document.cookie).toContain('finances:theme=');
		});

		it('returns ok for valid inputs', () => {
			const result = setPreferenceCookie('test', 'value');
			expect(result.ok).toBe(true);
		});
	});

	// ── getPreferenceCookie ──────────────────────────────────────────────
	describe('getPreferenceCookie', () => {
		it('reads an existing cookie value', () => {
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: 'finances:sidebar-px=350; other=foo',
			});
			const value: Str | null = getPreferenceCookie('sidebar-px');
			expect(value).toBe('350');
		});

		it('returns null when cookie does not exist', () => {
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: 'other=foo',
			});
			const value: Str | null = getPreferenceCookie('sidebar-px');
			expect(value).toBeNull();
		});

		it('returns null for empty cookie string', () => {
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: '',
			});
			const value: Str | null = getPreferenceCookie('theme');
			expect(value).toBeNull();
		});

		it('handles multiple cookies correctly', () => {
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: 'finances:mode=dark; finances:theme=midnight; finances:sidebar-px=400',
			});
			expect(getPreferenceCookie('theme')).toBe('midnight');
			expect(getPreferenceCookie('sidebar-px')).toBe('400');
			expect(getPreferenceCookie('mode')).toBe('dark');
		});

		it('handles cookie value with leading whitespace', () => {
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: 'finances:theme= midnight',
			});
			// Cookie parsing should trim but the raw value has a space prefix
			expect(getPreferenceCookie('theme')).toBe('midnight');
		});
	});

	// ── sanitizeSidebarWidth ─────────────────────────────────────────────
	describe('sanitizeSidebarWidth', () => {
		it('accepts a valid sidebar width', () => {
			const result: Num | null = sanitizeSidebarWidth('350');
			expect(result).toBe(350);
		});

		it('clamps to minimum (100)', () => {
			expect(sanitizeSidebarWidth('50')).toBeNull();
		});

		it('clamps to maximum (1000)', () => {
			expect(sanitizeSidebarWidth('1500')).toBeNull();
		});

		it('accepts boundary value 100', () => {
			expect(sanitizeSidebarWidth('100')).toBe(100);
		});

		it('accepts boundary value 1000', () => {
			expect(sanitizeSidebarWidth('1000')).toBe(1000);
		});

		it('returns null for non-numeric string', () => {
			expect(sanitizeSidebarWidth('abc')).toBeNull();
		});

		it('returns null for empty string', () => {
			expect(sanitizeSidebarWidth('')).toBeNull();
		});

		it('returns null for null input', () => {
			expect(sanitizeSidebarWidth(null)).toBeNull();
		});

		it('returns null for XSS injection attempt', () => {
			expect(sanitizeSidebarWidth('"><script>alert(1)</script>')).toBeNull();
		});

		it('returns null for NaN-producing input', () => {
			expect(sanitizeSidebarWidth('NaN')).toBeNull();
		});

		it('returns null for Infinity', () => {
			expect(sanitizeSidebarWidth('Infinity')).toBeNull();
		});

		it('rounds float values to nearest integer', () => {
			expect(sanitizeSidebarWidth('350.7')).toBe(351);
		});
	});

	// ── sanitizeTheme ────────────────────────────────────────────────────
	describe('sanitizeTheme', () => {
		it('accepts a valid theme name', () => {
			const result: Str = sanitizeTheme('midnight');
			expect(result).toBe('midnight');
		});

		it('accepts empty string (default theme)', () => {
			expect(sanitizeTheme('')).toBe('');
		});

		it('returns empty string for unsupported theme', () => {
			expect(sanitizeTheme('neon')).toBe('');
		});

		it('returns empty string for null input', () => {
			expect(sanitizeTheme(null)).toBe('');
		});

		it('returns empty string for XSS injection', () => {
			expect(sanitizeTheme('"><script>alert(1)</script>')).toBe('');
		});

		it('accepts all supported themes', () => {
			const themes: readonly Str[] = [
				'midnight',
				'warm',
				'forest',
				'ocean',
				'rose',
				'lavender',
				'sunset',
				'slate',
				'copper',
				'aurora',
				'amethyst',
			];
			for (const theme of themes) {
				expect(sanitizeTheme(theme)).toBe(theme);
			}
		});

		it('is case-sensitive (rejects uppercase)', () => {
			expect(sanitizeTheme('Midnight')).toBe('');
		});
	});
});
