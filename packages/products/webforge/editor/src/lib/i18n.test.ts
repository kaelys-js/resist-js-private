import { describe, expect, it } from 'vitest';
import { localeStore, t } from './i18n.svelte';
import { APP_NAME } from '$lib/config/app-meta';
import type { Result } from '@/schemas/result/result';

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
		const enDescFn = localeStore.t.meta.description as (p: { appName: string }) => Result<string>;
		const enResult = enDescFn({ appName: APP_NAME });
		const enDesc: string = enResult.ok ? enResult.data : '';
		expect(enDesc).toContain(APP_NAME);

		localeStore.setLocale('ja');
		const jaDescFn = localeStore.t.meta.description as (p: { appName: string }) => Result<string>;
		const jaResult = jaDescFn({ appName: APP_NAME });
		const jaDesc: string = jaResult.ok ? jaResult.data : '';
		expect(jaDesc).toContain(APP_NAME);
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
			const descFn = localeStore.t.meta.description as (p: { appName: string }) => Result<string>;
			const result = descFn({ appName: APP_NAME });
			const desc: string = result.ok ? result.data : '';
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
// description contains app name across locales
// =============================================================================

describe('description contains app name', () => {
	for (const code of SUPPORTED) {
		it(`${code} meta.description contains APP_NAME`, () => {
			localeStore.setLocale(code);
			const descFn = localeStore.t.meta.description as (p: { appName: string }) => Result<string>;
			const result = descFn({ appName: APP_NAME });
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data).toContain(APP_NAME);
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
