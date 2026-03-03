import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALE_CODES, detectFromHeader, resolveLocale } from './locale-detection';

// =============================================================================
// SUPPORTED_LOCALE_CODES
// =============================================================================

describe('SUPPORTED_LOCALE_CODES', () => {
	it('contains exactly 7 locales', () => {
		expect(SUPPORTED_LOCALE_CODES.size).toBe(7);
	});

	it('contains all expected codes', () => {
		const expected: readonly string[] = ['en', 'ja', 'zh', 'ko', 'fr', 'de', 'es'];
		for (const code of expected) {
			expect(SUPPORTED_LOCALE_CODES.has(code), `should have '${code}'`).toBe(true);
		}
	});
});

// =============================================================================
// detectFromHeader
// =============================================================================

describe('detectFromHeader', () => {
	it('returns empty string for null', () => {
		expect(detectFromHeader(null)).toBe('');
	});

	it('returns empty string for empty string', () => {
		expect(detectFromHeader('')).toBe('');
	});

	it("detects 'ja' from simple header", () => {
		expect(detectFromHeader('ja')).toBe('ja');
	});

	it('detects first supported from multi-language header', () => {
		expect(detectFromHeader('ja,en-US;q=0.9,en;q=0.8')).toBe('ja');
	});

	it('skips unsupported and picks first supported', () => {
		expect(detectFromHeader('pt-BR,pt;q=0.9,fr;q=0.8')).toBe('fr');
	});

	it('returns empty for all unsupported', () => {
		expect(detectFromHeader('pt-BR,pt;q=0.9,ru;q=0.8')).toBe('');
	});

	it('extracts base code from region tag (en-US → en)', () => {
		expect(detectFromHeader('en-US')).toBe('en');
	});

	it('extracts base code from zh-CN → zh', () => {
		expect(detectFromHeader('zh-CN,zh;q=0.9')).toBe('zh');
	});

	it('handles quality values correctly (picks higher priority)', () => {
		expect(detectFromHeader('ko;q=1.0,de;q=0.5')).toBe('ko');
	});

	it('handles whitespace in header', () => {
		expect(detectFromHeader('  ja , en-US;q=0.9 ')).toBe('ja');
	});

	it('is case-insensitive', () => {
		expect(detectFromHeader('JA')).toBe('ja');
		expect(detectFromHeader('En-US')).toBe('en');
	});

	it('handles double comma (empty tag) gracefully', () => {
		expect(detectFromHeader('ja,,en')).toBe('ja');
	});

	it('handles semicolon-only tag', () => {
		expect(detectFromHeader(';q=0.9,en')).toBe('en');
	});

	it('handles wildcard (*) tag', () => {
		expect(detectFromHeader('*,ja;q=0.5')).toBe('ja');
	});
});

// =============================================================================
// resolveLocale
// =============================================================================

describe('resolveLocale', () => {
	it("cookie 'ja' wins over Accept-Language 'fr'", () => {
		expect(resolveLocale('ja', 'fr,en;q=0.9')).toBe('ja');
	});

	it("cookie 'ja' wins over null Accept-Language", () => {
		expect(resolveLocale('ja', null)).toBe('ja');
	});

	it('falls back to Accept-Language when cookie is empty', () => {
		expect(resolveLocale('', 'fr,en;q=0.9')).toBe('fr');
	});

	it('falls back to Accept-Language when cookie is invalid', () => {
		expect(resolveLocale('invalid', 'ko')).toBe('ko');
	});

	it("defaults to 'en' when both empty", () => {
		expect(resolveLocale('', null)).toBe('en');
	});

	it("defaults to 'en' when both invalid", () => {
		expect(resolveLocale('invalid', 'pt-BR')).toBe('en');
	});

	it('accepts all 7 supported locales via cookie', () => {
		const codes: readonly string[] = ['en', 'ja', 'zh', 'ko', 'fr', 'de', 'es'];
		for (const code of codes) {
			expect(resolveLocale(code, null), `cookie '${code}' should resolve`).toBe(code);
		}
	});

	it('accepts all 7 supported locales via Accept-Language', () => {
		const codes: readonly string[] = ['en', 'ja', 'zh', 'ko', 'fr', 'de', 'es'];
		for (const code of codes) {
			expect(resolveLocale('', code), `header '${code}' should resolve`).toBe(code);
		}
	});
});
