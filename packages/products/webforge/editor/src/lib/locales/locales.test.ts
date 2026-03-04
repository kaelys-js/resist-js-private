import { describe, expect, it } from 'vitest';
import { safeParse } from '@/utils/result/safe';
import { EditorLocaleSchema, type EditorLocaleRaw } from './schema';
import { en } from './en';
import { ja } from './ja';
import { zh } from './zh';
import { ko } from './ko';
import { fr } from './fr';
import { de } from './de';
import { es } from './es';

const ALL_LOCALES: Record<string, EditorLocaleRaw> = { en, ja, zh, ko, fr, de, es };
const LOCALE_CODES: readonly string[] = Object.keys(ALL_LOCALES);

/**
 * Recursively collect all leaf keys as dot-paths (e.g. "meta.description").
 *
 * @param obj - Object to traverse
 * @param prefix - Dot-path prefix for recursion
 * @returns Sorted array of dot-path keys
 */
function leafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
	const keys: string[] = [];
	for (const [k, v] of Object.entries(obj)) {
		const path: string = prefix ? `${prefix}.${k}` : k;
		if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
			keys.push(...leafKeys(v as Record<string, unknown>, path));
		} else {
			keys.push(path);
		}
	}
	return keys.toSorted();
}

const enKeys: readonly string[] = leafKeys(en);

// =============================================================================
// Structural parity — every locale has the exact same key set
// =============================================================================

describe('locale structural parity', () => {
	for (const code of LOCALE_CODES) {
		it(`${code} has the same key set as en`, () => {
			const keys: readonly string[] = leafKeys(ALL_LOCALES[code]!);
			expect(keys).toEqual(enKeys);
		});
	}
});

// =============================================================================
// No empty strings — every leaf value is a non-empty string
// =============================================================================

/**
 * Recursively collect all leaf values with their dot-path keys.
 *
 * @param obj - Object to traverse
 * @param prefix - Dot-path prefix for recursion
 * @returns Array of [path, value] tuples
 */
function leafEntries(obj: Record<string, unknown>, prefix = ''): Array<[string, unknown]> {
	const entries: Array<[string, unknown]> = [];
	for (const [k, v] of Object.entries(obj)) {
		const path: string = prefix ? `${prefix}.${k}` : k;
		if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
			entries.push(...leafEntries(v as Record<string, unknown>, path));
		} else {
			entries.push([path, v]);
		}
	}
	return entries;
}

describe('no empty strings in any locale', () => {
	for (const code of LOCALE_CODES) {
		it(`${code} has no empty string values`, () => {
			const entries = leafEntries(ALL_LOCALES[code]!);
			for (const [path, value] of entries) {
				expect(typeof value, `${code}.${path} should be a string`).toBe('string');
				expect((value as string).length, `${code}.${path} should not be empty`).toBeGreaterThan(0);
			}
		});
	}
});

// =============================================================================
// Description contains parameterized placeholder
// =============================================================================

describe('description template', () => {
	for (const code of LOCALE_CODES) {
		it(`${code}.meta.description contains {appName} placeholder`, () => {
			expect(ALL_LOCALES[code]!.meta.description).toContain('{appName}');
		});
	}
});

// =============================================================================
// Namespace coverage — every schema namespace exists
// =============================================================================

const EXPECTED_NAMESPACES: readonly string[] = [
	'meta',
	'common',
	'sidebar',
	'header',
	'settings',
	'project',
	'scenes',
	'debug',
	'devToolbar',
	'errors',
];

describe('namespace coverage', () => {
	for (const code of LOCALE_CODES) {
		it(`${code} has all ${EXPECTED_NAMESPACES.length} namespaces`, () => {
			const namespaces: readonly string[] = Object.keys(ALL_LOCALES[code]!).toSorted();
			expect(namespaces).toEqual([...EXPECTED_NAMESPACES].toSorted());
		});
	}
});

// =============================================================================
// Non-English locales have localized descriptions (not identical to English)
// =============================================================================

describe('localized meta.description', () => {
	for (const code of LOCALE_CODES) {
		if (code === 'en') continue;
		it(`${code}.meta.description differs from en`, () => {
			expect(ALL_LOCALES[code]!.meta.description).not.toBe(en.meta.description);
		});
	}
});

// =============================================================================
// Schema validation — every locale parses against EditorLocaleSchema
// =============================================================================

describe('schema validation', () => {
	for (const code of LOCALE_CODES) {
		it(`${code} parses against EditorLocaleSchema`, () => {
			const result = safeParse(EditorLocaleSchema, ALL_LOCALES[code]!);
			expect(result.ok, `${code} should pass schema validation`).toBe(true);
		});
	}
});

// =============================================================================
// Namespace key counts — guard against accidental additions/removals
// =============================================================================

const NAMESPACE_KEY_COUNTS: Record<string, number> = {
	meta: 2,
	common: 9,
	sidebar: 2,
	header: 4,
	settings: 19,
	project: 2,
	scenes: 3,
	errors: 14,
};

describe('namespace key counts', () => {
	for (const [ns, expectedCount] of Object.entries(NAMESPACE_KEY_COUNTS)) {
		it(`en.${ns} has ${expectedCount} keys`, () => {
			const actual: number = Object.keys(
				en[ns as keyof EditorLocaleRaw] as Record<string, unknown>,
			).length;
			expect(actual).toBe(expectedCount);
		});
	}
});
