/**
 * Svelte Locale Adapter
 *
 * Wraps a {@link LocaleRegistry} with Svelte 5 `$state` reactivity.
 * When the locale changes, all components reading `store.t` re-render
 * automatically.
 *
 * This file uses `.svelte.ts` extension to enable Svelte 5 runes
 * (`$state`, `$derived`) outside of `.svelte` components.
 *
 * Every function returns `Result<T>`. No function throws.
 *
 * @module
 */

import type * as v from 'valibot';

import {
	StrSchema,
	type Bool,
	type RawLocaleStrings,
	type Str,
	type StrArray,
	type Void,
	VoidSchema,
} from '@/schemas/common';
import { type Result, ok, okUnchecked } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import type { BuiltLocale } from './template';
import type { LocaleRegistry } from '@/locale/registry';

// =============================================================================
// Types
// =============================================================================

/**
 * A reactive locale store for Svelte 5.
 *
 * Exposes the same API as {@link LocaleRegistry} but with reactive
 * `locale` and `t` properties that trigger re-renders when the
 * active locale changes.
 *
 * Irreducible TS type: contains function-typed properties and generic `TSchema`.
 * Valibot validates data shapes, not function signatures.
 *
 * @template TSchema - The Valibot schema defining the locale string structure.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { localeStore } from '$lib/i18n';
 *
 *   // Reactive — re-renders when locale changes
 *   const greeting = $derived(localeStore.t.greeting({ name: 'Alice' }));
 * </script>
 *
 * <p>{greeting.ok ? greeting.data : 'Error'}</p>
 *
 * <button onclick={() => localeStore.setLocale('es')}>
 *   Español
 * </button>
 * ```
 */
export type LocaleStore<TSchema extends v.GenericSchema> = {
	/** The current active locale code (reactive). */
	readonly locale: Str;
	/** The built locale strings for the active locale (reactive). */
	readonly t: BuiltLocale<TSchema>;
	/** Sets the active locale and triggers reactivity. */
	readonly setLocale: (code: Str) => Result<Void>;
	/** Returns all available locale codes. */
	readonly list: () => Result<StrArray>;
	/** Checks whether a locale code exists. */
	readonly has: (code: Str) => Result<Bool>;
	/** Adds or replaces a locale and rebuilds. */
	readonly set: (code: Str, raw: RawLocaleStrings) => Result<Void>;
	/** Removes a locale. Cannot remove active or default. */
	readonly remove: (code: Str) => Result<Void>;
};

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a reactive Svelte locale store from a {@link LocaleRegistry}.
 *
 * The store wraps the registry with `$state` reactivity. Reading `store.locale`
 * or `store.t` in a Svelte component creates a reactive dependency — when the
 * locale changes via `store.setLocale()`, all dependent components re-render.
 *
 * @template TSchema - The Valibot schema defining the locale string structure.
 * @param registry - A locale registry created by `createLocaleRegistry()`.
 * @returns `Result<LocaleStore<TSchema>>` — the reactive store, or an error if
 *   the registry's active locale can't be resolved.
 *
 * @example
 * ```typescript
 * // In $lib/i18n.svelte.ts:
 * import { createLocaleRegistry } from '@/locale/registry';
 * import { createLocaleStore } from '@/locale/svelte';
 * import { MySchema, en, es } from './locales';
 *
 * const registryResult = createLocaleRegistry({
 *   schema: MySchema,
 *   defaultLocale: 'en',
 *   locales: { en, es },
 * });
 * if (!registryResult.ok) throw new Error('Failed to create registry');
 *
 * const storeResult = createLocaleStore(registryResult.data);
 * if (!storeResult.ok) throw new Error('Failed to create store');
 *
 * export const localeStore = storeResult.data;
 * ```
 */
export function createLocaleStore<TSchema extends v.GenericSchema>(
	registry: LocaleRegistry<TSchema>,
): Result<LocaleStore<TSchema>> {
	// Get initial active locale
	const activeResult: Result<Str> = registry.active();
	if (!activeResult.ok) return activeResult;

	// Get initial built strings
	const initialStringsResult: Result<BuiltLocale<TSchema>> = registry.t();
	if (!initialStringsResult.ok) return initialStringsResult;

	// Reactive state — Svelte 5 runes
	let currentLocale: Str = $state(activeResult.data);
	let currentStrings: BuiltLocale<TSchema> = $state(
		initialStringsResult.data as BuiltLocale<TSchema>,
	); // Irreducible: DeepReadonly mangles function-typed BuiltLocale properties; runtime value is correct

	const store: LocaleStore<TSchema> = {
		get locale(): Str {
			return currentLocale;
		},

		get t(): BuiltLocale<TSchema> {
			return currentStrings;
		},

		setLocale: (code: Str): Result<Void> => {
			const codeResult: Result<Str> = safeParse(StrSchema, code);
			if (!codeResult.ok) return codeResult;

			const setResult: Result<Void> = registry.setActive(codeResult.data);
			if (!setResult.ok) return setResult;

			const stringsResult: Result<BuiltLocale<TSchema>> = registry.t();
			if (!stringsResult.ok) return stringsResult;

			currentLocale = codeResult.data;
			currentStrings = stringsResult.data as BuiltLocale<TSchema>; // Irreducible: DeepReadonly mangles function-typed BuiltLocale properties

			return ok(VoidSchema, undefined);
		},

		list: (): Result<StrArray> => {
			return registry.list();
		},

		has: (code: Str): Result<Bool> => {
			return registry.has(code);
		},

		set: (code: Str, raw: RawLocaleStrings): Result<Void> => {
			const setResult: Result<Void> = registry.set(code, raw);
			if (!setResult.ok) return setResult;

			// If we just updated the active locale, refresh reactive state
			if (code === currentLocale) {
				const stringsResult: Result<BuiltLocale<TSchema>> = registry.t();
				if (!stringsResult.ok) return stringsResult;
				currentStrings = stringsResult.data as BuiltLocale<TSchema>; // Irreducible: DeepReadonly mangles function-typed BuiltLocale properties
			}

			return ok(VoidSchema, undefined);
		},

		remove: (code: Str): Result<Void> => {
			return registry.remove(code);
		},
	};

	return okUnchecked<LocaleStore<TSchema>>(store);
}
