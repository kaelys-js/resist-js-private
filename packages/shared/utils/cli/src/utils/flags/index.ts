/**
 * Flag Definitions & Parsing
 *
 * Auto-discovers per-flag definition files via `import.meta.glob`,
 * assembles sorted flag definitions, and provides data-driven parsing.
 *
 * `parseFlags` is the single entry point for flag parsing — it handles
 * defaults, boolean/value flags, `--flag=value` syntax, side effects,
 * collision detection, and locale-aware error formatting.
 *
 * All functions return `Result<T>`. No function throws.
 *
 * @module
 */

import * as v from 'valibot';

import type { BuiltCliStrings } from '@/cli/locale/schema';
import {
  BuiltCliStringsSchema,
  CoreParseFlagsResultSchema,
  FlagDefinitionArraySchema,
  FlagDefinitionSchema,
  FlagValidationErrorArraySchema,
  FlagsRecordSchema,
  type CoreParseFlagsResult,
  type ExtendedFlags,
  type FlagDefinition,
  type FlagName,
  type FlagValidationError,
  type OptionalFlagDefinition,
  type OptionalFlagName,
} from '@/cli/schemas';
import { getConfig } from '@/config/loader';
import {
  NonNegativeIntegerSchema,
  StrArraySchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type CamelCaseString,
  type NonNegativeInteger,
  type Num,
  type OptionalStr,
  type Str,
  type StrArray,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import { ERRORS, type Result, err, ok } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Auto-Discovery & Assembly
// =============================================================================

/**
 * Auto-discovers all per-flag definition files via `import.meta.glob`.
 *
 * Each sibling `.ts` file (excluding `index.ts`) must export `default`
 * as `readonly FlagDefinition[]`. The assembled definitions are sorted
 * by `order` field (lower runs first during handler execution).
 */
const flagModules = import.meta.glob<{ default: readonly FlagDefinition[] }>(
  ['./*.ts', '!./index.ts'],
  { eager: true },
);

/** All flag definitions, sorted by handler execution order. */
export const FLAG_DEFINITIONS: readonly FlagDefinition[] = Object.values(flagModules)
  .flatMap((mod: { default: readonly FlagDefinition[] }): readonly FlagDefinition[] => mod.default)
  .sort((a: FlagDefinition, b: FlagDefinition): Num => a.order - b.order);

/** Command-scope flag definitions (shared by command + runner). */
export const COMMAND_FLAG_DEFS: readonly FlagDefinition[] = FLAG_DEFINITIONS.filter(
  (d: FlagDefinition): Bool => d.scope === 'command',
);

/** All flag definitions (runner uses full set). */
export const RUNNER_FLAG_DEFS: readonly FlagDefinition[] = FLAG_DEFINITIONS;

/**
 * Validates all `sideEffects.property` values target known flag properties.
 * Runs once at module load time. Checked at the start of `parseFlags`.
 */
const SIDE_EFFECT_VALIDATION: Result<Void> = ((): Result<Void> => {
  const knownProperties: Set<CamelCaseString> = new Set<CamelCaseString>(
    FLAG_DEFINITIONS.map((d: FlagDefinition) => d.property),
  );
  for (const def of FLAG_DEFINITIONS) {
    if (def.sideEffects) {
      for (const effect of def.sideEffects) {
        if (!knownProperties.has(effect.property)) {
          return err(ERRORS.INTERNAL.INVARIANT_VIOLATED, {
            meta: { flag: def.name, property: effect.property, function: 'SIDE_EFFECT_VALIDATION' },
          });
        }
      }
    }
  }
  return ok(VoidSchema, undefined);
})();

// =============================================================================
// Unified Flag Parsing (Data-Driven)
// =============================================================================

/**
 * Applies a parsed value to a value-type flag with schema-based validation.
 *
 * Uses `def.schema` for validation — no `allowedValues`, `numericValidation`,
 * or `allowedValuesFromConfig` branching. Single validation path.
 *
 * @param def - Flag definition for the flag being set.
 * @param rawValue - Raw string value from CLI arguments.
 * @param flags - Mutable flags record to update.
 * @param errors - Mutable error array to append validation errors.
 * @param explicitFlags - Mutable set to track explicitly provided flags.
 * @returns `Result<Void>` — success, or a config error.
 */
function applyValueFlag(
  def: FlagDefinition,
  rawValue: Str,
  flags: Record<CamelCaseString, unknown>,
  errors: FlagValidationError[],
  explicitFlags: Set<FlagName>,
): Result<Void> {
  const defResult: Result<FlagDefinition> = safeParse(FlagDefinitionSchema, def);
  if (!defResult.ok) return defResult;
  const rawResult: Result<Str> = safeParse(StrSchema, rawValue);
  if (!rawResult.ok) return rawResult;
  const flagsResult: Result<Record<CamelCaseString, unknown>> = safeParse(FlagsRecordSchema, flags);
  if (!flagsResult.ok) return flagsResult;

  const input: Str | Num =
    defResult.data.type === 'number' ? parseInt(rawResult.data, 10) : rawResult.data;
  // `unknown` because `def.schema` is `BaseSchema<unknown, unknown, ...>` — output type can't be inferred from the generic base
  const parseResult: Result<unknown> = safeParse(defResult.data.schema, input);

  if (!parseResult.ok) {
    errors.push({ flag: defResult.data.long, value: rawResult.data, type: 'invalid' });
    return ok(VoidSchema, undefined);
  }

  if (defResult.data.repeatable) {
    const arr: unknown = flags[defResult.data.property];
    if (Array.isArray(arr)) arr.push(parseResult.data);
  } else {
    flags[defResult.data.property] = parseResult.data;
  }
  explicitFlags.add(defResult.data.name);

  return ok(VoidSchema, undefined);
}

/**
 * Parses CLI arguments into flags using data-driven flag definitions.
 *
 * Single source of truth for flag parsing — used by both command.ts and runner.ts.
 * Defaults are derived from the flag definitions themselves (type-zero values
 * unless a `default` is specified). No external defaults object needed.
 *
 * @param args - Raw CLI arguments.
 * @param flagDefs - All flag definitions to parse against (framework + tool).
 * @param cliStrings - Pre-resolved CLI locale strings for error formatting.
 * @returns `Result` containing parsed flags and set of explicitly-provided flag names.
 */
export function parseFlags(
  args: StrArray,
  flagDefs: readonly FlagDefinition[],
  cliStrings: BuiltCliStrings,
): Result<CoreParseFlagsResult> {
  const argsResult: Result<StrArray> = safeParse(StrArraySchema, args);
  if (!argsResult.ok) return argsResult;
  const flagDefsResult: Result<FlagDefinition[]> = safeParse(FlagDefinitionArraySchema, flagDefs);
  if (!flagDefsResult.ok) return flagDefsResult;
  const stringsResult: Result<BuiltCliStrings> = safeParse(BuiltCliStringsSchema, cliStrings);
  if (!stringsResult.ok) return stringsResult;

  if (!SIDE_EFFECT_VALIDATION.ok) return SIDE_EFFECT_VALIDATION;

  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  const config: DeepReadonly<CoreConfig> = configResult.data;

  // Check for duplicate flags (framework-vs-tool or tool-vs-tool collisions)
  const seenLong: Map<Str, FlagName> = new Map<Str, FlagName>();
  const seenShort: Map<Str, FlagName> = new Map<Str, FlagName>();
  for (const def of flagDefs) {
    const existingLong: OptionalFlagName = seenLong.get(def.long);
    if (existingLong) {
      return err(ERRORS.CLI.DUPLICATE_FLAG, {
        meta: { flag: def.long, existingOwner: existingLong, newOwner: def.name },
      });
    }
    seenLong.set(def.long, def.name);
    if (def.short) {
      const existingShort: OptionalFlagName = seenShort.get(def.short);
      if (existingShort) {
        return err(ERRORS.CLI.DUPLICATE_FLAG, {
          meta: { flag: def.short, existingOwner: existingShort, newOwner: def.name },
        });
      }
      seenShort.set(def.short, def.name);
    }
  }

  const errors: FlagValidationError[] = [];
  const explicitFlags: Set<FlagName> = new Set<FlagName>();

  // Build defaults from flag definitions (framework + tool — all unified)
  const flags: Record<CamelCaseString, unknown> = {};
  for (const def of flagDefs) {
    if (def.defaultFromConfig && def.defaultFromConfig in config) {
      flags[def.property] = (config as Record<string, unknown>)[def.defaultFromConfig];
    } else if (def.default !== undefined) {
      flags[def.property] = def.default;
    } else if (def.repeatable) {
      flags[def.property] = [];
    } else if (def.type === 'boolean') {
      flags[def.property] = false;
    } else if (def.type === 'number') {
      flags[def.property] = 0;
    } else {
      flags[def.property] = '';
    }
  }

  // Build lookup maps for O(1) access per arg
  const booleanByArg: Map<Str, FlagDefinition> = new Map<Str, FlagDefinition>();
  const valueByLong: Map<Str, FlagDefinition> = new Map<Str, FlagDefinition>();
  const valueByShort: Map<Str, FlagDefinition> = new Map<Str, FlagDefinition>();

  for (const def of flagDefs) {
    if (def.type === 'boolean') {
      booleanByArg.set(def.long, def);
      if (def.short) booleanByArg.set(def.short, def);
    } else {
      valueByLong.set(def.long, def);
      if (def.short) valueByShort.set(def.short, def);
    }
  }

  // Single pass over args
  const zeroResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
  if (!zeroResult.ok) return zeroResult;

  for (let i: NonNegativeInteger = zeroResult.data; i < args.length; ) {
    const arg: Str = args[i];
    if (!arg.startsWith('-')) {
      const nextI: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, i + 1);
      if (!nextI.ok) return nextI;
      i = nextI.data;
      continue;
    }

    // 1. Check boolean flags
    const boolDef: OptionalFlagDefinition = booleanByArg.get(arg);
    if (boolDef) {
      flags[boolDef.property] = true;
      explicitFlags.add(boolDef.name);
      if (boolDef.sideEffects) {
        for (const effect of boolDef.sideEffects) {
          flags[effect.property] = effect.value;
        }
      }
      const nextI: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, i + 1);
      if (!nextI.ok) return nextI;
      i = nextI.data;
      continue;
    }

    // 2. Check value flags (--flag=value format)
    let handled: Bool = false;
    for (const [longFlag, def] of valueByLong) {
      if (arg.startsWith(`${longFlag}=`)) {
        const value: OptionalStr = arg.split('=')[1];
        handled = true;
        if (!value) {
          errors.push({ flag: longFlag, value: '', type: 'missing' });
        } else {
          const applyResult: Result<Void> = applyValueFlag(
            def,
            value,
            flags,
            errors,
            explicitFlags,
          );
          if (!applyResult.ok) return applyResult;
        }
        break;
      }
    }
    if (handled) {
      const nextI: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, i + 1);
      if (!nextI.ok) return nextI;
      i = nextI.data;
      continue;
    }

    // 3. Check value flags (--flag value or -x value format)
    let valueDef: OptionalFlagDefinition;
    if (arg.startsWith('--')) {
      valueDef = valueByLong.get(arg);
    } else {
      valueDef = valueByShort.get(arg);
    }
    if (valueDef) {
      const nextArg: OptionalStr = args[i + 1];
      if (!nextArg || nextArg.startsWith('-')) {
        errors.push({ flag: valueDef.long, value: '', type: 'missing' });
      } else {
        const applyResult: Result<Void> = applyValueFlag(
          valueDef,
          nextArg,
          flags,
          errors,
          explicitFlags,
        );
        if (!applyResult.ok) return applyResult;
        const skipI: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, i + 1);
        if (!skipI.ok) return skipI;
        i = skipI.data;
      }
      const nextI: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, i + 1);
      if (!nextI.ok) return nextI;
      i = nextI.data;
      continue;
    }

    // 4. Unknown flag
    errors.push({ flag: arg, value: '', type: 'unknown' });
    const nextI: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, i + 1);
    if (!nextI.ok) return nextI;
    i = nextI.data;
  }

  // Return error on validation errors with pre-formatted locale messages
  if (errors.length > 0) {
    const formattedResult: Result<StrArray> = formatFlagErrors(errors, cliStrings, flagDefs);
    if (!formattedResult.ok) return formattedResult;
    return err(ERRORS.CLI.PARSE_FAILED, { meta: { errors: formattedResult.data } });
  }

  return ok(CoreParseFlagsResultSchema(), { flags, explicitFlags });
}

/**
 * Extracts positional arguments (non-flag arguments).
 * Derives value-flag sets from the provided flag definitions.
 *
 * @param args - Raw CLI arguments.
 * @param flagDefs - Flag definitions to check against (framework + tool, all unified).
 * @returns `Result<StrArray>` — array of positional (non-flag) arguments, or a validation error.
 */
export function extractPositionalArgs(
  args: StrArray,
  flagDefs: readonly FlagDefinition[] = FLAG_DEFINITIONS,
): Result<StrArray> {
  const argsResult: Result<StrArray> = safeParse(StrArraySchema, args);
  if (!argsResult.ok) return argsResult;
  const flagDefsResult: Result<FlagDefinition[]> = safeParse(FlagDefinitionArraySchema, flagDefs);
  if (!flagDefsResult.ok) return flagDefsResult;

  const positional: StrArray = [];
  let skipNext: Bool = false;

  // Derive value-flag sets from definitions (framework + tool — all unified)
  const valueFlagsShort: Set<Str> = new Set<Str>();
  const valueFlagsLong: Set<Str> = new Set<Str>();
  for (const def of flagDefs) {
    if (def.type !== 'boolean') {
      valueFlagsLong.add(def.long);
      if (def.short) valueFlagsShort.add(def.short);
    }
  }

  const startResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
  if (!startResult.ok) return startResult;

  for (let i: NonNegativeInteger = startResult.data; i < args.length; ) {
    if (skipNext) {
      skipNext = false;
      const nextI: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, i + 1);
      if (!nextI.ok) return nextI;
      i = nextI.data;
      continue;
    }

    const arg: Str = args[i];

    if (arg.startsWith('-')) {
      // Check if this flag takes a value (and doesn't use = syntax)
      if (!arg.includes('=') && (valueFlagsShort.has(arg) || valueFlagsLong.has(arg))) {
        skipNext = true;
      }
      const nextI: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, i + 1);
      if (!nextI.ok) return nextI;
      i = nextI.data;
      continue;
    }

    positional.push(arg);
    const nextI: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, i + 1);
    if (!nextI.ok) return nextI;
    i = nextI.data;
  }

  return ok(StrArraySchema, positional);
}

// =============================================================================
// Flag-to-Argv Conversion (Programmatic Invocation)
// =============================================================================

/**
 * Converts a flags record to an argv-compatible string array.
 *
 * Uses flag definitions for camelCase → --kebab-case mapping.
 * Boolean flags are emitted as `--flag` (true) or omitted (false).
 * String/number flags are emitted as `--flag value`.
 * Repeatable flags emit `--flag value1 --flag value2`.
 *
 * Unknown keys (not in any flag definition) are skipped silently —
 * they will be caught by `parseFlags` downstream.
 *
 * @param flags - Flag values keyed by camelCase property name.
 * @param flagDefs - All flag definitions (framework + tool).
 * @returns `Result<StrArray>` — argv-style string array, or a validation error.
 *
 * @example
 * ```typescript
 * const argv = buildArgvFromFlags(
 *   { check: true, filter: '*.ts', concurrency: 4 },
 *   RUNNER_FLAG_DEFS,
 * );
 * // Result: ['--check', '--filter', '*.ts', '--concurrency', '4']
 * ```
 */
export function buildArgvFromFlags(
  flags: Record<Str, unknown>,
  flagDefs: readonly FlagDefinition[],
): Result<StrArray> {
  const flagsResult: Result<Record<Str, unknown>> = safeParse(
    v.record(v.string(), v.unknown()),
    flags,
  );
  if (!flagsResult.ok) return flagsResult;

  const argv: Str[] = [];

  // Build property → definition lookup
  const defByProperty: Map<Str, FlagDefinition> = new Map<Str, FlagDefinition>();
  for (const def of flagDefs) {
    defByProperty.set(def.property, def);
  }

  for (const [property, value] of Object.entries(flagsResult.data)) {
    const def: FlagDefinition | undefined = defByProperty.get(property);
    if (!def) continue; // Skip unknown keys

    if (def.type === 'boolean') {
      if (value === true) {
        argv.push(def.long);
      }
      // false = omit (default)
    } else if (def.repeatable && Array.isArray(value)) {
      for (const item of value) {
        argv.push(def.long, String(item));
      }
    } else if (value !== undefined && value !== '' && value !== 0) {
      argv.push(def.long, String(value));
    }
  }

  return ok(StrArraySchema, argv);
}

// =============================================================================
// Error Formatting (Data-Driven)
// =============================================================================

/**
 * Maps flag validation errors to locale-specific user-facing strings.
 *
 * Data-driven: delegates to `def.formatError` when available, falls back
 * to generic messages. No hard-coded flag names.
 *
 * @param errors - Flag validation errors to format.
 * @param strings - CLI framework locale strings.
 * @param flagDefs - Flag definitions (for per-flag formatError lookup).
 * @returns `Result<StrArray>` — formatted error messages, or a config error.
 */
export function formatFlagErrors(
  errors: FlagValidationError[],
  strings: BuiltCliStrings,
  flagDefs: readonly FlagDefinition[],
): Result<StrArray> {
  const errorsResult: Result<FlagValidationError[]> = safeParse(
    FlagValidationErrorArraySchema,
    errors,
  );
  if (!errorsResult.ok) return errorsResult;
  const stringsResult: Result<BuiltCliStrings> = safeParse(BuiltCliStringsSchema, strings);
  if (!stringsResult.ok) return stringsResult;
  const flagDefsResult: Result<FlagDefinition[]> = safeParse(FlagDefinitionArraySchema, flagDefs);
  if (!flagDefsResult.ok) return flagDefsResult;

  const defByLong: Map<Str, FlagDefinition> = new Map<Str, FlagDefinition>();
  for (const def of flagDefs) defByLong.set(def.long, def);

  const messages: StrArray = [];
  for (const e of errors) {
    let msgResult: Result<Str>;
    if (e.type === 'unknown') {
      msgResult = strings.runner.unknownFlags({ flags: e.flag });
    } else if (e.type === 'missing') {
      msgResult = strings.errors.missingFlagValue({ flag: e.flag });
    } else {
      const def: OptionalFlagDefinition = defByLong.get(e.flag);
      if (def?.formatError) {
        msgResult = def.formatError(e, strings);
      } else {
        msgResult = strings.errors.invalidFlagValue({ flag: e.flag, value: e.value });
      }
    }
    if (!msgResult.ok) return msgResult;
    messages.push(msgResult.data);
  }
  return ok(StrArraySchema, messages);
}
