import type { Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { createLocaleRegistry } from '@/locale/registry';
import { createLocaleStore } from '@/locale/svelte';
import { EditorLocaleSchema } from './locales/schema';
import { en } from './locales/en';
import { ja } from './locales/ja';
import { zh } from './locales/zh';
import { ko } from './locales/ko';
import { fr } from './locales/fr';
import { de } from './locales/de';
import { es } from './locales/es';

const registryResult = createLocaleRegistry({
	schema: EditorLocaleSchema,
	defaultLocale: 'en',
	locales: { en, ja, zh, ko, fr, de, es },
	strict: false,
	fallbackLocales: ['en'],
});

if (!registryResult.ok)
	throw new Error(
		`Locale registry failed: ${registryResult.error.code} — ${registryResult.error.message}`,
	);

const storeResult = createLocaleStore<typeof EditorLocaleSchema>(registryResult.data);
if (!storeResult.ok)
	throw new Error(`Locale store failed: ${storeResult.error.code} — ${storeResult.error.message}`);

export const localeStore = storeResult.data;

/**
 * Convenience helper — calls a locale function and returns the string,
 * falling back to the provided default if the Result is an error.
 * Works around DeepReadonly type mangling on BuiltLocale function signatures.
 *
 * @param fn - Locale function from `localeStore.t.*.*`
 * @param fallback - Default string if the locale function returns an error
 * @returns The translated string, or the fallback
 */
export function t(
	fn:
		| (() => Result<Str>)
		| ((_args: object) => Result<Str>)
		| ((params: Record<string, never>) => Result<Str>),
	fallback: string,
): string {
	const result: Result<Str> = (fn as () => Result<Str>)();
	return result.ok ? result.data : fallback;
}
