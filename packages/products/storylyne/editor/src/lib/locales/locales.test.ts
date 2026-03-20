import { describe, expect, it } from 'vitest';
import { safeParse } from '@/utils/result/safe';
import { EditorLocaleSchema, type EditorLocaleRaw } from './schema';
import type { Num, Str } from '@/schemas/common';

/**
 * Dynamically discover all locale files in this directory via `import.meta.glob`.
 * Excludes `schema.ts` and test files. Adding a new locale requires no import changes.
 */
const localeModules: Record<Str, Record<Str, EditorLocaleRaw>> = import.meta.glob(
  './!(*schema|*.test).ts',
  { eager: true },
);

const ALL_LOCALES: Record<Str, EditorLocaleRaw> = {};
for (const [path, mod] of Object.entries(localeModules)) {
  const match: RegExpMatchArray | null = path.match(/\/(\w+)\.ts$/);
  if (!match) continue;
  const [, code]: RegExpMatchArray = match;
  const [data]: EditorLocaleRaw[] = Object.values(mod);
  if (data) ALL_LOCALES[code] = data;
}

const LOCALE_CODES: readonly Str[] = Object.keys(ALL_LOCALES);

/**
 * Recursively collect all leaf keys as dot-paths (e.g. "meta.description").
 *
 * @param obj - Object to traverse
 * @param prefix - Dot-path prefix for recursion
 * @returns Sorted array of dot-path keys
 */
function leafKeys(obj: Record<Str, unknown>, prefix = ''): Str[] {
  const keys: Str[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path: Str = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys.push(...leafKeys(v as Record<Str, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.toSorted();
}

const enLocale: EditorLocaleRaw = ALL_LOCALES['en']!;
const enKeys: readonly Str[] = leafKeys(enLocale);

// =============================================================================
// Structural parity — every locale has the exact same key set
// =============================================================================

describe('locale structural parity', () => {
  for (const code of LOCALE_CODES) {
    it(`${code} has the same key set as en`, () => {
      const keys: readonly Str[] = leafKeys(ALL_LOCALES[code]!);
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
function leafEntries(obj: Record<Str, unknown>, prefix = ''): Array<[Str, unknown]> {
  const entries: Array<[Str, unknown]> = [];
  for (const [k, v] of Object.entries(obj)) {
    const path: Str = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      entries.push(...leafEntries(v as Record<Str, unknown>, path));
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
        // Cast safe: typeof check on previous line guarantees string
        expect((value as Str).length, `${code}.${path} should not be empty`).toBeGreaterThan(0);
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

const EXPECTED_NAMESPACES: readonly Str[] = [
  'meta',
  'common',
  'sidebar',
  'header',
  'settings',
  'project',
  'user',
  'data',
  'scenes',
  'debug',
  'devToolbar',
  'home',
  'errors',
];

describe('namespace coverage', () => {
  for (const code of LOCALE_CODES) {
    it(`${code} has all ${EXPECTED_NAMESPACES.length} namespaces`, () => {
      const namespaces: readonly Str[] = Object.keys(ALL_LOCALES[code]!).toSorted();
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
      expect(ALL_LOCALES[code]!.meta.description).not.toBe(enLocale.meta.description);
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

const NAMESPACE_KEY_COUNTS: Record<Str, Num> = {
  meta: 2,
  common: 13,
  sidebar: 3,
  header: 4,
  settings: 23,
  project: 2,
  user: 9,
  data: 6,
  scenes: 3,
  errors: 17,
};

describe('namespace key counts', () => {
  for (const [ns, expectedCount] of Object.entries(NAMESPACE_KEY_COUNTS)) {
    it(`en.${ns} has ${expectedCount} keys`, () => {
      const actual: Num = Object.keys(
        enLocale[ns as keyof EditorLocaleRaw] as Record<Str, unknown>,
      ).length;
      expect(actual).toBe(expectedCount);
    });
  }
});
