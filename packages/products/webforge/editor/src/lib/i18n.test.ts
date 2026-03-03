import { describe, expect, it } from 'vitest';
import { localeStore, t } from './i18n.svelte';

const SUPPORTED: readonly string[] = ['en', 'ja', 'zh', 'ko', 'fr', 'de', 'es'];

// =============================================================================
// localeStore initialization
// =============================================================================

describe('localeStore initialization', () => {
	it("defaults to 'en'", () => {
		expect(localeStore.locale).toBe('en');
	});

	it('lists all 7 supported locales', () => {
		const result = localeStore.list();
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect([...result.data].toSorted()).toEqual([...SUPPORTED].toSorted());
	});

	it("has('en') returns true", () => {
		const result = localeStore.has('en');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(true);
	});

	it("has('xx') returns false", () => {
		const result = localeStore.has('xx');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(false);
	});
});

// =============================================================================
// setLocale
// =============================================================================

describe('localeStore.setLocale', () => {
	it("switches to 'ja' and updates locale property", () => {
		const result = localeStore.setLocale('ja');
		expect(result.ok).toBe(true);
		expect(localeStore.locale).toBe('ja');
		// Reset
		localeStore.setLocale('en');
	});

	it("setLocale('xx') returns error, locale unchanged", () => {
		localeStore.setLocale('en');
		const result = localeStore.setLocale('xx');
		expect(result.ok).toBe(false);
		expect(localeStore.locale).toBe('en');
	});

	it('switching locale changes t strings', () => {
		localeStore.setLocale('en');
		const enDesc: string = t(localeStore.t.meta.description, '');
		expect(enDesc).toContain('HD-2D');

		localeStore.setLocale('ja');
		const jaDesc: string = t(localeStore.t.meta.description, '');
		expect(jaDesc).toContain('HD-2D');
		expect(jaDesc).not.toBe(enDesc);

		// Reset
		localeStore.setLocale('en');
	});
});

// =============================================================================
// t() helper
// =============================================================================

describe('t() helper', () => {
	it('returns translated string for valid locale function', () => {
		localeStore.setLocale('en');
		const result: string = t(localeStore.t.common.settings, 'FALLBACK');
		expect(result).toBe('Settings');
	});

	it('returns fallback when locale function errors', () => {
		const result: string = t(
			(() => ({
				ok: false,
				data: null,
				error: { code: 'TEST', message: 'test error' },
			})) as Parameters<typeof t>[0],
			'MY_FALLBACK',
		);
		expect(result).toBe('MY_FALLBACK');
	});
});

// =============================================================================
// Every locale produces valid t() calls for all namespaces
// =============================================================================

describe('all locales produce valid translations', () => {
	for (const code of SUPPORTED) {
		it(`${code} meta.description returns non-empty string`, () => {
			localeStore.setLocale(code);
			const desc: string = t(localeStore.t.meta.description, '');
			expect(desc.length).toBeGreaterThan(0);
		});

		it(`${code} common.settings returns non-empty string`, () => {
			localeStore.setLocale(code);
			const val: string = t(localeStore.t.common.settings, '');
			expect(val.length).toBeGreaterThan(0);
		});

		it(`${code} sidebar.scenes returns non-empty string`, () => {
			localeStore.setLocale(code);
			const val: string = t(localeStore.t.sidebar.scenes, '');
			expect(val.length).toBeGreaterThan(0);
		});

		it(`${code} header.editor returns non-empty string`, () => {
			localeStore.setLocale(code);
			const val: string = t(localeStore.t.header.editor, '');
			expect(val.length).toBeGreaterThan(0);
		});
	}

	// Reset after all
	it('resets to en', () => {
		localeStore.setLocale('en');
		expect(localeStore.locale).toBe('en');
	});
});

// =============================================================================
// applicationName consistency across locales
// =============================================================================

describe('applicationName consistency', () => {
	for (const code of SUPPORTED) {
		it(`${code} meta.applicationName is 'WebForge'`, () => {
			localeStore.setLocale(code);
			const name: string = t(localeStore.t.meta.applicationName, '');
			expect(name).toBe('WebForge');
		});
	}

	it('resets to en', () => {
		localeStore.setLocale('en');
		expect(localeStore.locale).toBe('en');
	});
});

// =============================================================================
// settings namespace — all theme labels produce non-empty strings
// =============================================================================

describe('settings namespace coverage', () => {
	it('en settings.appearance returns non-empty string', () => {
		localeStore.setLocale('en');
		const val: string = t(localeStore.t.settings.appearance, '');
		expect(val.length).toBeGreaterThan(0);
	});

	it('en settings.themeDefault returns non-empty string', () => {
		localeStore.setLocale('en');
		const val: string = t(localeStore.t.settings.themeDefault, '');
		expect(val.length).toBeGreaterThan(0);
	});

	it('en settings.themeMidnight returns non-empty string', () => {
		localeStore.setLocale('en');
		const val: string = t(localeStore.t.settings.themeMidnight, '');
		expect(val.length).toBeGreaterThan(0);
	});
});
