/**
 * Editor i18n store — reactive locale registry singleton.
 *
 * Dynamically discovers all locale files in `../locales/` via `import.meta.glob`.
 * Adding a new locale only requires creating a new file — no import changes needed.
 *
 * @module
 */

import type { RawLocaleStrings } from '@/schemas/common';
import { createLocaleRegistry } from '@/locale/registry';
import { createLocaleStore } from '@/locale/svelte';
import { EditorLocaleSchema } from '$lib/locales/schema';

export { t } from '@/locale/t';

/**
 * Eagerly import all locale files from `../locales/`.
 * Excludes `schema.ts` and test files.
 * Each module exports a single named const (e.g., `export const en = { ... }`).
 */
const localeModules: Record<string, Record<string, RawLocaleStrings>> = import.meta.glob(
  '../locales/!(*schema|*.test).ts',
  { eager: true },
);

/**
 * Builds a `{ code: data }` record from glob-imported locale modules.
 * Extracts the locale code from the filename (e.g., `../locales/en.ts` → `'en'`).
 */
const locales: Record<string, RawLocaleStrings> = {};

for (const [path, mod] of Object.entries(localeModules)) {
  const match: RegExpMatchArray | null = path.match(/\/(\w+)\.ts$/);

  if (!match) {
    continue;
  }

  const [, code]: RegExpMatchArray = match;
  // Each locale file exports a single named const — grab the first export value
  const [data]: RawLocaleStrings[] = Object.values(mod);

  if (data && code !== undefined) {
    locales[code] = data;
  }
}

const registryResult = createLocaleRegistry({
  schema: EditorLocaleSchema,
  defaultLocale: 'en',
  locales,
  strict: false,
  fallbackLocales: ['en'],
});

if (!registryResult.ok) {
  throw new Error(
    `Locale registry failed: ${registryResult.error.code} — ${registryResult.error.message}`,
  );
}

const storeResult = createLocaleStore<typeof EditorLocaleSchema>(registryResult.data);

if (!storeResult.ok) {
  throw new Error(`Locale store failed: ${storeResult.error.code} — ${storeResult.error.message}`);
}

export const localeStore = storeResult.data;
