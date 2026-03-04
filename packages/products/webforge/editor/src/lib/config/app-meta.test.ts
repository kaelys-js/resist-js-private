import { describe, expect, it } from 'vitest';
import {
	APP_CATEGORIES,
	APP_DESCRIPTION,
	APP_DISPLAY,
	APP_ID,
	APP_NAME,
	APP_SCOPE,
	APP_SHORT_NAME,
	APP_START_URL,
	ICONS,
	SECURITY_CANONICAL_URL,
	SECURITY_CONTACT_URL,
	SECURITY_POLICY_URL,
	SECURITY_PREFERRED_LANGUAGES,
	THEME_COLORS,
} from './app-meta';
import { SUPPORTED_THEMES } from '$lib/schemas/editor-state';

const HEX_PATTERN = /^#[0-9a-f]{6}$/;

describe('app-meta — THEME_COLORS', () => {
	it('has an entry for every supported theme', () => {
		for (const theme of SUPPORTED_THEMES) {
			expect(THEME_COLORS[theme], `missing entry for theme '${theme}'`).toBeDefined();
		}
	});

	it('all light values are #ffffff', () => {
		for (const theme of SUPPORTED_THEMES) {
			expect(THEME_COLORS[theme].light).toBe('#ffffff');
		}
	});

	it('all dark values are valid hex colors', () => {
		for (const theme of SUPPORTED_THEMES) {
			expect(THEME_COLORS[theme].dark).toMatch(HEX_PATTERN);
		}
	});

	it('dark values are non-empty and differ from light', () => {
		for (const theme of SUPPORTED_THEMES) {
			const { light, dark } = THEME_COLORS[theme];
			expect(dark.length).toBeGreaterThan(0);
			expect(dark).not.toBe(light);
		}
	});
});

describe('app-meta — identity constants', () => {
	it('APP_NAME is non-empty', () => {
		expect(APP_NAME.length).toBeGreaterThan(0);
	});

	it('APP_SHORT_NAME is non-empty', () => {
		expect(APP_SHORT_NAME.length).toBeGreaterThan(0);
	});

	it('APP_DESCRIPTION is non-empty', () => {
		expect(APP_DESCRIPTION.length).toBeGreaterThan(0);
	});

	it('APP_ID starts with /', () => {
		expect(APP_ID.startsWith('/')).toBe(true);
	});

	it('APP_SCOPE is /', () => {
		expect(APP_SCOPE).toBe('/');
	});

	it('APP_START_URL is /', () => {
		expect(APP_START_URL).toBe('/');
	});

	it('APP_DISPLAY is standalone', () => {
		expect(APP_DISPLAY).toBe('standalone');
	});

	it('APP_CATEGORIES is non-empty array', () => {
		expect(APP_CATEGORIES.length).toBeGreaterThan(0);
	});
});

describe('app-meta — ICONS', () => {
	it('has 4 icon entries', () => {
		expect(ICONS).toHaveLength(4);
	});

	it('every icon has src, sizes, and type', () => {
		for (const icon of ICONS) {
			expect(icon.src).toBeTruthy();
			expect(icon.sizes).toBeTruthy();
			expect(icon.type).toBe('image/png');
		}
	});

	it('has 192x192 icon without purpose', () => {
		const icon = ICONS.find((i) => i.sizes === '192x192' && !i.purpose);
		expect(icon).toBeTruthy();
	});

	it('has 512x512 icon without purpose', () => {
		const icon = ICONS.find((i) => i.sizes === '512x512' && !i.purpose);
		expect(icon).toBeTruthy();
	});

	it('has 192x192 maskable icon', () => {
		const icon = ICONS.find((i) => i.sizes === '192x192' && i.purpose === 'maskable');
		expect(icon).toBeTruthy();
	});

	it('has 512x512 maskable icon', () => {
		const icon = ICONS.find((i) => i.sizes === '512x512' && i.purpose === 'maskable');
		expect(icon).toBeTruthy();
	});
});

describe('app-meta — security constants', () => {
	it('SECURITY_CONTACT_URL is non-empty', () => {
		expect(SECURITY_CONTACT_URL.length).toBeGreaterThan(0);
	});

	it('SECURITY_POLICY_URL is non-empty', () => {
		expect(SECURITY_POLICY_URL.length).toBeGreaterThan(0);
	});

	it('SECURITY_CANONICAL_URL is non-empty', () => {
		expect(SECURITY_CANONICAL_URL.length).toBeGreaterThan(0);
	});

	it('SECURITY_PREFERRED_LANGUAGES is non-empty', () => {
		expect(SECURITY_PREFERRED_LANGUAGES.length).toBeGreaterThan(0);
	});
});
