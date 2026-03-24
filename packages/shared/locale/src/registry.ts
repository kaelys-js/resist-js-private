/**
 * Locale Registry
 *
 * Manages a collection of locale string sets with an active locale selector.
 * Runtime-agnostic — works in Node.js, Cloudflare Workers, browsers, and Svelte.
 *
 * The registry is a non-reactive plain object. For reactive UI consumption,
 * use the Svelte adapter at `@/locale/svelte`.
 *
 * Every function returns `Result<T>`. No function throws.
 *
 * @module
 */

import * as v from 'valibot';

import {
  BoolSchema,
  RawLocaleStringsSchema,
  StrArraySchema,
  StrSchema,
  type Bool,
  type RawLocaleStrings,
  type Str,
  type StrArray,
  type Void,
  VoidSchema,
} from '@/schemas/common';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

import { type BuiltLocale, type FormatterMap, buildLocale } from '@/locale/template';

// =============================================================================
// Registry Options Schema
// =============================================================================

/**
 * Valibot schema for the non-generic fields of locale registry options.
 * The `schema` field is generic (`TSchema extends v.GenericSchema`) and cannot
 * be represented in a Valibot schema, so it is layered on via TS intersection.
 */
const LocaleRegistryOptionsBaseSchema = v.strictObject({
  /** Default locale code (must exist in `locales`). */
  defaultLocale: StrSchema,
  /** Map of locale code → raw locale strings. */
  locales: v.record(StrSchema, RawLocaleStringsSchema),
  /** Optional context values substituted into plain strings at build time. */
  context: v.optional(RawLocaleStringsSchema),
  /**
   * Locale fallback chain. When a key is missing in the active locale,
   * the registry walks this chain until it finds the key.
   * Defaults to `[defaultLocale]` if omitted.
   */
  fallbackLocales: v.optional(v.array(StrSchema)),
  /**
   * When `false`, allows partial locale files. Missing keys are filled
   * from the fallback chain. The default locale must always be complete.
   * Default: `true` (all locales must pass full schema validation).
   */
  strict: v.optional(BoolSchema),
});

/**
 * Configuration for creating a locale registry.
 *
 * Combines the Valibot-validated base fields with the generic `schema` field.
 * The `schema` field is `TSchema extends v.GenericSchema` — a Valibot schema
 * itself, which cannot be represented as a Valibot schema (circular).
 *
 * @template TSchema - The Valibot schema defining the locale string structure.
 *
 * @example
 * ```typescript
 * const options: LocaleRegistryOptions<typeof MySchema> = {
 *   schema: MySchema,
 *   defaultLocale: 'en',
 *   locales: { en: enStrings, es: esStrings },
 *   fallbackLocales: ['en'],
 *   strict: false,
 * };
 * ```
 */
type LocaleRegistryOptions<TSchema extends v.GenericSchema> = v.InferOutput<
  typeof LocaleRegistryOptionsBaseSchema
> & {
  /** Valibot schema defining the locale string structure. */
  readonly schema: TSchema;
  /** Optional custom formatters for pipe syntax and message ref modifiers. */
  readonly formatters?: FormatterMap;
};

/**
 * A locale registry instance.
 *
 * Manages built locale objects and an active locale selector.
 * All methods return `Result<T>`.
 *
 * Irreducible TS type: contains function-typed properties (e.g., `() => Result<Str>`)
 * which cannot be represented in Valibot schemas — Valibot validates data shapes, not
 * function signatures. Also generic over `TSchema` which has no runtime representation.
 *
 * @template TSchema - The Valibot schema defining the locale string structure.
 */
export type LocaleRegistry<TSchema extends v.GenericSchema> = {
  /** Returns the active locale code. */
  readonly active: () => Result<Str>;
  /** Sets the active locale code. Returns error if locale not found. */
  readonly setActive: (code: Str) => Result<Void>;
  /** Returns all available locale codes. */
  readonly list: () => Result<StrArray>;
  /** Returns the built locale strings for a specific locale code. */
  readonly get: (code: Str) => Result<BuiltLocale<TSchema>>;
  /** Checks whether a locale code exists in the registry. */
  readonly has: (code: Str) => Result<Bool>;
  /** Adds or replaces a locale in the registry. Validates and builds the raw strings. */
  readonly set: (code: Str, raw: RawLocaleStrings) => Result<Void>;
  /** Returns the built locale strings for the active locale. Shorthand for `get(active())`. */
  readonly t: () => Result<BuiltLocale<TSchema>>;
  /** Removes a locale from the registry. Cannot remove the active or default locale. */
  readonly remove: (code: Str) => Result<Void>;
};

// =============================================================================
// Locale Key Merging
// =============================================================================

/**
 * Recursively merges missing keys from a fallback locale into a primary locale.
 * Only fills `undefined` entries — never overwrites existing values.
 *
 * @param {Record<Str, unknown>} primary - The primary built locale object (may have missing keys).
 * @param {Record<Str, unknown>} fallback - The fallback built locale object (should be complete).
 * @returns {Result<Record<Str, unknown>>} The merged locale object with all keys filled from fallback.
 */
function mergeLocaleKeys(
  primary: Record<Str, unknown>,
  fallback: Record<Str, unknown>,
): Result<Record<Str, unknown>> {
  const merged: Record<Str, unknown> = { ...primary };

  for (const [key, fallbackValue] of Object.entries(fallback)) {
    if (merged[key] === undefined) {
      merged[key] = fallbackValue;
    } else if (
      typeof merged[key] === 'object' &&
      merged[key] !== null &&
      typeof fallbackValue === 'object' &&
      fallbackValue !== null &&
      !Array.isArray(merged[key]) &&
      !Array.isArray(fallbackValue)
    ) {
      // Recurse into nested objects — runtime-guarded by typeof/null/Array checks above
      const primaryChild: Record<Str, unknown> = merged[key] as Record<Str, unknown>; // Irreducible: non-null, non-array object confirmed above — no Valibot schema for generic object
      const fallbackChild: Record<Str, unknown> = fallbackValue as Record<Str, unknown>; // Irreducible: same guard
      const childResult: Result<Record<Str, unknown>> = mergeLocaleKeys(
        primaryChild,
        fallbackChild,
      );

      if (!childResult.ok) {
        return childResult;
      }

      merged[key] = childResult.data;
    }
  }

  return okUnchecked<Record<Str, unknown>>(merged);
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a locale registry from a schema and raw locale strings.
 *
 * Validates and builds all provided locales eagerly. The default locale
 * is set as active. Additional locales can be added later via `set()`.
 *
 * When `strict` is `false`, non-default locales skip schema validation
 * and missing keys are filled from the fallback chain (defaults to `[defaultLocale]`).
 *
 * @template TSchema - The Valibot schema defining the locale string structure.
 * @param {LocaleRegistryOptions<TSchema>} options - Registry configuration (schema, defaultLocale, locales, fallbackLocales, strict, context).
 * @returns {Result<LocaleRegistry<TSchema>>} The registry, or a validation/build error.
 *
 * @example
 * ```typescript
 * const registry = createLocaleRegistry({
 *   schema: Schema,
 *   defaultLocale: 'en',
 *   locales: { en: enStrings, es: esStrings },
 *   fallbackLocales: ['en'],
 *   strict: false,
 * });
 * ```
 */
export function createLocaleRegistry<TSchema extends v.GenericSchema>(
  options: LocaleRegistryOptions<TSchema>,
): Result<LocaleRegistry<TSchema>> {
  // Validate defaultLocale
  const defaultLocaleResult: Result<Str> = safeParse(StrSchema, options.defaultLocale);

  if (!defaultLocaleResult.ok) {
    return defaultLocaleResult;
  }

  // Validate that defaultLocale exists in provided locales
  if (!(defaultLocaleResult.data in options.locales)) {
    return err(ERRORS.LOCALE.INVALID_LOCALE, {
      meta: {
        locale: defaultLocaleResult.data,
        available: Object.keys(options.locales),
      },
    });
  }

  const isStrict: Bool = options.strict !== false;
  const fallbackChain: readonly Str[] = options.fallbackLocales ?? [defaultLocaleResult.data];

  // Validate fallback chain — all locales must exist in provided locales
  for (const fallbackCode of fallbackChain) {
    if (!(fallbackCode in options.locales)) {
      return err(ERRORS.LOCALE.INVALID_FALLBACK, {
        meta: {
          locale: fallbackCode,
          available: Object.keys(options.locales),
        },
      });
    }
  }

  // Build all provided locales eagerly
  const built: Map<Str, BuiltLocale<TSchema>> = new Map<Str, BuiltLocale<TSchema>>();

  for (const [code, raw] of Object.entries(options.locales)) {
    const codeResult: Result<Str> = safeParse(StrSchema, code);

    if (!codeResult.ok) {
      return codeResult;
    }

    const isDefault: Bool = codeResult.data === defaultLocaleResult.data;

    // Schema validation: strict mode validates all; non-strict only validates default
    if (isStrict || isDefault) {
      const parseResult: Result<unknown> = safeParse(options.schema, raw);

      if (!parseResult.ok) {
        return err(ERRORS.LOCALE.VALIDATION_FAILED, {
          meta: { locale: codeResult.data },
          cause: parseResult.error,
        });
      }
    }

    // Build callable locale object — pass locale code for Intl APIs
    const buildResult: Result<BuiltLocale<TSchema>> = buildLocale(
      options.schema,
      raw,
      options.context,
      codeResult.data,
      options.formatters,
    );

    if (!buildResult.ok) {
      return err(ERRORS.LOCALE.BUILD_FAILED, {
        meta: { locale: codeResult.data },
        cause: buildResult.error,
      });
    }

    built.set(codeResult.data, buildResult.data as BuiltLocale<TSchema>); // Irreducible: DeepReadonly mangles function-typed BuiltLocale properties; runtime value is correct
  }

  // Non-strict mode: fill missing keys from fallback chain
  if (!isStrict) {
    for (const [code, builtLocale] of built) {
      if (code === defaultLocaleResult.data) {
        continue;
      } // Default is always complete

      let merged: Record<Str, unknown> = builtLocale as unknown as Record<Str, unknown>; // Irreducible: builtLocale is an object built by buildLocale — no generic Valibot schema

      for (const fallbackCode of fallbackChain) {
        const fallbackLocale: BuiltLocale<TSchema> | undefined = built.get(fallbackCode);

        if (fallbackLocale) {
          const mergeResult: Result<Record<Str, unknown>> = mergeLocaleKeys(
            merged,
            fallbackLocale as unknown as Record<Str, unknown>, // Irreducible: builtLocale is object built by buildLocale, no generic Valibot schema
          );

          if (!mergeResult.ok) {
            return mergeResult;
          }

          merged = mergeResult.data;
        }
      }

      built.set(code, merged as BuiltLocale<TSchema>); // Irreducible: merged has same shape, keys filled from fallback
    }
  }

  // Mutable active locale — closed over by the registry methods
  let activeCode: Str = defaultLocaleResult.data;

  const registry: LocaleRegistry<TSchema> = {
    active: (): Result<Str> => {
      return ok(StrSchema, activeCode);
    },

    setActive: (code: Str): Result<Void> => {
      const codeResult: Result<Str> = safeParse(StrSchema, code);

      if (!codeResult.ok) {
        return codeResult;
      }

      if (!built.has(codeResult.data)) {
        return err(ERRORS.LOCALE.INVALID_LOCALE, {
          meta: {
            locale: codeResult.data,
            available: [...built.keys()],
          },
        });
      }

      activeCode = codeResult.data;
      return ok(VoidSchema, undefined);
    },

    list: (): Result<StrArray> => {
      return ok(StrArraySchema, [...built.keys()]);
    },

    get: (code: Str): Result<BuiltLocale<TSchema>> => {
      const codeResult: Result<Str> = safeParse(StrSchema, code);

      if (!codeResult.ok) {
        return codeResult;
      }

      const locale: BuiltLocale<TSchema> | undefined = built.get(codeResult.data);

      if (!locale) {
        return err(ERRORS.LOCALE.INVALID_LOCALE, {
          meta: {
            locale: codeResult.data,
            available: [...built.keys()],
          },
        });
      }

      return okUnchecked<BuiltLocale<TSchema>>(locale);
    },

    has: (code: Str): Result<Bool> => {
      const codeResult: Result<Str> = safeParse(StrSchema, code);

      if (!codeResult.ok) {
        return codeResult;
      }
      return ok(BoolSchema, built.has(codeResult.data));
    },

    set: (code: Str, raw: RawLocaleStrings): Result<Void> => {
      const codeResult: Result<Str> = safeParse(StrSchema, code);

      if (!codeResult.ok) {
        return codeResult;
      }

      // Validate raw strings against schema
      const parseResult: Result<unknown> = safeParse(options.schema, raw);

      if (!parseResult.ok) {
        return err(ERRORS.LOCALE.VALIDATION_FAILED, {
          meta: { locale: codeResult.data },
          cause: parseResult.error,
        });
      }

      // Build callable locale object — pass locale code
      const buildResult: Result<BuiltLocale<TSchema>> = buildLocale(
        options.schema,
        raw,
        options.context,
        codeResult.data,
        options.formatters,
      );

      if (!buildResult.ok) {
        return err(ERRORS.LOCALE.BUILD_FAILED, {
          meta: { locale: codeResult.data },
          cause: buildResult.error,
        });
      }

      built.set(codeResult.data, buildResult.data as BuiltLocale<TSchema>); // Irreducible: DeepReadonly mangles function-typed BuiltLocale properties; runtime value is correct
      return ok(VoidSchema, undefined);
    },

    t: (): Result<BuiltLocale<TSchema>> => {
      const locale: BuiltLocale<TSchema> | undefined = built.get(activeCode);

      if (!locale) {
        return err(ERRORS.LOCALE.INVALID_LOCALE, {
          meta: {
            locale: activeCode,
            available: [...built.keys()],
          },
        });
      }

      return okUnchecked<BuiltLocale<TSchema>>(locale);
    },

    remove: (code: Str): Result<Void> => {
      const codeResult: Result<Str> = safeParse(StrSchema, code);

      if (!codeResult.ok) {
        return codeResult;
      }

      // Cannot remove active locale
      if (codeResult.data === activeCode) {
        return err(ERRORS.LOCALE.REMOVE_DENIED, {
          meta: { locale: codeResult.data, reason: 'locale is currently active' },
        });
      }

      // Cannot remove default locale
      if (codeResult.data === defaultLocaleResult.data) {
        return err(ERRORS.LOCALE.REMOVE_DENIED, {
          meta: { locale: codeResult.data, reason: 'locale is the default' },
        });
      }

      // Must exist
      if (!built.has(codeResult.data)) {
        return err(ERRORS.LOCALE.INVALID_LOCALE, {
          meta: {
            locale: codeResult.data,
            available: [...built.keys()],
          },
        });
      }

      built.delete(codeResult.data);
      return ok(VoidSchema, undefined);
    },
  };

  return okUnchecked<LocaleRegistry<TSchema>>(registry);
}

// =============================================================================
// Namespace Types
// =============================================================================

/** Valibot schema for a namespace definition — schema + raw strings per locale. */
const NamespaceDefinitionSchema = v.strictObject({
  /** Valibot schema for this namespace's locale strings. */
  schema: v.custom<v.GenericSchema>((): Bool => true), // cast safe: Valibot schema instance, validated at build time
  /** Map of locale code → raw locale strings for this namespace. */
  locales: v.record(StrSchema, RawLocaleStringsSchema),
});

/** A namespace definition. See {@link NamespaceDefinitionSchema}. */
type NamespaceDefinition<TSchema extends v.GenericSchema> = Omit<
  v.InferOutput<typeof NamespaceDefinitionSchema>,
  'schema'
> & {
  /** Valibot schema for this namespace's locale strings. */
  readonly schema: TSchema;
};

/** Valibot schema for namespaced registry options. */
const NamespacedRegistryOptionsSchema = v.strictObject({
  /** Default locale code (must exist in every namespace's locales). */
  defaultLocale: StrSchema,
  /** Map of namespace name → namespace definition. */
  namespaces: v.record(StrSchema, NamespaceDefinitionSchema),
  /** Optional context values substituted into plain strings at build time. */
  context: v.optional(RawLocaleStringsSchema),
  /** Locale fallback chain. Defaults to `[defaultLocale]`. */
  fallbackLocales: v.optional(v.array(StrSchema)),
  /** When `false`, allows partial locale files. Default: `true`. */
  strict: v.optional(BoolSchema),
  /** Optional custom formatters for pipe syntax and message ref modifiers. */
  formatters: v.optional(v.custom<FormatterMap>((): Bool => true)), // cast safe: FormatterMap contains function types
});

/** Options for creating a namespaced locale registry. See {@link NamespacedRegistryOptionsSchema}. */
type NamespacedRegistryOptions = v.InferOutput<typeof NamespacedRegistryOptionsSchema>;

/**
 * A namespaced locale registry with synchronized locale switching.
 *
 * Irreducible TS type: contains function-typed properties — Valibot validates
 * data shapes, not function signatures. Also generic over namespace schemas.
 */
export type NamespacedRegistry = {
  /** Returns the active locale code. */
  readonly active: () => Result<Str>;
  /** Sets the active locale across all namespaces that support it. */
  readonly setActive: (code: Str) => Result<Void>;
  /** Returns locale codes supported by ALL namespaces (intersection). */
  readonly list: () => Result<StrArray>;
  /** Returns the built locale strings for a namespace (active locale). */
  readonly ns: (namespace: Str) => Result<BuiltLocale<v.GenericSchema>>;
  /** Adds a namespace dynamically (uses current active locale as default). */
  readonly addNamespace: (
    name: Str,
    definition: NamespaceDefinition<v.GenericSchema>,
  ) => Result<Void>;
  /** Removes a namespace from the registry. */
  readonly removeNamespace: (name: Str) => Result<Void>;
  /** Checks whether a namespace exists in the registry. */
  readonly hasNamespace: (name: Str) => Result<Bool>;
  /** Returns all namespace names. */
  readonly listNamespaces: () => Result<StrArray>;
  /** Adds or replaces a locale in a specific namespace (for lazy loading). */
  readonly setLocale: (namespace: Str, code: Str, raw: RawLocaleStrings) => Result<Void>;
};

// =============================================================================
// Namespaced Registry Factory
// =============================================================================

/**
 * Creates a namespaced locale registry with synchronized locale switching.
 *
 * Each namespace has its own schema and raw strings. `setActive()` propagates
 * to all namespaces that have the target locale. Namespaces can be added
 * dynamically for lazy loading patterns.
 *
 * @param {NamespacedRegistryOptions} options - Namespaced registry configuration.
 * @returns {Result<NamespacedRegistry>} The registry, or a validation error.
 *
 * @example
 * ```typescript
 * const registry = createNamespacedRegistry({
 *   defaultLocale: 'en',
 *   namespaces: {
 *     common: { schema: CommonSchema, locales: { en: commonEn, es: commonEs } },
 *     auth: { schema: AuthSchema, locales: { en: authEn } },
 *   },
 * });
 * if (!registry.ok) return registry;
 *
 * const common = registry.data.ns('common');
 * registry.data.setActive('es');
 * ```
 */
export function createNamespacedRegistry(
  options: NamespacedRegistryOptions,
): Result<NamespacedRegistry> {
  const defaultLocaleResult: Result<Str> = safeParse(StrSchema, options.defaultLocale);

  if (!defaultLocaleResult.ok) {
    return defaultLocaleResult;
  }

  const registries: Map<Str, LocaleRegistry<v.GenericSchema>> = new Map<
    Str,
    LocaleRegistry<v.GenericSchema>
  >();

  // Create a sub-registry for each namespace
  for (const [name, definition] of Object.entries(options.namespaces)) {
    const nameResult: Result<Str> = safeParse(StrSchema, name);

    if (!nameResult.ok) {
      return nameResult;
    }

    const subResult: Result<LocaleRegistry<v.GenericSchema>> = createLocaleRegistry({
      schema: definition.schema,
      defaultLocale: defaultLocaleResult.data,
      locales: definition.locales,
      context: options.context,
      fallbackLocales: options.fallbackLocales ? [...options.fallbackLocales] : undefined,
      strict: options.strict,
      formatters: options.formatters,
    });

    if (!subResult.ok) {
      return subResult;
    }

    registries.set(nameResult.data, subResult.data as LocaleRegistry<v.GenericSchema>); // Irreducible: DeepReadonly mangles function-typed properties; runtime value is already a LocaleRegistry
  }

  // Mutable active locale — closed over by the registry methods
  let activeCode: Str = defaultLocaleResult.data;

  const registry: NamespacedRegistry = {
    active: (): Result<Str> => {
      return ok(StrSchema, activeCode);
    },

    setActive: (code: Str): Result<Void> => {
      const codeResult: Result<Str> = safeParse(StrSchema, code);

      if (!codeResult.ok) {
        return codeResult;
      }

      // Propagate to all namespaces that have this locale
      for (const [_name, subRegistry] of registries) {
        const hasResult: Result<Bool> = subRegistry.has(codeResult.data);

        if (!hasResult.ok) {
          return hasResult;
        }
        if (hasResult.data) {
          const setResult: Result<Void> = subRegistry.setActive(codeResult.data);

          if (!setResult.ok) {
            return setResult;
          }
        }
      }

      activeCode = codeResult.data;
      return ok(VoidSchema, undefined);
    },

    list: (): Result<StrArray> => {
      if (registries.size === 0) {
        return ok(StrArraySchema, []);
      }

      // Intersection of all namespace locale lists
      let intersection: Set<Str> | undefined = undefined;

      for (const [_name, subRegistry] of registries) {
        const listResult: Result<StrArray> = subRegistry.list();

        if (!listResult.ok) {
          return listResult;
        }

        const codes: Set<Str> = new Set<Str>(listResult.data);

        if (intersection === undefined) {
          intersection = codes;
        } else {
          for (const code of intersection) {
            if (!codes.has(code)) {
              intersection.delete(code);
            }
          }
        }
      }

      return ok(StrArraySchema, [...(intersection ?? [])]);
    },

    ns: (namespace: Str): Result<BuiltLocale<v.GenericSchema>> => {
      const nsResult: Result<Str> = safeParse(StrSchema, namespace);

      if (!nsResult.ok) {
        return nsResult;
      }

      const subRegistry: LocaleRegistry<v.GenericSchema> | undefined = registries.get(
        nsResult.data,
      );

      if (!subRegistry) {
        return err(ERRORS.LOCALE.INVALID_LOCALE, {
          meta: { locale: nsResult.data, available: [...registries.keys()] },
        });
      }

      return subRegistry.t();
    },

    addNamespace: (name: Str, definition: NamespaceDefinition<v.GenericSchema>): Result<Void> => {
      const nameResult: Result<Str> = safeParse(StrSchema, name);

      if (!nameResult.ok) {
        return nameResult;
      }

      const subResult: Result<LocaleRegistry<v.GenericSchema>> = createLocaleRegistry({
        schema: definition.schema,
        defaultLocale: activeCode,
        locales: definition.locales,
        context: options.context,
        fallbackLocales: options.fallbackLocales ? [...options.fallbackLocales] : undefined,
        strict: options.strict,
        formatters: options.formatters,
      });

      if (!subResult.ok) {
        return subResult;
      }

      registries.set(nameResult.data, subResult.data as LocaleRegistry<v.GenericSchema>); // Irreducible: DeepReadonly mangles function-typed properties; runtime value is already a LocaleRegistry
      return ok(VoidSchema, undefined);
    },

    removeNamespace: (name: Str): Result<Void> => {
      const nameResult: Result<Str> = safeParse(StrSchema, name);

      if (!nameResult.ok) {
        return nameResult;
      }

      if (!registries.has(nameResult.data)) {
        return err(ERRORS.LOCALE.INVALID_LOCALE, {
          meta: { locale: nameResult.data, available: [...registries.keys()] },
        });
      }

      registries.delete(nameResult.data);
      return ok(VoidSchema, undefined);
    },

    hasNamespace: (name: Str): Result<Bool> => {
      const nameResult: Result<Str> = safeParse(StrSchema, name);

      if (!nameResult.ok) {
        return nameResult;
      }
      return ok(BoolSchema, registries.has(nameResult.data));
    },

    listNamespaces: (): Result<StrArray> => {
      return ok(StrArraySchema, [...registries.keys()]);
    },

    setLocale: (namespace: Str, code: Str, raw: RawLocaleStrings): Result<Void> => {
      const nsResult: Result<Str> = safeParse(StrSchema, namespace);

      if (!nsResult.ok) {
        return nsResult;
      }

      const codeResult: Result<Str> = safeParse(StrSchema, code);

      if (!codeResult.ok) {
        return codeResult;
      }

      const subRegistry: LocaleRegistry<v.GenericSchema> | undefined = registries.get(
        nsResult.data,
      );

      if (!subRegistry) {
        return err(ERRORS.LOCALE.INVALID_LOCALE, {
          meta: { locale: nsResult.data, available: [...registries.keys()] },
        });
      }

      return subRegistry.set(codeResult.data, raw);
    },
  };

  return okUnchecked<NamespacedRegistry>(registry);
}
