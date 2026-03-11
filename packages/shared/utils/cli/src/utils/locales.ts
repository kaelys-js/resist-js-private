/**
 * CLI Locale Resolution
 *
 * Consolidates all locale infrastructure into a single `resolveLocale()` function.
 * Loads both CLI framework and tool-specific locales, validates against schemas,
 * builds callable locale objects, and resolves the user's preferred locale.
 *
 * Priority: `--locale` flag > `LANG` env var > `config.defaultLocale`.
 *
 * All functions return `Result<T>`. All input is validated through `safeParse`.
 * All callers check `.ok` before using `.data`.
 *
 * @module
 */

import * as v from 'valibot';

import { en } from '@/cli/locale/locales/en';
import { CliStringsSchema, type BuiltCliStrings } from '@/cli/locale/schema';
import { buildLocale } from '@/locale';
import {
  BuiltCliStringsSchema,
  type BaseLocaleStrings,
  type FlagDefinition,
  type FlagName,
} from '@/cli/schemas';
import { generic } from '@/schemas/generic/generic';
import { getConfig } from '@/config/loader';
import {
  BoolSchema,
  KebabCaseIdSchema,
  NonNegativeIntegerSchema,
  NullableStrSchema,
  StrArraySchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type DynamicModule,
  type KebabCaseId,
  type NonNegativeInteger,
  type NullableStr,
  type OptionalStr,
  type RawLocaleStrings,
  type Str,
  type StrArray,
  type NullableRegExpMatchArray,
  type UntypedParseResult,
  type Void,
} from '@/schemas/common';
import type { Locale } from '@/schemas/core-config/business';
import type { CoreConfig } from '@/schemas/core-config/config';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { deepFreeze as _deepFreeze, type DeepReadonly } from '@/utils/core/object';
import { getArgv, getEnvVar } from '@/utils/core/process';
import { getPmTool } from '@/utils/core/shell';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Local Type Aliases
// =============================================================================

/** Schema for optional readonly flag definitions array. */
const OptionalReadonlyFlagDefsSchema = v.optional(
  v.custom<readonly FlagDefinition[]>(
    (val: unknown): boolean => Array.isArray(val),
    'Expected an array of FlagDefinition objects',
  ),
);

/** Readonly array of flag definitions, or `undefined`. @see {@link OptionalReadonlyFlagDefsSchema} */
type OptionalReadonlyFlagDefs = v.InferOutput<typeof OptionalReadonlyFlagDefsSchema>;

/** Schema for nullable Valibot generic schema. */
const NullableGenericSchemaSchema = v.nullable(
  v.custom<v.GenericSchema>(
    (val: unknown): boolean => typeof val === 'object' && val !== null && 'type' in val,
    'Expected a Valibot schema object',
  ),
);

/** `v.GenericSchema` or `null`. @see {@link NullableGenericSchemaSchema} */
type NullableGenericSchema = v.InferOutput<typeof NullableGenericSchemaSchema>;

// =============================================================================
// Types
// =============================================================================

/**
 * Generic schema for resolved locale result.
 */
export const ResolvedLocaleSchema = generic(
  <TStrings>(stringsSchema: v.GenericSchema<TStrings> = v.unknown() as v.GenericSchema<TStrings>) =>
    v.strictObject({
      /** Resolved locale code (e.g., `'en'`, `'es'`). */
      locale: KebabCaseIdSchema,
      /** Built CLI framework strings for the resolved locale. */
      cliStrings: v.custom<BuiltCliStrings>(
        (val: unknown): boolean => typeof val === 'object' && val !== null,
      ),
      /** Built tool-specific strings for the resolved locale. */
      toolStrings: stringsSchema,
      /** Full tool locale registry (all locales, deeply frozen). */
      toolRegistry: v.custom<DeepReadonly<Record<Locale, TStrings>>>(
        (val: unknown): boolean => typeof val === 'object' && val !== null,
      ),
    }),
);

/**
 * Result of {@link resolveLocale} — everything needed for locale-aware CLI operation.
 * Compile-time type alias; runtime schema: {@link ResolvedLocaleSchema}.
 */
export type ResolvedLocale<TStrings extends BaseLocaleStrings> = {
  locale: KebabCaseId;
  cliStrings: BuiltCliStrings;
  toolStrings: TStrings;
  toolRegistry: DeepReadonly<Record<Locale, TStrings>>;
};

// =============================================================================
// Private Helpers
// =============================================================================

/**
 * Extracts the language code from a `LANG` environment variable value.
 *
 * Handles common formats: `en_US.UTF-8`, `en_US`, `en.UTF-8`, `en`.
 * Returns `'en'` for `C`/`POSIX` locales as a safe fallback.
 *
 * @param langValue - The `LANG` env var value. Validated via `StrSchema`.
 * @returns `Result<Str>` — the extracted language code.
 */
function parseLangEnv(langValue: Str): Result<Str> {
  const langResult: Result<Str> = safeParse(StrSchema, langValue);
  if (!langResult.ok) return langResult;

  const trimmed: Str = langResult.data.trim();
  if (!trimmed || trimmed === 'C' || trimmed === 'POSIX') {
    return ok(StrSchema, 'en');
  }
  // Extract language code before any '_', '.', or '@' delimiter
  const match: NullableRegExpMatchArray = trimmed.match(/^([a-zA-Z]{2,3})/);
  if (match) {
    return ok(StrSchema, match[1].toLowerCase());
  }
  return ok(StrSchema, 'en');
}

/**
 * Peeks at raw CLI args to extract the `--locale` value without full flag parsing.
 *
 * Handles both `--locale=en` and `--locale en` forms.
 * Returns `null` if `--locale` is not found in args.
 *
 * @param args - Raw CLI arguments (`process.argv.slice(2)`). Validated via `StrArraySchema`.
 * @returns `Result<NullableStr>` containing the locale value, or `null` if not found.
 */
function peekLocaleFlag(args: StrArray): Result<NullableStr> {
  const argsResult: Result<StrArray> = safeParse(StrArraySchema, args);
  if (!argsResult.ok) return argsResult;

  const zeroResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
  if (!zeroResult.ok) return zeroResult;

  for (let i: NonNegativeInteger = zeroResult.data; i < argsResult.data.length; ) {
    const arg: Str = argsResult.data[i];
    if (arg.startsWith('--locale=')) {
      const value: OptionalStr = arg.split('=')[1];
      return ok(NullableStrSchema, value ?? null);
    }
    if (
      arg === '--locale' &&
      i + 1 < argsResult.data.length &&
      !argsResult.data[i + 1].startsWith('-')
    ) {
      return ok(NullableStrSchema, argsResult.data[i + 1]);
    }
    const nextI: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, i + 1);
    if (!nextI.ok) return nextI;
    i = nextI.data;
  }
  return ok(NullableStrSchema, null);
}

/**
 * Resolves the user's preferred locale from CLI args, `LANG` env var, or config default.
 *
 * Priority: `--locale` flag > `LANG` env var > `config.defaultLocale`.
 * Validates the resolved locale against the configured locales array.
 *
 * - `--locale=invalid` → returns an error Result.
 * - `LANG` set to unsupported locale → silently falls through to `config.defaultLocale`.
 *
 * @param configLocales - Array of configured locale codes (e.g., `['en', 'es']`).
 *   Readonly KebabCaseId array — no Valibot schema for readonly generic arrays, TS typing sufficient.
 * @param defaultLocale - The configured default locale (e.g., `'en'`). Validated via `KebabCaseIdSchema`.
 * @param overrideArgs - Optional argv override for programmatic invocation.
 *   When provided, used instead of reading from `process.argv`.
 * @returns `Result<Str>` — the resolved locale code, or an error.
 */
function resolvePreferredLocale(
  configLocales: readonly KebabCaseId[],
  defaultLocale: KebabCaseId,
  overrideArgs?: StrArray,
): Result<Str> {
  const defaultResult: Result<KebabCaseId> = safeParse(KebabCaseIdSchema, defaultLocale);
  if (!defaultResult.ok) return defaultResult;

  // 1. Check --locale flag from raw args (pre-parse peek)
  let rawArgs: StrArray;
  if (overrideArgs !== undefined) {
    const overrideResult: Result<StrArray> = safeParse(StrArraySchema, overrideArgs);
    if (!overrideResult.ok) return overrideResult;
    rawArgs = overrideResult.data;
  } else {
    const argvResult: Result<StrArray> = getArgv();
    if (!argvResult.ok) return argvResult;
    rawArgs = argvResult.data;
  }
  const localeFromFlag: Result<NullableStr> = peekLocaleFlag(rawArgs);
  if (!localeFromFlag.ok) return localeFromFlag;
  if (localeFromFlag.data) {
    if (configLocales.includes(localeFromFlag.data)) {
      return ok(StrSchema, localeFromFlag.data);
    }
    return err(ERRORS.LOCALE.INVALID_LOCALE, {
      meta: { locale: localeFromFlag.data, available: configLocales },
    });
  }

  // 2. Check LANG env var
  const langEnvResult: Result<OptionalStr> = getEnvVar('LANG');
  if (!langEnvResult.ok) return langEnvResult;
  const langEnv: OptionalStr = langEnvResult.data;
  if (langEnv) {
    const parsedLang: Result<Str> = parseLangEnv(langEnv);
    if (!parsedLang.ok) return parsedLang;
    if (configLocales.includes(parsedLang.data)) {
      return ok(StrSchema, parsedLang.data);
    }
    // LANG not in config.locales — fall through to default
  }

  // 3. Use config.defaultLocale
  return ok(StrSchema, defaultResult.data);
}

/**
 * Validates that every tool flag definition has a description in every locale.
 *
 * Each locale in the registry must have a `flags` record containing a key
 * matching each tool flag's `name`. Returns an error on the first missing key.
 *
 * @param toolFlagDefs - Tool-specific flag definitions from the command/runner definition.
 *   Readonly FlagDefinition array — complex TS type, no Valibot schema exists.
 * @param localeRegistry - Built tool locale registry (all locales).
 *   Complex generic record — TS typing sufficient.
 * @returns `Result<Void>` — success, or a validation error.
 */
function validateToolFlagLocales(
  toolFlagDefs: OptionalReadonlyFlagDefs,
  localeRegistry: Record<string, { flags?: Record<FlagName, Str> }>,
): Result<Void> {
  const flagDefsResult: Result<OptionalReadonlyFlagDefs> = safeParse(
    OptionalReadonlyFlagDefsSchema,
    toolFlagDefs,
  );
  if (!flagDefsResult.ok) return flagDefsResult;
  const registryResult: Result<Record<string, { flags?: Record<string, Str> }>> = safeParse(
    v.record(v.string(), v.looseObject({ flags: v.optional(v.record(v.string(), StrSchema)) })),
    localeRegistry,
  );
  if (!registryResult.ok) return registryResult;

  if (!flagDefsResult.data || flagDefsResult.data.length === 0) return ok(VoidSchema, undefined);

  for (const [localeName, localeStrings] of Object.entries(registryResult.data)) {
    const flagDescriptions: Record<string, Str> = localeStrings.flags ?? {};
    for (const def of flagDefsResult.data) {
      if (!(def.name in flagDescriptions)) {
        return err(ERRORS.LOCALE.MISSING_FLAG_DESCRIPTION, {
          meta: { field: def.name, locale: localeName, location: `locale.${localeName}.flags` },
        });
      }
    }
  }
  return ok(VoidSchema, undefined);
}

/**
 * Validates a locale registry against `config.locales`.
 *
 * Returns an error if any config-declared locale is missing from the registry
 * or if the registry contains locales not declared in config.
 *
 * @param moduleName - Module name for error messages (e.g., `'sync'`, `'cli-framework'`). Validated via `KebabCaseIdSchema`.
 * @param registryKeys - Keys from the locale registry to validate. Validated via `StrArraySchema`.
 * @param configLocales - Array of configured locale codes.
 * @returns `Result<Bool>` — `true` on success, or a validation error.
 */
function validateLocaleRegistry(
  moduleName: KebabCaseId,
  registryKeys: StrArray,
  configLocales: readonly KebabCaseId[],
): Result<Bool> {
  const nameResult: Result<KebabCaseId> = safeParse(KebabCaseIdSchema, moduleName);
  if (!nameResult.ok) return nameResult;
  const keysResult: Result<StrArray> = safeParse(StrArraySchema, registryKeys);
  if (!keysResult.ok) return keysResult;
  const configLocalesResult: Result<KebabCaseId[]> = safeParse(v.array(KebabCaseIdSchema), [
    ...configLocales,
  ]);
  if (!configLocalesResult.ok) return configLocalesResult;

  const registrySet: Set<Str> = new Set(keysResult.data);
  const configSet: Set<Str> = new Set(configLocalesResult.data);
  const validationErrors: StrArray = [];

  for (const locale of configLocalesResult.data) {
    if (!registrySet.has(locale)) {
      validationErrors.push(`Missing locale "${locale}" in registry (declared in config.locales)`);
    }
  }

  for (const locale of keysResult.data) {
    if (!configSet.has(locale)) {
      validationErrors.push(`Orphaned locale "${locale}" in registry (not in config.locales)`);
    }
  }

  if (validationErrors.length > 0) {
    return err(ERRORS.LOCALE.REGISTRY_MISMATCH, {
      meta: { module: nameResult.data, errors: validationErrors },
    });
  }

  return ok(BoolSchema, true);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Resolves and loads all locale strings for both the CLI framework and a specific tool.
 *
 * Performs the complete locale lifecycle in a single call:
 * 1. Loads all tool locale files for `config.locales`
 * 2. Validates tool locale registry against config
 * 3. Loads all CLI framework locale files for `config.locales`
 * 4. Validates CLI locale registry against config
 * 5. Validates tool flag locale descriptions exist in every locale
 * 6. Resolves the user's preferred locale via priority:
 *    `--locale` flag > `LANG` env var > `config.defaultLocale`
 * 7. Returns the resolved locale code, CLI strings, tool strings, and full registries
 *
 * Call once at the top of `initializeCli`, before signal handlers or flag parsing.
 *
 * @template TStrings - Tool-specific locale string type (extends {@link BaseLocaleStrings}).
 * @param toolId - Tool identifier for locale file discovery (e.g., `'sync'`, `'dev-proxy'`). Validated via `KebabCaseIdSchema`.
 * @param toolFlagDefs - Tool-specific flag definitions (for locale description validation).
 *   Readonly FlagDefinition array — complex TS type, no Valibot schema.
 * @param overrideArgs - Optional argv override for programmatic invocation.
 *   When provided, bypasses `getArgv()` for locale detection.
 * @returns `Promise<Result<ResolvedLocale<TStrings>>>` — resolved locale context, or an error.
 */
export async function resolveLocale<TStrings extends BaseLocaleStrings>(
  toolId: KebabCaseId,
  toolFlagDefs?: readonly FlagDefinition[],
  overrideArgs?: StrArray,
): Promise<Result<ResolvedLocale<TStrings>>> {
  const toolIdResult: Result<KebabCaseId> = safeParse(KebabCaseIdSchema, toolId);
  if (!toolIdResult.ok) return toolIdResult;
  const flagDefsResult: Result<OptionalReadonlyFlagDefs> = safeParse(
    OptionalReadonlyFlagDefsSchema,
    toolFlagDefs,
  );
  if (!flagDefsResult.ok) return flagDefsResult;

  // 1. Get config
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  const configLocales: KebabCaseId[] = [];
  for (const l of configResult.data.locales) {
    const localeResult: Result<KebabCaseId> = safeParse(KebabCaseIdSchema, l);
    if (!localeResult.ok) return localeResult;
    configLocales.push(localeResult.data);
  }

  const defaultLocaleResult: Result<KebabCaseId> = safeParse(
    KebabCaseIdSchema,
    configResult.data.defaultLocale,
  );
  if (!defaultLocaleResult.ok) return defaultLocaleResult;
  const defaultLocale: KebabCaseId = defaultLocaleResult.data;

  // =========================================================================
  // 2. Load tool locales
  // =========================================================================
  const rawToolRegistry: RawLocaleStrings = {};

  for (const locale of configLocales) {
    try {
      const mod: DynamicModule = await import(
        `../tools/${toolIdResult.data}/locales/locales/${locale}.ts`
      );
      rawToolRegistry[locale] = mod[locale];
    } catch (thrown: unknown) {
      return err(ERRORS.LOCALE.LOAD_FAILED, {
        meta: { locale, toolId: toolIdResult.data },
        cause: fromUnknownError(thrown),
      });
    }
  }

  // Validate tool registry against config.locales
  const toolRegistryValidation: Result<Bool> = validateLocaleRegistry(
    toolIdResult.data,
    Object.keys(rawToolRegistry),
    configLocales,
  );
  if (!toolRegistryValidation.ok) return toolRegistryValidation;

  // Auto-import tool-specific Valibot schema, validate, and build callable locales.
  // Schema file exports a PascalCase schema named after the tool (e.g., SyncStringsSchema).
  let toolSchema: NullableGenericSchema = null;
  try {
    const schemaMod: DynamicModule = await import(
      `../tools/${toolIdResult.data}/locales/schema.ts`
    );
    const schemaExport: OptionalStr = Object.keys(schemaMod).find(
      (key: Str): Bool => key.endsWith('Schema'),
    );
    if (schemaExport && schemaMod[schemaExport]) {
      const candidate: unknown = schemaMod[schemaExport];
      if (typeof candidate === 'object' && candidate !== null && 'type' in candidate) {
        toolSchema = candidate as v.GenericSchema; // Runtime-guarded by typeof + 'type' in check above
      }
    }
  } catch (thrown: unknown) {
    return err(ERRORS.LOCALE.LOAD_FAILED, {
      meta: { toolId: toolIdResult.data, file: 'schema.ts' },
      cause: fromUnknownError(thrown),
    });
  }

  // Compute locale context (values available to all locale strings as {placeholder})
  const pmToolResult: Result<Str> = getPmTool();
  if (!pmToolResult.ok) return pmToolResult;
  const localeContext: RawLocaleStrings = { pmTool: pmToolResult.data };

  const builtToolRegistryResult: Result<Record<string, unknown>> = safeParse(
    v.record(v.string(), v.unknown()),
    {},
  );
  if (!builtToolRegistryResult.ok) return builtToolRegistryResult;
  const builtToolRegistry: Record<string, TStrings> = builtToolRegistryResult.data as Record<
    string,
    TStrings
  >; // Irreducible: TStrings is generic — container validated, entries validated per-locale below.
  for (const [code, rawStrings] of Object.entries(rawToolRegistry)) {
    if (toolSchema) {
      const parseResult: Result<UntypedParseResult> = safeParse(toolSchema, rawStrings);
      if (!parseResult.ok) {
        return err(ERRORS.LOCALE.VALIDATION_FAILED, {
          meta: { toolId: toolIdResult.data, locale: code },
          cause: parseResult.error,
        });
      }
    }

    if (toolSchema) {
      const rawStrsObj: RawLocaleStrings =
        typeof rawStrings === 'object' && rawStrings !== null
          ? (rawStrings as RawLocaleStrings)
          : {};
      const builtResult: Result<UntypedParseResult> = buildLocale(
        toolSchema,
        rawStrsObj,
        localeContext,
      );
      if (!builtResult.ok) return builtResult;
      builtToolRegistry[code] = builtResult.data as TStrings; // Irreducible: TStrings is generic — no runtime schema. Validated by safeParse(toolSchema) above.
    } else {
      builtToolRegistry[code] = rawStrings as TStrings; // Irreducible: TStrings is generic — no runtime schema. No toolSchema available for fallback.
    }
  }

  const toolRegistryContainerResult: Result<Record<string, unknown>> = safeParse(
    v.record(v.string(), v.unknown()),
    builtToolRegistry,
  );
  if (!toolRegistryContainerResult.ok) return toolRegistryContainerResult;
  const toolRegistry: DeepReadonly<Record<string, TStrings>> = _deepFreeze(builtToolRegistry); // Irreducible: TStrings is generic — container validated above, entries validated per-locale during build phase.

  // =========================================================================
  // 3. Load CLI framework locales
  // =========================================================================
  const cliRegistryResult: Result<Record<string, BuiltCliStrings>> = safeParse(
    v.record(v.string(), BuiltCliStringsSchema),
    {},
  );
  if (!cliRegistryResult.ok) return cliRegistryResult;
  const cliRegistry: Record<string, BuiltCliStrings> = cliRegistryResult.data;

  // Build `en` eagerly — always available as fallback
  const enRaw: RawLocaleStrings = en as unknown as RawLocaleStrings; // Irreducible structural downcast: InferOutput<CliStringsSchema> → RawLocaleStrings. Required because buildLocale expects Record<string, unknown>.
  const builtEnResult: Result<BuiltCliStrings> = buildLocale(CliStringsSchema, enRaw);
  if (!builtEnResult.ok) {
    return err(ERRORS.LOCALE.BUILD_FAILED, {
      meta: { locale: 'en', component: 'cli-framework' },
      cause: builtEnResult.error,
    });
  }
  cliRegistry.en = builtEnResult.data;

  // Load non-en CLI locales
  for (const locale of configLocales) {
    if (locale === 'en') continue;

    try {
      const mod: DynamicModule = await import(`../locale/locales/${locale}.ts`);
      const parseResult: Result<UntypedParseResult> = safeParse(CliStringsSchema, mod[locale]);
      if (!parseResult.ok) {
        return err(ERRORS.LOCALE.VALIDATION_FAILED, {
          meta: { locale, component: 'cli-framework' },
          cause: parseResult.error,
        });
      }
      const modRaw: RawLocaleStrings =
        typeof mod[locale] === 'object' && mod[locale] !== null
          ? (mod[locale] as RawLocaleStrings)
          : {};
      const builtResult: Result<BuiltCliStrings> = buildLocale(CliStringsSchema, modRaw);
      if (!builtResult.ok) {
        return err(ERRORS.LOCALE.BUILD_FAILED, {
          meta: { locale, component: 'cli-framework' },
          cause: builtResult.error,
        });
      }
      cliRegistry[locale] = builtResult.data;
    } catch (thrown: unknown) {
      return err(ERRORS.LOCALE.LOAD_FAILED, {
        meta: { locale, component: 'cli-framework' },
        cause: fromUnknownError(thrown),
      });
    }
  }

  // Validate CLI registry against config.locales
  const cliFrameworkIdResult: Result<KebabCaseId> = safeParse(KebabCaseIdSchema, 'cli-framework');
  if (!cliFrameworkIdResult.ok) return cliFrameworkIdResult;
  const cliRegistryValidation: Result<Bool> = validateLocaleRegistry(
    cliFrameworkIdResult.data,
    Object.keys(cliRegistry),
    configLocales,
  );
  if (!cliRegistryValidation.ok) return cliRegistryValidation;

  // =========================================================================
  // 4. Validate tool flag locales
  // =========================================================================
  const toolFlagValidation: Result<Void> = validateToolFlagLocales(
    flagDefsResult.data,
    builtToolRegistry,
  );
  if (!toolFlagValidation.ok) return toolFlagValidation;

  // =========================================================================
  // 5. Resolve preferred locale
  // =========================================================================
  const resolvedLocaleResult: Result<Str> = resolvePreferredLocale(
    configLocales,
    defaultLocale,
    overrideArgs,
  );
  if (!resolvedLocaleResult.ok) return resolvedLocaleResult;
  const locale = resolvedLocaleResult.data;

  // =========================================================================
  // 6. Look up strings for resolved locale
  // =========================================================================
  const cliStrings: BuiltCliStrings = cliRegistry[locale] ?? cliRegistry.en;
  const toolStrings: TStrings = (toolRegistry[locale] ??
    toolRegistry[configLocales[0]]) as TStrings; // Irreducible: TStrings is generic — no runtime schema. Registry entries validated during build phase.

  return okUnchecked<ResolvedLocale<TStrings>>({
    locale,
    cliStrings,
    toolStrings,
    toolRegistry,
  });
}
