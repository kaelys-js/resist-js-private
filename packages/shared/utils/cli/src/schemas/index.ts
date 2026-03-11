/**
 * CLI Framework Schemas
 *
 * Core Valibot schemas for the task runner framework.
 * All types are derived from schemas for runtime validation.
 *
 * File layout:
 * 1. Forward-declared types needed by schemas (TaskFunction, hooks, FlagDefinition, etc.)
 * 2. Valibot schemas with their derived types
 * 3. Pure TypeScript interfaces/types not needed by any schema
 *
 * This module exports:
 * - **Schemas** (`*Schema`) — Valibot schema objects for runtime validation
 * - **Types** — TypeScript types inferred from each schema via `v.InferOutput`
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { TaskRunnerDefinitionSchema, type TaskRunnerDefinition } from '@/cli/schemas';
 *
 * const result = safeParse(TaskRunnerDefinitionSchema, rawDefinition);
 * if (result.ok) {
 *   const def: TaskRunnerDefinition = result.data;
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';

import type {
  Bool,
  ExitCode,
  Num,
  Path,
  Str,
  StrArray,
  Void,
  NonNegativeInteger,
  PositiveInteger,
  KebabCaseId,
  Semver,
  CamelCaseString,
  EnvironmentConfig,
  SupportedRuntimes,
} from '@/schemas/common';
import {
  StrSchema,
  StrArraySchema,
  BoolSchema,
  ExitCodeSchema,
  NonNegativeIntegerSchema,
  PositiveIntegerSchema,
  PathSchema,
  KebabCaseIdSchema,
  SemverSchema,
  LogLevelSchema,
  CamelCaseStringSchema,
  NumSchema,
  OutputFormatSchema,
  SupportedRuntimesSchema,
} from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { arity } from '@/schemas/function/arity';
import { functionSchema } from '@/schemas/function/function';
import { generic } from '@/schemas/generic/generic';
import type { DeepReadonly } from '@/utils/core/object';
import { DEFAULT_CONCURRENCY } from '@/utils/core/process';
import type { BuiltCliStrings } from '@/cli/locale/schema';

// =============================================================================
// Local Type Aliases
// =============================================================================

/** Untyped side-effect value — set at parse time, consumed by tool logic. */
type SideEffectValue = unknown;

/** Schema for dynamic tool-specific flag values (shape from FlagDefinition[] at runtime). */
const DynamicToolFlagsSchema = v.record(v.string(), v.unknown());

/** Dynamic tool flags. @see {@link DynamicToolFlagsSchema} */
type DynamicToolFlags = v.InferOutput<typeof DynamicToolFlagsSchema>;

/** Default locale strings type when caller doesn't specify `TStrings`. */
type DefaultLocaleStrings = unknown;

// =============================================================================
// CLI Primitive Schemas
// =============================================================================

/**
 * Schema for flag value type (`'boolean'` | `'string'` | `'number'`).
 *
 * @example
 * ```typescript
 * const type: FlagType = 'boolean';
 * safeParse(FlagTypeSchema, type); // { ok: true, data: 'boolean' }
 * ```
 */
export const FlagTypeSchema = v.picklist(['boolean', 'string', 'number']);

/** Inferred output type of {@link FlagTypeSchema}. One of `'boolean'` | `'string'` | `'number'`. */
export type FlagType = v.InferOutput<typeof FlagTypeSchema>;

/**
 * Schema for short flag character (single letter, no dash prefix).
 *
 * @example
 * ```typescript
 * const ch: ShortFlagChar = 'v';
 * safeParse(ShortFlagCharSchema, ch); // { ok: true, data: 'v' }
 * ```
 */
export const ShortFlagCharSchema = v.pipe(
  v.string(),
  v.regex(/^[a-zA-Z]$/, 'Short flag must be a single letter without dash prefix'),
);

/** Inferred output type of {@link ShortFlagCharSchema}. A single ASCII letter. */
export type ShortFlagChar = v.InferOutput<typeof ShortFlagCharSchema>;

/**
 * Schema for flag name (kebab-case identifier, no dash prefix).
 *
 * Uses the same pattern as `KebabCaseIdSchema` from `@/schemas/common`
 * (functionally identical regex) but with a flag-specific error message.
 *
 * @example
 * ```typescript
 * const name: FlagName = 'dry-run';
 * safeParse(FlagNameSchema, name); // { ok: true, data: 'dry-run' }
 * ```
 */
export const FlagNameSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, 'Flag name must be kebab-case without dash prefix'),
);

/** Inferred output type of {@link FlagNameSchema}. A kebab-case flag name (e.g., `'dry-run'`). */
export type FlagName = v.InferOutput<typeof FlagNameSchema>;

/**
 * Schema for long flag form with `--` prefix (e.g., `'--dry-run'`).
 *
 * @example
 * ```typescript
 * const flag: LongFlag = '--dry-run';
 * safeParse(LongFlagSchema, flag); // { ok: true, data: '--dry-run' }
 * ```
 */
export const LongFlagSchema = v.pipe(
  v.string(),
  v.regex(/^--[a-z][a-z0-9]*(-[a-z0-9]+)*$/, 'Long flag must be --kebab-case (e.g., "--dry-run")'),
);

/** Inferred output type of {@link LongFlagSchema}. A long flag string (e.g., `'--dry-run'`). */
export type LongFlag = v.InferOutput<typeof LongFlagSchema>;

/**
 * Schema for short flag form with `-` prefix (e.g., `'-v'`).
 *
 * @example
 * ```typescript
 * const flag: ShortFlag = '-v';
 * safeParse(ShortFlagSchema, flag); // { ok: true, data: '-v' }
 * ```
 */
export const ShortFlagSchema = v.pipe(
  v.string(),
  v.regex(/^-[a-zA-Z]$/, 'Short flag must be -<letter> (e.g., "-v")'),
);

/** Inferred output type of {@link ShortFlagSchema}. A short flag string (e.g., `'-v'`). */
export type ShortFlag = v.InferOutput<typeof ShortFlagSchema>;

/**
 * Schema for flag scope.
 *
 * - `'command'` — shared by command + runner (standard framework flags).
 * - `'runner'` — runner-only (standard framework flags).
 * - `'tool'` — tool-specific flags defined in `tools/<name>/flags/*.ts`.
 *
 * @example
 * ```typescript
 * const scope: FlagScope = 'tool';
 * safeParse(FlagScopeSchema, scope); // { ok: true, data: 'tool' }
 * ```
 */
export const FlagScopeSchema = v.picklist(['command', 'runner', 'tool']);

/** Inferred output type of {@link FlagScopeSchema}. One of `'command'` | `'runner'` | `'tool'`. */
export type FlagScope = v.InferOutput<typeof FlagScopeSchema>;

/**
 * Schema for help display type override (`'string'` | `'number'`).
 *
 * @example
 * ```typescript
 * const helpType: HelpType = 'string';
 * safeParse(HelpTypeSchema, helpType); // { ok: true, data: 'string' }
 * ```
 */
export const HelpTypeSchema = v.picklist(['string', 'number']);

/** Inferred output type of {@link HelpTypeSchema}. One of `'string'` | `'number'`. */
export type HelpType = v.InferOutput<typeof HelpTypeSchema>;

/**
 * Exit code values for CLI.
 *
 * @example
 * ```typescript
 * process.exitCode = ExitCodeValue.SUCCESS;
 * ```
 */
export const ExitCodeValue = {
  /** Success - all tasks completed without errors. */
  SUCCESS: 0,
  /** Task failure - one or more tasks failed. */
  TASK_FAILURE: 1,
  /** Invalid usage - bad flags or arguments. */
  INVALID_USAGE: 2,
  /** Fatal error - internal/unexpected error. */
  FATAL_ERROR: 3,
  /** Interrupted - received SIGINT (Ctrl+C). */
  INTERRUPTED: 130,
} as const;

/**
 * Schema for exit code values. Derived from {@link ExitCodeValue} to stay in sync.
 *
 * @example
 * ```typescript
 * safeParse(ExitCodeValueSchema, 0); // { ok: true, data: 0 }
 * safeParse(ExitCodeValueSchema, 1); // { ok: true, data: 1 }
 * ```
 */
export const ExitCodeValueSchema = v.picklist(
  Object.values(ExitCodeValue) as [number, ...number[]], // Irreducible: Object.values returns number[] but v.picklist requires non-empty tuple
);

/** Inferred output type of {@link ExitCodeValueSchema}. One of `0` | `1` | `2` | `3` | `130`. */
export type CliExitCode = v.InferOutput<typeof ExitCodeValueSchema>;

/**
 * Non-empty string for tool binary names (e.g., `"biome"`, `"prettier"`, `"rustfmt"`).
 *
 * Allows alphanumeric characters, `@`, `/`, `_`, `.`, and `-` to support
 * scoped npm packages (`@prettier/plugin-xml`), underscored names (`fish_indent`),
 * and dotted names (`clang-format`). Rejects shell metacharacters to prevent
 * command injection when tool names are interpolated into shell commands.
 *
 * @example
 * ```typescript
 * const tool: ToolName = 'biome';
 * safeParse(ToolNameSchema, tool); // { ok: true, data: 'biome' }
 * ```
 */
export const ToolNameSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.regex(
    /^[a-zA-Z0-9@/_.\-]+$/,
    'Tool name must contain only alphanumeric characters, @, /, _, ., or -',
  ),
);

/** Inferred output type of {@link ToolNameSchema}. A non-empty tool binary name. */
export type ToolName = v.InferOutput<typeof ToolNameSchema>;

// =============================================================================
// Forward-Declared Types (needed by schemas below)
// =============================================================================

/**
 * Task options type — standard flags plus tool flag values.
 * Tool flags are typed as {@link DynamicToolFlags} since they're defined by tool `FlagDefinition[]`.
 * Runtime schema: {@link ExtendedFlagsSchema} (defined later — forward-declared type alias).
 */
export type TaskOptions = ExtendedFlags;

/**
 * Task function signature.
 * Called once per matched file with the file path and merged options.
 * Compile-time type alias; runtime schema: {@link TaskFunctionSchema}.
 *
 * @param file - Absolute path to the file being processed.
 * @param options - Standard flags merged with tool flag values.
 * @returns A {@link TaskResult} (or `Promise<TaskResult>`) describing the outcome.
 */
type TaskFunction = (file: Str, options: TaskOptions) => Promise<TaskResult> | TaskResult;

/**
 * Readonly options type for hooks and tasks.
 * Prevents mutation of the options object.
 */
export type ReadonlyTaskOptions<TToolFlags extends DynamicToolFlags = DynamicToolFlags> =
  DeepReadonly<StandardFlags & TToolFlags>;

/**
 * Generic schema for locale strings container.
 * Provides access to both CLI framework strings and runner-specific strings.
 *
 * @example
 * ```typescript
 * const MyLocale = TaskLocaleSchema(MyStringsSchema);
 * ```
 */
export const TaskLocaleSchema = generic(
  <TStrings>(stringsSchema: v.GenericSchema<TStrings> = v.unknown() as v.GenericSchema<TStrings>) =>
    v.strictObject({
      /** Framework strings for CLI (flags, progress, errors, etc.). Built locale — every key is callable. */
      cli: v.custom<BuiltCliStrings>(
        (val: unknown): boolean => typeof val === 'object' && val !== null,
      ),
      /** Runner-specific strings for current locale. Built locale — every key is callable. */
      runner: stringsSchema,
    }),
);

/**
 * Locale strings container for task context.
 * Compile-time type alias; runtime schema: {@link TaskLocaleSchema}.
 *
 * @template TStrings - Type for runner-specific locale strings.
 */
export type TaskLocale<TStrings = unknown> = {
  /** Framework strings for CLI (flags, progress, errors, etc.). Built locale — every key is callable. */
  cli: BuiltCliStrings;
  /** Runner-specific strings for current locale. Built locale — every key is callable. */
  runner: TStrings;
};

/**
 * Generic schema for task execution context.
 * Provides all necessary context for task execution in a single object.
 *
 * @example
 * ```typescript
 * const MyContext = TaskContextSchema(MyFlagsSchema, MyStringsSchema);
 * ```
 */
export const TaskContextSchema = generic(
  <TToolFlags extends Record<string, unknown>, TStrings>(
    flagsSchema: v.GenericSchema<TToolFlags> = DynamicToolFlagsSchema as v.GenericSchema<TToolFlags>,
    stringsSchema: v.GenericSchema<TStrings> = v.unknown() as v.GenericSchema<TStrings>,
  ) =>
    v.strictObject({
      /** Parsed options (standard flags + tool flags). Readonly to prevent mutation. */
      options: v.custom<DeepReadonly<StandardFlags & TToolFlags>>(
        (val: unknown): boolean => typeof val === 'object' && val !== null,
      ),
      /** Locale strings (cli + runner-specific). */
      locale: TaskLocaleSchema(stringsSchema),
      /** Current working directory. */
      cwd: StrSchema,
    }),
);

/**
 * Context passed to task function and hooks.
 * Compile-time type alias; runtime schema: {@link TaskContextSchema}.
 *
 * @template TToolFlags - Type for tool-specific flag values.
 * @template TStrings - Type for runner-specific locale strings.
 */
export type TaskContext<
  TToolFlags extends DynamicToolFlags = DynamicToolFlags,
  TStrings = unknown,
> = {
  /** Parsed options (standard flags + tool flags). Readonly to prevent mutation. */
  options: ReadonlyTaskOptions<TToolFlags>;
  /** Locale strings (cli + runner-specific). */
  locale: TaskLocale<TStrings>;
  /** Current working directory. */
  cwd: Str;
};

/**
 * Generic schema for the on-start hook function.
 *
 * @example
 * ```typescript
 * const MyHook = OnStartHookSchema(MyFlagsSchema, MyStringsSchema);
 * ```
 */
export const OnStartHookSchema = generic(
  <TToolFlags extends Record<string, unknown>, TStrings>(
    _flagsSchema: v.GenericSchema<TToolFlags> = DynamicToolFlagsSchema as v.GenericSchema<TToolFlags>,
    _stringsSchema: v.GenericSchema<TStrings> = v.unknown() as v.GenericSchema<TStrings>,
  ) => functionSchema<[TaskContext<TToolFlags, TStrings>], Promise<Result<Void>> | Result<Void>>(),
);

/**
 * Hook called before file processing starts.
 * Compile-time type alias; runtime schema: {@link OnStartHookSchema}.
 *
 * Returns `Result<Void>` — errors propagate to the runner and are displayed
 * by the CLI framework. Info modes that need to exit early after printing
 * may call `exit(0 as ExitCode)` directly.
 *
 * @template TToolFlags - Tool flag value types.
 * @template TStrings - Runner-specific locale string types.
 */
export type OnStartHook<
  TToolFlags extends DynamicToolFlags = DynamicToolFlags,
  TStrings = unknown,
> = (ctx: TaskContext<TToolFlags, TStrings>) => Promise<Result<Void>> | Result<Void>;

/**
 * Generic schema for the on-complete hook function.
 *
 * @example
 * ```typescript
 * const MyHook = OnCompleteHookSchema(MyFlagsSchema, MyStringsSchema);
 * ```
 */
export const OnCompleteHookSchema = generic(
  <TToolFlags extends Record<string, unknown>, TStrings>(
    _flagsSchema: v.GenericSchema<TToolFlags> = DynamicToolFlagsSchema as v.GenericSchema<TToolFlags>,
    _stringsSchema: v.GenericSchema<TStrings> = v.unknown() as v.GenericSchema<TStrings>,
  ) =>
    functionSchema<
      [TaskContext<TToolFlags, TStrings>, readonly TaskResult[]],
      Promise<Void> | Void
    >(),
);

/**
 * Hook called after all tasks complete.
 * Compile-time type alias; runtime schema: {@link OnCompleteHookSchema}.
 *
 * @template TToolFlags - Tool flag value types.
 * @template TStrings - Runner-specific locale string types.
 */
export type OnCompleteHook<
  TToolFlags extends DynamicToolFlags = DynamicToolFlags,
  TStrings = unknown,
> = (
  ctx: TaskContext<TToolFlags, TStrings>,
  results: readonly TaskResult[],
) => Promise<Void> | Void;

/**
 * Generic schema for the on-error hook function.
 *
 * @example
 * ```typescript
 * const MyHook = OnErrorHookSchema(MyFlagsSchema, MyStringsSchema);
 * ```
 */
export const OnErrorHookSchema = generic(
  <TToolFlags extends Record<string, unknown>, TStrings>(
    _flagsSchema: v.GenericSchema<TToolFlags> = DynamicToolFlagsSchema as v.GenericSchema<TToolFlags>,
    _stringsSchema: v.GenericSchema<TStrings> = v.unknown() as v.GenericSchema<TStrings>,
  ) => functionSchema<[TaskContext<TToolFlags, TStrings>, Error, Str], Promise<Void> | Void>(),
);

/**
 * Hook called when a task fails.
 * Compile-time type alias; runtime schema: {@link OnErrorHookSchema}.
 *
 * @template TToolFlags - Tool flag value types.
 * @template TStrings - Runner-specific locale string types.
 */
export type OnErrorHook<
  TToolFlags extends DynamicToolFlags = DynamicToolFlags,
  TStrings = unknown,
> = (ctx: TaskContext<TToolFlags, TStrings>, error: Error, file: Str) => Promise<Void> | Void;

/**
 * Generic schema for the on-files-discovered hook function.
 *
 * @example
 * ```typescript
 * const MyHook = OnFilesDiscoveredHookSchema(MyFlagsSchema, MyStringsSchema);
 * ```
 */
export const OnFilesDiscoveredHookSchema = generic(
  <TToolFlags extends Record<string, unknown>, TStrings>(
    _flagsSchema: v.GenericSchema<TToolFlags> = DynamicToolFlagsSchema as v.GenericSchema<TToolFlags>,
    _stringsSchema: v.GenericSchema<TStrings> = v.unknown() as v.GenericSchema<TStrings>,
  ) => functionSchema<[readonly Str[], TaskContext<TToolFlags, TStrings>], Promise<Void> | Void>(),
);

/**
 * Hook called after file discovery but before pool execution.
 * Compile-time type alias; runtime schema: {@link OnFilesDiscoveredHookSchema}.
 *
 * @template TToolFlags - Tool flag value types.
 * @template TStrings - Runner-specific locale string types.
 */
export type OnFilesDiscoveredHook<
  TToolFlags extends DynamicToolFlags = DynamicToolFlags,
  TStrings = unknown,
> = (files: readonly Str[], ctx: TaskContext<TToolFlags, TStrings>) => Promise<Void> | Void;

/** Schema for flag side effect entries. */
export const FlagSideEffectSchema = v.strictObject({
  /** CamelCase property to set. */
  property: CamelCaseStringSchema,
  /** Value to assign. */
  value: v.union([StrSchema, BoolSchema, NumSchema]),
});

/** Inferred output type of {@link FlagSideEffectSchema}. A side effect that sets a flag property. */
export type FlagSideEffect = v.InferOutput<typeof FlagSideEffectSchema>;

/**
 * Schema for a single standard flag's complete behavior.
 *
 * Single source of truth — parsing, help generation, known-flag sets,
 * positional-arg extraction, error formatting, environment defaults,
 * and active handlers all derive from these definitions.
 *
 * Includes function fields (via `functionSchema()`) that
 * `FlagDefinitionStaticSchema` excludes.
 *
 * Each per-flag file exports `default` as `readonly FlagDefinition[]`.
 * `flags/index.ts` auto-discovers all siblings via `import.meta.glob`.
 */
export const FlagDefinitionSchema = v.strictObject({
  // ─── Identity ───

  /** Kebab-case flag name. */
  name: FlagNameSchema,
  /** CamelCase property name. */
  property: CamelCaseStringSchema,
  /** Long form with `--` prefix. */
  long: LongFlagSchema,
  /** Short form with `-` prefix, or null. */
  short: v.nullable(ShortFlagSchema),

  // ─── Classification ───

  /** Value type. */
  type: FlagTypeSchema,
  /** Flag scope. */
  scope: FlagScopeSchema,

  // ─── Validation ───

  /** Valibot schema (opaque — always passes). */
  schema: v.custom<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(() => true),

  // ─── Behavior ───

  /** Parse-time side effects. At least one when provided. */
  sideEffects: v.optional(v.pipe(v.array(FlagSideEffectSchema), v.minLength(1))),
  /** Whether values accumulate. */
  repeatable: v.optional(BoolSchema),
  /** Static default value. */
  default: v.optional(v.union([StrSchema, NumSchema, BoolSchema])),
  /** Config property for runtime default. */
  defaultFromConfig: v.optional(CamelCaseStringSchema),

  // ─── Help ───

  /** Key into cliStrings.flags for help description. */
  descriptionKey: CamelCaseStringSchema,
  /** Override display type for help. */
  helpType: v.optional(HelpTypeSchema),

  // ─── Handler ───

  /** Handler execution priority (always ≥ 0). */
  order: NonNegativeIntegerSchema,
  /** Active flag handler. Called in order during `handleStandardFlags`. */
  handle: functionSchema<
    [StandardFlagsConfig<BaseLocaleStrings>],
    Result<NullableStandardFlagsResult>
  >(),
  /** Custom error formatter for invalid values. Falls back to generic if absent. */
  formatError: v.optional(functionSchema<[FlagValidationError, BuiltCliStrings], Result<Str>>()),

  // ─── Environment Defaults ───

  /** Environment default logic. Called during `initializeCli`. */
  applyEnvDefault: v.optional(
    functionSchema<
      [ExtendedFlags, DeepReadonly<EnvironmentConfig>, ReadonlySet<FlagName>],
      Result<Void>
    >(),
  ),

  // ─── Header Suppression ───

  /** Returns `true` when this flag's current value should suppress the header. */
  suppressHeader: v.optional(functionSchema<[DeepReadonly<ExtendedFlags>], Bool>()),
});

/**
 * Single standard flag definition.
 * Compile-time type alias; runtime schema: {@link FlagDefinitionSchema}.
 * @see {@link FlagDefinitionStaticSchema} for the static-only subset.
 */
export type FlagDefinition = v.InferOutput<typeof FlagDefinitionSchema>;

/**
 * Generic schema for command definitions.
 *
 * @example
 * ```typescript
 * const MyCmd = CommandDefinitionSchema(MyStringsSchema, MyFlagsSchema);
 * ```
 */
export const CommandDefinitionSchema = generic(
  <TStrings, TToolFlags extends Record<string, unknown>>(
    _stringsSchema: v.GenericSchema<TStrings> = v.unknown() as v.GenericSchema<TStrings>,
    _flagsSchema: v.GenericSchema<TToolFlags> = DynamicToolFlagsSchema as v.GenericSchema<TToolFlags>,
  ) =>
    v.looseObject({
      /** Unique identifier for this command (kebab-case). */
      id: KebabCaseIdSchema,
      /** Version string (semantic versioning). */
      version: SemverSchema,
      /** Runtimes this command supports. */
      runtimes: v.optional(SupportedRuntimesSchema),
      /** Tool-specific flag definitions. */
      flagDefs: v.optional(
        v.custom<readonly FlagDefinition[]>((val: unknown): boolean => Array.isArray(val)),
      ),
      /** Command handler — implements the command logic. */
      handler: functionSchema<[CommandContext<TStrings, TToolFlags>], Promise<Result<Void>>>(),
    }),
);

/**
 * Command definition for simple (non-file-processing) commands.
 * Compile-time type alias; runtime schema: {@link CommandDefinitionSchema}.
 *
 * @template TStrings - Type for command-specific locale strings.
 * @template TToolFlags - Type for tool-specific flags.
 */
export type CommandDefinition<
  TStrings = unknown,
  TToolFlags extends DynamicToolFlags = DynamicToolFlags,
> = {
  /** Unique identifier for this command (kebab-case, e.g., "docs", "dev-proxy"). */
  id: KebabCaseId;
  /** Version string (semantic versioning, e.g., "1.0.0"). */
  version: Semver;
  /** Runtimes this command supports. When omitted, all runtimes are allowed. */
  runtimes?: SupportedRuntimes;
  /** Tool-specific flag definitions from `tools/<name>/flags/`. */
  flagDefs?: readonly FlagDefinition[];
  /** Command handler — implements the command logic. */
  handler: (ctx: CommandContext<TStrings, TToolFlags>) => Promise<Result<Void>>;
};

// =============================================================================
// Task Status & Result Schemas
// =============================================================================

/** Schema for task result status. */
const TaskStatusSchema = v.picklist([
  'success', // Task completed successfully
  'unchanged', // Task had nothing to do (e.g., file already formatted)
  'failed', // Task failed with error
  'skipped', // Task was skipped (e.g., no handler for file type)
]);

/** Inferred output type of {@link TaskStatusSchema}. One of `'success'` | `'unchanged'` | `'failed'` | `'skipped'`. */
type TaskStatus = v.InferOutput<typeof TaskStatusSchema>;

/** Schema for a single task result. */
export const TaskResultSchema = v.strictObject({
  /** Absolute file path that was processed. */
  file: PathSchema,
  /** Relative file path from cwd. */
  relativePath: PathSchema,
  /** Result status. */
  status: TaskStatusSchema,
  /** Category/tool that processed this file (for grouping). Non-empty when present. */
  category: v.nullable(v.pipe(StrSchema, v.minLength(1))),
  /** Error message if failed. Non-empty when present. */
  error: v.nullable(v.pipe(StrSchema, v.minLength(1))),
  /** Duration in milliseconds (always ≥ 0). */
  duration: NonNegativeIntegerSchema,
  /** Optional output/diff for display. Non-empty when present. */
  output: v.nullable(v.pipe(StrSchema, v.minLength(1))),
});

/** Inferred output type of {@link TaskResultSchema}. A single file's processing result. */
export type TaskResult = v.InferOutput<typeof TaskResultSchema>;

// =============================================================================
// Exit Code & Example Schemas
// =============================================================================

/** Schema for exit code definition (validates against ExitCodeValue enum). */
export const ExitCodeDefinitionSchema = v.strictObject({
  /** Exit code value (must be 0, 1, 2, 3, or 130). */
  code: ExitCodeValueSchema,
  /** Human-readable description of what this exit code means. Always non-empty. */
  description: v.pipe(StrSchema, v.minLength(1)),
});

/** Inferred output type of {@link ExitCodeDefinitionSchema}. An exit code with its description. */
export type ExitCodeDefinition = v.InferOutput<typeof ExitCodeDefinitionSchema>;

/** Required exit codes that must be defined in every tool/command locale. */
const REQUIRED_EXIT_CODE_VALUES = new Set([0, 1, 2, 3, 130] as const);

/** Schema for complete exit codes array (all 5 required: 0, 1, 2, 3, 130). */
const RequiredExitCodesSchema = v.pipe(
  v.array(ExitCodeDefinitionSchema),
  v.length(5, 'All 5 exit codes (0, 1, 2, 3, 130) must be defined'),
  v.check((arr: ExitCodeDefinition[]): boolean => {
    const codes: Set<ExitCode> = new Set(arr.map((e: ExitCodeDefinition): ExitCode => e.code));
    for (const required of REQUIRED_EXIT_CODE_VALUES) {
      if (!codes.has(required)) return false;
    }
    return true;
  }, 'Exit codes must include all of: 0, 1, 2, 3, 130'),
);

/** Schema for example definition (command with description). */
export const ExampleDefinitionSchema = v.strictObject({
  /** The command to run. Always non-empty. */
  command: v.pipe(StrSchema, v.minLength(1)),
  /** Human-readable description of what this example demonstrates. Always non-empty. */
  description: v.pipe(StrSchema, v.minLength(1)),
});

/** Inferred output type of {@link ExampleDefinitionSchema}. A CLI example command with description. */
export type ExampleDefinition = v.InferOutput<typeof ExampleDefinitionSchema>;

// =============================================================================
// Standard Flags Schema
// =============================================================================

/** Schema for standard CLI flags available on all task runners. */
const StandardFlagsSchema = v.strictObject({
  /** Show help. */
  help: BoolSchema,
  /** Show version. */
  version: BoolSchema,
  /** Detailed output. */
  verbose: BoolSchema,
  /** Suppress output. */
  quiet: BoolSchema,
  /** Suppress output (alias for quiet). */
  silent: BoolSchema,
  /** Output format (pretty, compact, json, github, junit). */
  format: OutputFormatSchema,
  /** @deprecated Use --format=json instead. */
  json: BoolSchema,
  /** Group output by category. */
  group: BoolSchema,
  /** Force color on. */
  color: BoolSchema,
  /** Force color off. */
  noColor: BoolSchema,
  /** Max parallel tasks (must be ≥ 1). */
  concurrency: PositiveIntegerSchema,
  /** Preview mode (no changes). */
  dryRun: BoolSchema,
  /** Stop on first error. */
  failFast: BoolSchema,
  /** Filter files by substring match. */
  filter: StrSchema,
  /** Locale for CLI messages (BCP47 code, e.g., `'en'`). Always non-empty after defaults. */
  locale: v.pipe(StrSchema, v.minLength(1)),
  /** List files without processing. */
  listFiles: BoolSchema,
  /** Additional ignore patterns. */
  ignore: StrArraySchema,
  /** Task timeout in milliseconds (0 = no timeout). */
  timeout: NonNegativeIntegerSchema,
  /** Enable debug output. */
  debug: BoolSchema,
  /** Run tasks serially (concurrency=1). */
  serial: BoolSchema,
  /** Show progress bar. */
  progress: BoolSchema,
  /** Show detailed statistics. */
  stats: BoolSchema,
  /** Show timing for each file. */
  timing: BoolSchema,
  /** Only show summary, not individual results. */
  summaryOnly: BoolSchema,
  /** Warn for files slower than threshold (ms, 0 = disabled). */
  slowThreshold: NonNegativeIntegerSchema,
  /** @deprecated Use --format=github instead. */
  githubActions: BoolSchema,
  /** Hide header banner. */
  noHeader: BoolSchema,
  /** Write output to file. */
  output: StrSchema,
  /** Override working directory. */
  cwd: StrSchema,
  /** Read from stdin. */
  stdin: BoolSchema,
  /** Filepath for stdin content (for extension detection). */
  stdinFilepath: StrSchema,
  /** Internal log level. */
  logLevel: LogLevelSchema,
});

/** Inferred output type of {@link StandardFlagsSchema}. All standard CLI flags with their values. */
export type StandardFlags = v.InferOutput<typeof StandardFlagsSchema>;

/**
 * Schema for standard flags extended with dynamic tool flag values.
 *
 * Intersection of the strict standard flags schema with the dynamic record schema.
 * Validates that all standard flags are present while allowing additional tool flags.
 */
export const ExtendedFlagsSchema = v.intersect([StandardFlagsSchema, DynamicToolFlagsSchema]);

/**
 * Standard flags extended with tool flag values.
 * Tool flags are typed as {@link DynamicToolFlags} since they're defined by tool `FlagDefinition[]`.
 * @see {@link ExtendedFlagsSchema}
 */
export type ExtendedFlags = v.InferOutput<typeof ExtendedFlagsSchema>;

// =============================================================================
// Locale Strings Schemas
// =============================================================================

/** Schema for runner locale strings (runtime validation). Uses looseObject to allow extended locale properties. */
export const RunnerLocaleStringsSchema = v.looseObject({
  /** Display name (localizable). Always non-empty. */
  name: v.pipe(StrSchema, v.minLength(1)),
  /** Runner description shown in help. Always non-empty. */
  description: v.pipe(StrSchema, v.minLength(1)),
  /** Flag descriptions keyed by camelCase flag name. Values are non-empty descriptions. */
  flags: v.optional(v.record(CamelCaseStringSchema, v.pipe(StrSchema, v.minLength(1)))),
  /** Example usages shown in help (required, localized). At least one required. */
  examples: v.pipe(v.array(ExampleDefinitionSchema), v.minLength(1)),
  /** Exit codes for help documentation (all 5 required: 0, 1, 2, 3, 130). */
  exitCodes: RequiredExitCodesSchema,
});

/**
 * Schema for command locale strings (runtime validation).
 * Uses looseObject to allow custom properties beyond the base fields.
 */
export const CommandLocaleStringsSchema = v.looseObject({
  /** Display name (localizable). Always non-empty. */
  name: v.pipe(StrSchema, v.minLength(1)),
  /** Command description shown in help. Always non-empty. */
  description: v.pipe(StrSchema, v.minLength(1)),
  /** Flag descriptions keyed by camelCase flag name. Values are non-empty descriptions. */
  flags: v.optional(v.record(CamelCaseStringSchema, v.pipe(StrSchema, v.minLength(1)))),
  /** Example usages shown in help (required, localized). At least one required. */
  examples: v.pipe(v.array(ExampleDefinitionSchema), v.minLength(1)),
  /** Exit codes for help documentation (all 5 required: 0, 1, 2, 3, 130). */
  exitCodes: RequiredExitCodesSchema,
});

// =============================================================================
// Command Flags Schema
// =============================================================================

/** Schema for standard flags available for simple commands. */
export const CommandFlagsSchema = v.strictObject({
  /** Show help. */
  help: BoolSchema,
  /** Show version. */
  version: BoolSchema,
  /** Detailed output. */
  verbose: BoolSchema,
  /** Suppress output. */
  quiet: BoolSchema,
  /** Force color on. */
  color: BoolSchema,
  /** Force color off. */
  noColor: BoolSchema,
  /** Preview mode (no changes). */
  dryRun: BoolSchema,
  /** Locale for CLI messages (BCP47 code, e.g., `'en'`). Always non-empty after defaults. */
  locale: v.pipe(StrSchema, v.minLength(1)),
  /** Enable debug output. */
  debug: BoolSchema,
  /** Hide header banner. */
  noHeader: BoolSchema,
  /** Override working directory. */
  cwd: StrSchema,
  /** Internal log level. */
  logLevel: LogLevelSchema,
});

/** Standard flags available for simple commands. A subset of {@link StandardFlags}. */
export type CommandFlags = v.InferOutput<typeof CommandFlagsSchema>;

// =============================================================================
// Task Runner Definition Schema
// =============================================================================

/** Task function schema — validates callable with 2 parameters (file, options). */
const TaskFunctionSchema = v.pipe(
  functionSchema<[Str, TaskOptions], Promise<TaskResult> | TaskResult>(),
  arity(2),
);

/** Schema for task runner definition (runtime validation). */
export const TaskRunnerDefinitionSchema = v.strictObject({
  // Metadata
  /** Unique identifier for this runner (kebab-case, e.g., "my-tool"). */
  id: KebabCaseIdSchema,
  /** Version string (semantic versioning, e.g., "1.0.0"). */
  version: SemverSchema,

  // Runtime constraint
  /** Runtimes this runner supports. When omitted, all runtimes are allowed. */
  runtimes: v.optional(SupportedRuntimesSchema),

  // File discovery
  /** Glob patterns to match files. */
  patterns: v.optional(StrArraySchema, []),
  /** File extensions to match (e.g., ['.ts', '.js']). */
  extensions: v.optional(StrArraySchema, []),
  /** Patterns/files to ignore. */
  ignore: v.optional(StrArraySchema, []),

  // Execution
  /** Task function to run on each file. */
  task: TaskFunctionSchema,
  /** Max parallel tasks (default: CPU cores). */
  concurrency: v.optional(PositiveIntegerSchema, DEFAULT_CONCURRENCY),
  /** Default task timeout in milliseconds (0 = no timeout). */
  timeout: v.optional(
    NonNegativeIntegerSchema,
    (() => {
      const r = v.safeParse(NonNegativeIntegerSchema, 0);
      if (!r.success) throw new Error('BUG: NonNegativeInteger(0) schema validation failed');
      return r.output;
    })(),
  ),

  // Tool flag definitions
  /** Tool-specific flag definitions from `tools/<name>/flags/`. */
  flagDefs: v.optional(
    v.custom<readonly FlagDefinition[]>(
      (val) =>
        Array.isArray(val) &&
        val.every(
          (d: unknown) => typeof d === 'object' && d !== null && 'name' in d && 'handle' in d,
        ),
    ),
  ),

  // Hooks — validated as callable with correct arity
  /** Called before processing starts. Receives context with options and locale. */
  onStart: v.optional(
    v.pipe(functionSchema<Parameters<OnStartHook>, ReturnType<OnStartHook>>(), arity(1)),
  ),
  /** Called after file discovery but before pool execution. Receives files array and context. */
  onFilesDiscovered: v.optional(
    v.pipe(
      functionSchema<Parameters<OnFilesDiscoveredHook>, ReturnType<OnFilesDiscoveredHook>>(),
      arity(2),
    ),
  ),
  /** Called after all tasks complete. Receives results and context. */
  onComplete: v.optional(
    v.pipe(functionSchema<Parameters<OnCompleteHook>, ReturnType<OnCompleteHook>>(), arity(2)),
  ),
  /** Called when a task fails. Receives error, file path, and context. */
  onError: v.optional(
    v.pipe(functionSchema<Parameters<OnErrorHook>, ReturnType<OnErrorHook>>(), arity(3)),
  ),
});

// NOTE: CommandDefinitionSchema is defined above (as generic schema) alongside
// the CommandDefinition type alias. The previous non-generic version has been
// replaced by the generic version that supports typed strings and tool flags.

// =============================================================================
// Run Summary & Output Schemas
// =============================================================================

/** Schema for run summary statistics. */
export const RunSummarySchema = v.strictObject({
  /** Total files discovered. */
  total: NonNegativeIntegerSchema,
  /** Files processed (not skipped). */
  processed: NonNegativeIntegerSchema,
  /** Files that succeeded. */
  success: NonNegativeIntegerSchema,
  /** Files unchanged. */
  unchanged: NonNegativeIntegerSchema,
  /** Files that failed. */
  failed: NonNegativeIntegerSchema,
  /** Files skipped. */
  skipped: NonNegativeIntegerSchema,
  /** Total duration in milliseconds (always ≥ 0). */
  duration: NonNegativeIntegerSchema,
  /** Average duration per file in milliseconds (always ≥ 0). */
  avgDuration: NonNegativeIntegerSchema,
  /** Slowest file. */
  slowest: v.nullable(
    v.strictObject({
      /** Absolute file path. */
      file: PathSchema,
      /** Duration in milliseconds. */
      duration: NonNegativeIntegerSchema,
    }),
  ),
  /** Fastest file. */
  fastest: v.nullable(
    v.strictObject({
      /** Absolute file path. */
      file: PathSchema,
      /** Duration in milliseconds. */
      duration: NonNegativeIntegerSchema,
    }),
  ),
});

/** Inferred output type of {@link RunSummarySchema}. Aggregate statistics for a task run. */
export type RunSummary = v.InferOutput<typeof RunSummarySchema>;

/** Schema for structured run output (used by `--format=json` and internal formatters). */
export const RunOutputSchema = v.strictObject({
  /** Overall success (no failures). */
  success: BoolSchema,
  /** Summary statistics. */
  summary: RunSummarySchema,
  /** Individual file results. */
  files: v.array(TaskResultSchema),
  /** Grouped results by category. Keys are non-empty category names; each has ≥1 result. */
  byCategory: v.record(
    v.pipe(StrSchema, v.minLength(1)),
    v.pipe(v.array(TaskResultSchema), v.minLength(1)),
  ),
});

/** Inferred output type of {@link RunOutputSchema}. Complete structured output for a task run. */
export type RunOutput = v.InferOutput<typeof RunOutputSchema>;

// =============================================================================
// Programmatic Invocation Schemas
// =============================================================================

/**
 * Schema for programmatic invocation options.
 *
 * Allows calling a command or runner with typed flags instead of CLI argv.
 * All fields are optional — sensible defaults are applied.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { InvokeOptionsSchema, type InvokeOptions } from '@/cli/schemas';
 *
 * const opts: InvokeOptions = {
 *   flags: { check: true, filter: '*.ts' },
 *   cwd: '/my/project',
 *   silent: true,
 * };
 *
 * const result = safeParse(InvokeOptionsSchema, opts);
 * ```
 */
export const InvokeOptionsSchema = v.strictObject({
  /** Flag values keyed by camelCase property name. Merged with defaults. */
  flags: v.optional(v.record(v.string(), v.unknown()), {}),
  /** Positional arguments (file paths, patterns). */
  args: v.optional(StrArraySchema, []),
  /** Override working directory (defaults to process.cwd()). */
  cwd: v.optional(PathSchema),
  /** Override locale code (defaults to config.defaultLocale). */
  locale: v.optional(v.pipe(StrSchema, v.minLength(1))),
  /** Suppress all output (injects --quiet --no-header). Defaults to true. */
  silent: v.optional(BoolSchema, true),
});

/**
 * Options for programmatic tool invocation.
 * Compile-time type alias; runtime schema: {@link InvokeOptionsSchema}.
 *
 * @template TToolFlags - Type for tool-specific flag values.
 */
export type InvokeOptions<TToolFlags extends DynamicToolFlags = DynamicToolFlags> = {
  /** Flag values keyed by camelCase property name. Merged with defaults. */
  flags?: Partial<TToolFlags>;
  /** Positional arguments (file paths, patterns). */
  args?: StrArray;
  /** Override working directory (defaults to process.cwd()). */
  cwd?: Path;
  /** Override locale code (defaults to config.defaultLocale). */
  locale?: Str;
  /** Suppress all output (injects --quiet --no-header). Defaults to true. */
  silent?: Bool;
};

/**
 * Schema for programmatic invocation result.
 *
 * Returned by `invoke()` on both commands and runners. Runners additionally
 * populate `results` and `summary` fields.
 *
 * @example
 * ```typescript
 * const result = await runner.invoke({ flags: { check: true } });
 * if (result.ok) {
 *   const { exitCode, summary } = result.data;
 * }
 * ```
 */
export const InvokeResultSchema = v.strictObject({
  /** Exit code (0 = success, 1 = task failures, 2 = invalid usage, etc.). */
  exitCode: ExitCodeSchema,
  /** Individual task results (runner only). */
  results: v.optional(v.array(TaskResultSchema)),
  /** Aggregate summary statistics (runner only). */
  summary: v.optional(RunSummarySchema),
});

/** Result of programmatic invocation. @see {@link InvokeResultSchema} */
export type InvokeResult = v.InferOutput<typeof InvokeResultSchema>;

/**
 * Schema for the internal core run result (before display formatting).
 *
 * Returned by `runCore()` — the extracted computation from the runner's
 * `run()` method. Contains everything needed for both CLI display and
 * programmatic `invoke()` results.
 */
export const RunCoreResultSchema = v.strictObject({
  /** Exit code. */
  exitCode: ExitCodeSchema,
  /** Individual task results. */
  results: v.array(TaskResultSchema),
  /** Aggregate summary. */
  summary: RunSummarySchema,
});

/** Internal core run result. @see {@link RunCoreResultSchema} */
export type RunCoreResult = v.InferOutput<typeof RunCoreResultSchema>;

// =============================================================================
// Flag Schemas
// =============================================================================

/**
 * Validates the static (declarative) portion of a {@link FlagDefinition} at module load.
 *
 * Function fields (`handle`, `formatError`, `applyEnvDefault`) cannot be
 * validated by Valibot and are excluded. The `schema` field uses a custom
 * validator that always passes (Valibot schema objects are opaque).
 *
 * NOTE: Not yet wired up — available for future runtime validation of
 * flag definition files during module discovery.
 */
export const FlagDefinitionStaticSchema = v.strictObject({
  /** Kebab-case flag name. */
  name: FlagNameSchema,
  /** CamelCase property name. */
  property: CamelCaseStringSchema,
  /** Long form with `--` prefix. */
  long: LongFlagSchema,
  /** Short form with `-` prefix, or null. */
  short: v.nullable(ShortFlagSchema),
  /** Value type. */
  type: FlagTypeSchema,
  /** Flag scope. */
  scope: FlagScopeSchema,
  /** Valibot schema (opaque — always passes). */
  schema: v.custom<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(() => true),
  /** Parse-time side effects. At least one when provided. */
  sideEffects: v.optional(v.pipe(v.array(FlagSideEffectSchema), v.minLength(1))),
  /** Whether values accumulate. */
  repeatable: v.optional(BoolSchema),
  /** Static default value. */
  default: v.optional(v.union([StrSchema, NumSchema, BoolSchema])),
  /** Config property for runtime default (camelCase key, e.g., `'defaultLocale'`). */
  defaultFromConfig: v.optional(CamelCaseStringSchema),
  /** Key into cliStrings.flags for help description. */
  descriptionKey: CamelCaseStringSchema,
  /** Override display type for help. */
  helpType: v.optional(HelpTypeSchema),
  /** Handler execution priority (always ≥ 0). */
  order: NonNegativeIntegerSchema,
});

/** Schema for flag validation error. */
export const FlagValidationErrorSchema = v.strictObject({
  /** Flag name that failed validation. Always non-empty (e.g., `--format`, `-x`). */
  flag: v.pipe(StrSchema, v.minLength(1)),
  /** Value that was provided. */
  value: StrSchema,
  /** Error type. */
  type: v.picklist(['invalid', 'missing', 'unknown']),
});

/** Validation error for a flag. */
export type FlagValidationError = v.InferOutput<typeof FlagValidationErrorSchema>;

/** Schema for a single flag entry in the help display. */
export const HelpFlagEntrySchema = v.strictObject({
  /** Short flag form (e.g., `-h`), or `null`. */
  short: v.nullable(ShortFlagSchema),
  /** Long flag form (e.g., `--help`). */
  long: LongFlagSchema,
  /** Human-readable flag description. Always non-empty. */
  description: v.pipe(StrSchema, v.minLength(1)),
  /** Value type (`'boolean'`, `'string'`, or `'number'`). */
  type: v.optional(FlagTypeSchema),
  /** Default value for display. */
  default: v.optional(v.union([StrSchema, NumSchema, BoolSchema])),
  /** Whether this is a tool-specific flag (vs framework). */
  isTool: v.optional(BoolSchema),
});

/** A single flag entry formatted for help display. */
export type HelpFlagEntry = v.InferOutput<typeof HelpFlagEntrySchema>;

/** Valibot schema for arrays of HelpFlagEntry. */
export const HelpFlagEntryArraySchema = v.array(HelpFlagEntrySchema);

// =============================================================================
// Onboarding & Installer Schemas
// =============================================================================

/** Schema for the onboarding marker file structure. */
export const OnboardingMarkerSchema = v.strictObject({
  /** ISO 8601 timestamp of when onboarding completed (e.g., `'2026-01-15T12:00:00.000Z'`). */
  completedAt: v.pipe(StrSchema, v.isoTimestamp()),
  /** CLI version that ran onboard. */
  version: SemverSchema,
  /** Steps that were executed during onboarding. At least one; each non-empty. */
  steps: v.pipe(v.array(v.pipe(StrSchema, v.minLength(1))), v.minLength(1)),
});

/** Structure of the onboarding marker file. */
export type OnboardingMarker = v.InferOutput<typeof OnboardingMarkerSchema>;

/** Tool install category discriminator. */
export const InstallCategorySchema = v.picklist(['node', 'system']);

/** Inferred type of {@link InstallCategorySchema}. */
export type InstallCategory = v.InferOutput<typeof InstallCategorySchema>;

/** Schema for install command definition. */
export const InstallCommandSchema = v.strictObject({
  /** The command and args to run. At least one segment; each non-empty. */
  cmd: v.pipe(v.array(v.pipe(StrSchema, v.minLength(1))), v.minLength(1)),
  /** Prerequisite binary that must exist (first element of cmd if not specified). */
  requires: v.optional(ToolNameSchema),
  /** Tool category: 'node' for npm packages, 'system' for mise-managed tools. */
  category: v.optional(InstallCategorySchema),
  /** npm package name (for node tools, may differ from binary name e.g. biome → @biomejs/biome). */
  npmPackage: v.optional(v.pipe(StrSchema, v.minLength(1))),
});

/** Install command definition with optional prerequisite. */
export type InstallCommand = v.InferOutput<typeof InstallCommandSchema>;

/**
 * Record mapping tool names to their install command definitions.
 * Used by the tool installer to look up install instructions.
 */
export const InstallCommandsRecordSchema = v.record(ToolNameSchema, InstallCommandSchema);

/** Inferred type of the install commands record. */
export type InstallCommandsRecord = v.InferOutput<typeof InstallCommandsRecordSchema>;

// =============================================================================
// Input Schemas
// =============================================================================

/** Input for createRunner (schema for runtime validation). */
export const CreateRunnerInputSchema = v.strictObject({
  /** The task runner definition to create a runner from. */
  definition: TaskRunnerDefinitionSchema,
});

/** Input for discoverFiles. */
export const DiscoverFilesInputSchema = v.strictObject({
  /** Glob patterns to match files. */
  patterns: v.optional(StrArraySchema, []),
  /** File extensions to match (e.g., `['.ts', '.js']`). */
  extensions: v.optional(StrArraySchema, []),
  /** Patterns/files to ignore. */
  ignore: v.optional(StrArraySchema, []),
  /** Filter files by substring match. */
  filter: v.optional(StrSchema, ''),
  /** Working directory to discover files in. */
  cwd: PathSchema,
});

/** Inferred output type of {@link DiscoverFilesInputSchema}. Input for file discovery. */
export type DiscoverFilesInput = v.InferOutput<typeof DiscoverFilesInputSchema>;

// =============================================================================
// Pure TypeScript Interfaces & Types
// =============================================================================

/** Base locale strings for runners. @see {@link RunnerLocaleStringsSchema} */
export type RunnerLocaleStrings = v.InferOutput<typeof RunnerLocaleStringsSchema>;

/** Base locale strings for commands. @see {@link CommandLocaleStringsSchema} */
export type CommandLocaleStrings = v.InferOutput<typeof CommandLocaleStringsSchema>;

/**
 * Schema for structural base locale strings used by handleStandardFlags and flag handlers.
 * Includes callable `name()` and `description()` returning `Result<Str>`.
 */
export const BaseLocaleStringsSchema = v.strictObject({
  /** Returns the tool display name. */
  name: functionSchema<[], Result<Str>>(),
  /** Returns the tool description. */
  description: functionSchema<[], Result<Str>>(),
  /** Flag descriptions keyed by flag name. */
  flags: v.optional(v.record(FlagNameSchema, StrSchema)),
  /** Example usages shown in help. */
  examples: v.array(ExampleDefinitionSchema),
  /** Exit code definitions shown in help. */
  exitCodes: v.array(ExitCodeDefinitionSchema),
});

/** Structural base for locale strings. @see {@link BaseLocaleStringsSchema} */
export type BaseLocaleStrings = v.InferOutput<typeof BaseLocaleStringsSchema>;

/**
 * Generic schema for standard flags configuration.
 * Passed to flag handler callbacks and `handleStandardFlags`.
 */
export const StandardFlagsConfigSchema = generic(
  <TStrings>(stringsSchema: v.GenericSchema<TStrings> = v.unknown() as v.GenericSchema<TStrings>) =>
    v.strictObject({
      /** Raw CLI args. */
      args: StrArraySchema,
      /** Parsed flags. */
      flags: v.custom<DeepReadonly<ExtendedFlags>>(
        (val: unknown): boolean => typeof val === 'object' && val !== null,
      ),
      /** Set of explicitly-provided flag names. */
      explicitFlags: v.custom<ReadonlySet<FlagName>>((val: unknown): boolean => val instanceof Set),
      /** Detected environment config. */
      env: v.custom<DeepReadonly<EnvironmentConfig>>(
        (val: unknown): boolean => typeof val === 'object' && val !== null,
      ),
      /** CLI framework strings. */
      cliStrings: v.custom<BuiltCliStrings>(
        (val: unknown): boolean => typeof val === 'object' && val !== null,
      ),
      /** Tool/runner-specific locale strings. */
      toolStrings: stringsSchema,
      /** The definition's id. */
      definitionId: KebabCaseIdSchema,
      /** The definition's version. */
      definitionVersion: SemverSchema,
      /** Flag definitions. */
      flagDefs: v.custom<readonly FlagDefinition[]>((val: unknown): boolean => Array.isArray(val)),
      /** Tool-specific flag definitions. */
      toolFlagDefs: v.optional(
        v.custom<readonly FlagDefinition[]>((val: unknown): boolean => Array.isArray(val)),
      ),
      /** Help configuration. */
      help: v.strictObject({
        /** Builder for standard help flags. */
        standardFlagsBuilder: functionSchema<
          [BuiltCliStrings, (Record<string, Str> | undefined)?],
          Result<HelpFlagEntry[]>
        >(),
        /** Usage suffix. */
        usageSuffix: StrSchema,
      }),
    }),
);

/**
 * Configuration for {@link handleStandardFlags} and flag handler callbacks.
 * Compile-time type alias; runtime schema: {@link StandardFlagsConfigSchema}.
 */
export type StandardFlagsConfig<TStrings extends BaseLocaleStrings> = {
  args: StrArray;
  flags: DeepReadonly<ExtendedFlags>;
  explicitFlags: ReadonlySet<FlagName>;
  env: DeepReadonly<EnvironmentConfig>;
  cliStrings: BuiltCliStrings;
  toolStrings: TStrings;
  definitionId: KebabCaseId;
  definitionVersion: Semver;
  flagDefs: readonly FlagDefinition[];
  toolFlagDefs?: readonly FlagDefinition[];
  help: {
    standardFlagsBuilder: (
      cliStrings: BuiltCliStrings,
      toolFlagDescriptions?: Record<string, Str>,
    ) => Result<HelpFlagEntry[]>;
    usageSuffix: Str;
  };
};

/** Schema for the result of handleStandardFlags — either early exit or continue with resolved context. */
export const StandardFlagsResultSchema = v.variant('kind', [
  v.strictObject({
    /** Early exit — help, version, or error. */
    kind: v.literal('exit'),
    /** Exit code to return. */
    code: ExitCodeValueSchema,
  }),
  v.strictObject({
    /** Continue — standard flags handled, context resolved. */
    kind: v.literal('continue'),
    /** Resolved display name from locale strings. Always non-empty. */
    name: v.pipe(StrSchema, v.minLength(1)),
    /** Resolved description from locale strings. Always non-empty. */
    description: v.pipe(StrSchema, v.minLength(1)),
    /** Extracted positional args (non-flag arguments). */
    positionalArgs: StrArraySchema,
    /** Resolved current working directory. Always a non-empty path. */
    cwd: PathSchema,
  }),
]);

/** Result of handleStandardFlags — either early exit or continue with resolved context. */
export type StandardFlagsResult = v.InferOutput<typeof StandardFlagsResultSchema>;

/**
 * Generic schema for parsed flags result.
 */
export const CoreParseFlagsResultSchema = generic(
  <TFlags>(flagsSchema: v.GenericSchema<TFlags> = v.unknown() as v.GenericSchema<TFlags>) =>
    v.strictObject({
      flags: flagsSchema,
      explicitFlags: v.custom<Set<Str>>((val: unknown): boolean => val instanceof Set),
    }),
);

/** Result of parsing flags. Compile-time type alias; runtime schema: {@link CoreParseFlagsResultSchema}. */
export type CoreParseFlagsResult<TFlags = ExtendedFlags> = {
  flags: TFlags;
  explicitFlags: Set<Str>;
};

/**
 * Generic schema for command locale strings container.
 */
export const CommandLocaleSchema = generic(
  <TStrings>(stringsSchema: v.GenericSchema<TStrings> = v.unknown() as v.GenericSchema<TStrings>) =>
    v.strictObject({
      /** Framework strings for CLI. */
      cli: v.custom<BuiltCliStrings>(
        (val: unknown): boolean => typeof val === 'object' && val !== null,
      ),
      /** Command-specific strings for current locale. */
      command: stringsSchema,
    }),
);

/** Locale strings container for command context. Compile-time type alias; runtime schema: {@link CommandLocaleSchema}. */
export type CommandLocale<TStrings> = {
  cli: BuiltCliStrings;
  command: TStrings;
};

/**
 * Generic schema for command handler context.
 */
export const CommandContextSchema = generic(
  <TStrings, TToolFlags extends Record<string, unknown>>(
    stringsSchema: v.GenericSchema<TStrings> = v.unknown() as v.GenericSchema<TStrings>,
    _flagsSchema: v.GenericSchema<TToolFlags> = DynamicToolFlagsSchema as v.GenericSchema<TToolFlags>,
  ) =>
    v.strictObject({
      /** Parsed options (standard subset + tool flags). */
      options: v.custom<DeepReadonly<CommandFlags & TToolFlags>>(
        (val: unknown): boolean => typeof val === 'object' && val !== null,
      ),
      /** Locale strings (cli + command-specific). */
      locale: CommandLocaleSchema(stringsSchema),
      /** Raw CLI args (positional, after flags). */
      args: v.array(StrSchema),
      /** Current working directory. */
      cwd: StrSchema,
    }),
);

/**
 * Context passed to command handler.
 * Compile-time type alias; runtime schema: {@link CommandContextSchema}.
 *
 * @template TStrings - Type for command-specific locale strings.
 * @template TToolFlags - Type for tool-specific flags.
 */
export type CommandContext<
  TStrings = DefaultLocaleStrings,
  TToolFlags extends DynamicToolFlags = DynamicToolFlags,
> = {
  options: DeepReadonly<CommandFlags & TToolFlags>;
  locale: CommandLocale<TStrings>;
  args: readonly Str[];
  cwd: Str;
};

/**
 * Generic schema for command runner instances.
 */
export const CommandRunnerSchema = generic(
  <TStrings, TToolFlags extends Record<string, unknown>>(
    _stringsSchema: v.GenericSchema<TStrings> = v.unknown() as v.GenericSchema<TStrings>,
    _flagsSchema: v.GenericSchema<TToolFlags> = DynamicToolFlagsSchema as v.GenericSchema<TToolFlags>,
  ) =>
    v.strictObject({
      /** Run the command. Reads args from process.argv. */
      run: functionSchema<[], Promise<Result<ExitCode>>>(),
      /** Programmatically invoke the command with typed flags. */
      invoke: functionSchema<[InvokeOptions<TToolFlags>?], Promise<Result<InvokeResult>>>(),
    }),
);

/**
 * Command runner instance returned by createCommand.
 * Compile-time type alias; runtime schema: {@link CommandRunnerSchema}.
 */
export type CommandRunner<
  TStrings = DefaultLocaleStrings,
  TToolFlags extends DynamicToolFlags = DynamicToolFlags,
> = {
  /** Run the command. Reads args from process.argv. */
  run: () => Promise<Result<ExitCode>>;
  /** Programmatically invoke the command with typed flags. */
  invoke: (options?: InvokeOptions<TToolFlags>) => Promise<Result<InvokeResult>>;
};

/**
 * Generic schema for base task runner definition (non-generic fields only).
 */
export const TaskRunnerDefinitionBaseSchema = generic(
  <TStrings>(
    _stringsSchema: v.GenericSchema<TStrings> = v.unknown() as v.GenericSchema<TStrings>,
  ) =>
    v.strictObject({
      /** Unique identifier for this runner (kebab-case). */
      id: KebabCaseIdSchema,
      /** Version string (semantic versioning). */
      version: SemverSchema,
      /** Runtimes this runner supports. */
      runtimes: v.optional(SupportedRuntimesSchema),
      /** Glob patterns to match files. */
      patterns: v.optional(StrArraySchema),
      /** File extensions to match. */
      extensions: v.optional(StrArraySchema),
      /** Patterns/files to ignore. */
      ignore: v.optional(StrArraySchema),
      /** Max parallel tasks. */
      concurrency: v.optional(PositiveIntegerSchema),
      /** Default task timeout in milliseconds. */
      timeout: v.optional(NonNegativeIntegerSchema),
      /** Tool-specific flag definitions. */
      flagDefs: v.optional(
        v.custom<readonly FlagDefinition[]>((val: unknown): boolean => Array.isArray(val)),
      ),
    }),
);

/**
 * Base task runner definition type (non-generic fields only).
 * Compile-time type alias; runtime schema: {@link TaskRunnerDefinitionBaseSchema}.
 *
 * @template TStrings - Type for runner-specific built locale strings.
 */
export type TaskRunnerDefinitionBase<TStrings = unknown> = {
  id: KebabCaseId;
  version: Semver;
  runtimes?: SupportedRuntimes;
  patterns?: StrArray;
  extensions?: StrArray;
  ignore?: StrArray;
  concurrency?: PositiveInteger;
  timeout?: NonNegativeInteger;
  flagDefs?: readonly FlagDefinition[];
};

/**
 * Task runner definition type with generic support for tool flags and locale strings.
 *
 * Options passed to task and hooks are deeply readonly to prevent mutation.
 * The runner freezes options at runtime for additional safety.
 *
 * @template TToolFlags - Type for tool-specific flag values.
 * @template TStrings - Type for runner-specific built locale strings.
 *
 * @example
 * ```typescript
 * type MyFlags = { check: Bool; config: Str };
 *
 * type MyStrings = BuiltLocale<typeof MyStringsSchema>;
 *
 * const definition: TaskRunnerDefinition<MyFlags, MyStrings> = {
 *   id: 'my-tool',
 *   version: '1.0.0',
 *   // Locales auto-discovered from tools/my-tool/locales/locales/<code>.ts (name comes from locale)
 *   task: async (file, ctx) => {
 *     // ctx.options.check and ctx.options.config are typed and readonly!
 *     if (ctx.options.check) { ... }
 *     // Access locale strings: ctx.locale.runner.startMessage('check')
 *   },
 *   onStart: (ctx) => {
 *     // ctx.options.check is typed and readonly
 *     // ctx.locale.runner has your custom strings
 *   },
 * };
 * ```
 */
export type TaskRunnerDefinition<
  TToolFlags extends DynamicToolFlags = DynamicToolFlags,
  TStrings = unknown,
> = TaskRunnerDefinitionBase<TStrings> & {
  /** Task function to run on each file. Receives file path and context. */
  task: (file: Str, ctx: TaskContext<TToolFlags, TStrings>) => Promise<TaskResult> | TaskResult;
  /** Called before processing starts. Receives context. */
  onStart?: OnStartHook<TToolFlags, TStrings>;
  /** Called after file discovery but before pool execution. Receives files array and context. */
  onFilesDiscovered?: OnFilesDiscoveredHook<TToolFlags, TStrings>;
  /** Called after all tasks complete. Receives context and results. */
  onComplete?: OnCompleteHook<TToolFlags, TStrings>;
  /** Called when a task fails. Receives context, error, and file path. */
  onError?: OnErrorHook<TToolFlags, TStrings>;
};

/** Runner instance returned by {@link createRunner}. Provides `run()`, `invoke()`, and `getDefinition()`. */
export type TaskRunner<
  TToolFlags extends DynamicToolFlags = DynamicToolFlags,
  TStrings = unknown,
> = {
  /** Run the task runner. Reads args from process.argv. */
  run: () => Promise<Result<ExitCode>>;
  /** Programmatically invoke the runner with typed flags. Returns structured results. */
  invoke: (options?: InvokeOptions<TToolFlags>) => Promise<Result<InvokeResult>>;
  /** Get the runner definition. */
  getDefinition: () => TaskRunnerDefinition<TToolFlags, TStrings>;
};

/** Typed input for createRunner (generic for type inference). */
export type CreateRunnerInputTyped<
  TToolFlags extends DynamicToolFlags = DynamicToolFlags,
  TStrings = unknown,
> = {
  definition: TaskRunnerDefinition<TToolFlags, TStrings>;
};

// =============================================================================
// Nullable / Optional CLI Type Aliases
// =============================================================================
//
// Defined here (not in `schemas/common`) to avoid a circular dependency.
// `schemas/common` cannot import from `@/cli/schemas`.

/** Schema for `StandardFlagsResult | null` — handler returns `null` to continue to next handler. */
export const NullableStandardFlagsResultSchema = v.nullable(StandardFlagsResultSchema);

/** `StandardFlagsResult` or `null`. @see {@link NullableStandardFlagsResultSchema} */
export type NullableStandardFlagsResult = v.InferOutput<typeof NullableStandardFlagsResultSchema>;

/** Schema for `FlagName | undefined` — result of `Map.get()` lookups on flag maps. */
export const OptionalFlagNameSchema = v.optional(FlagNameSchema);

/** `FlagName` or `undefined`. @see {@link OptionalFlagNameSchema} */
export type OptionalFlagName = v.InferOutput<typeof OptionalFlagNameSchema>;

/** Schema for `FlagDefinition | undefined` — result of `Map.get()` lookups on flag maps. */
export const OptionalFlagDefinitionSchema = v.optional(FlagDefinitionSchema);

/** `FlagDefinition` or `undefined`. @see {@link OptionalFlagDefinitionSchema} */
export type OptionalFlagDefinition = v.InferOutput<typeof OptionalFlagDefinitionSchema>;

/** Schema for `ShortFlag | null` — short flags are optional on flag definitions. */
export const NullableShortFlagSchema = v.nullable(ShortFlagSchema);

/** `ShortFlag` or `null`. @see {@link NullableShortFlagSchema} */
export type NullableShortFlag = v.InferOutput<typeof NullableShortFlagSchema>;

/**
 * Schema for `ToolName | null` — nullable tool name.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(NullableToolNameSchema, 'biome');
 * if (result.ok) result.data; // 'biome'
 * ```
 */
export const NullableToolNameSchema = v.nullable(ToolNameSchema);

/** `ToolName` or `null` — nullable tool prerequisite name. */
export type NullableToolName = v.InferOutput<typeof NullableToolNameSchema>;

/** Schema for optional flag description getter function — zero-arg returning `Result<Str>`. */
export const OptionalFlagDescriptionFnSchema = v.optional(functionSchema<[], Result<Str>>());

/** Optional flag description getter — from Record access on `cliStrings.flags`. @see {@link OptionalFlagDescriptionFnSchema} */
export type OptionalFlagDescriptionFn = v.InferOutput<typeof OptionalFlagDescriptionFnSchema>;

/** Schema for optional tool flag descriptions record — maps descriptionKey to display string. */
export const OptionalToolFlagDescriptionsSchema = v.optional(v.record(v.string(), StrSchema));

/** Optional tool flag descriptions record — from Record access on `config.toolStrings`. @see {@link OptionalToolFlagDescriptionsSchema} */
export type OptionalToolFlagDescriptions = v.InferOutput<typeof OptionalToolFlagDescriptionsSchema>;

// =============================================================================
// Array & Utility Schemas
// =============================================================================

/** Schema for arrays of `FlagDefinition`. */
export const FlagDefinitionArraySchema = v.array(FlagDefinitionSchema);

/** Schema for arrays of `FlagValidationError`. */
export const FlagValidationErrorArraySchema = v.array(FlagValidationErrorSchema);

/** Schema for arrays of `ExampleDefinition`. */
export const ExampleDefinitionArraySchema = v.array(ExampleDefinitionSchema);

/** Schema for arrays of `ExitCodeDefinition`. */
export const ExitCodeDefinitionArraySchema = v.array(ExitCodeDefinitionSchema);

/** Schema for `BuiltCliStrings` — post-build conditional type with callable functions. Opaque: checks only that the value is a non-null object. */
export const BuiltCliStringsSchema = v.custom<BuiltCliStrings>(
  (val: unknown): boolean => typeof val === 'object' && val !== null,
);

/** Schema for `Set<FlagName>` — validates the value is a `Set` instance. */
export const FlagNameSetSchema = v.custom<Set<FlagName>>(
  (val: unknown): boolean => val instanceof Set,
);

/** Schema for mutable flags record — `Record<CamelCaseString, unknown>`. */
export const FlagsRecordSchema = v.record(CamelCaseStringSchema, v.unknown());

// =============================================================================
// TODO: Unconvertible Type Aliases — TypeScript-Only (Future Work)
// =============================================================================
//
// The following types across the CLI package have NO companion Valibot schema.
// Each is documented with the reason it cannot be expressed as a Valibot schema.
//
// ─── Recursive/Conditional Generic Types ───
// • DeepReadonly<T>           (result/result.ts, core/object.ts)
//     Recursive conditional mapped type with branches for Set/Map/Array/object.
// • ReadonlyTaskOptions<T>   (schemas/index.ts)
//     Generic DeepReadonly<StandardFlags & TToolFlags> — conditional + generic.
// • FlattenErrors<T>         (result/result.ts)
//     Private recursive conditional type utility.
// • KnownErrorCode           (result/result.ts)
//     Derived from ERRORS constant via FlattenErrors<T>.
// • Result<T>                (result/result.ts)
//     Generic discriminated union. Has OkSchema()/ErrSchema for deserialization.
// • AppError                 (result/result.ts)
//     Self-referential. Has AppErrorSchema but type uses KnownErrorCode (stricter).
//
// ─── Generic Compile-Time Aliases (companion generic schema factories exist) ───
// • GenericSchemaFactory<T>  (generic/types.ts) — runtime via generic()
// • GenericSchema<T>         (generic/types.ts) — function + metadata intersection
// • FnType<T>                (function/types.ts) — runtime via FnTypeSchema
// • PoolTask<T>              (core/pool.ts) — runtime via PoolTaskSchema
// • PoolOptions<T>           (core/pool.ts) — runtime via PoolOptionsSchema
// • PoolResult<T>            (core/pool.ts) — runtime via PoolResultSchema
// • TaskLocale<T>            (schemas/index.ts) — runtime via TaskLocaleSchema
// • TaskContext<T,S>         (schemas/index.ts) — runtime via TaskContextSchema
// • OnStartHook<T,S>        (schemas/index.ts) — runtime via OnStartHookSchema
// • OnCompleteHook<T,S>     (schemas/index.ts) — runtime via OnCompleteHookSchema
// • OnErrorHook<T,S>        (schemas/index.ts) — runtime via OnErrorHookSchema
// • OnFilesDiscoveredHook    (schemas/index.ts) — runtime via OnFilesDiscoveredHookSchema
// • CommandDefinition<T,F>  (schemas/index.ts) — runtime via CommandDefinitionSchema
// • StandardFlagsConfig<T>  (schemas/index.ts) — runtime via StandardFlagsConfigSchema
// • CoreParseFlagsResult<T> (schemas/index.ts) — runtime via CoreParseFlagsResultSchema
// • CommandLocale<T>        (schemas/index.ts) — runtime via CommandLocaleSchema
// • CommandContext<T,F>     (schemas/index.ts) — runtime via CommandContextSchema
// • CommandRunner<T,F>      (schemas/index.ts) — runtime via CommandRunnerSchema
// • TaskRunnerDefinitionBase<T> (schemas/index.ts) — runtime via TaskRunnerDefinitionBaseSchema
// • TaskRunnerDefinition<T,F>   (schemas/index.ts) — runtime via TaskRunnerDefinitionSchema
// • TaskRunner<T,F>         (schemas/index.ts) — runtime via TaskRunnerSchema
// • CreateRunnerInputTyped  (schemas/index.ts) — runtime via CreateRunnerInputTypedSchema
// • ResolvedLocale<T>       (utils/locales.ts) — runtime via ResolvedLocaleSchema
//
// ─── Node.js / JS Runtime Platform Types ───
// • OptionalNodeProcess     (schemas/common) — NodeJS.Process
// • NullableAbortController (schemas/common) — AbortController
// • OptionalAbortSignal     (schemas/common) — AbortSignal
// • NullableAbortSignal     (schemas/common) — AbortSignal
// • NullableRegExpMatchArray (schemas/common) — RegExpMatchArray
// • NullableRegExpExecArray (schemas/common) — RegExpExecArray
// • NullableIntervalId      (schemas/common) — ReturnType<typeof setInterval>
// • NullableChildProcess    (tools/dev-proxy) — ChildProcess
// • NullableFSWatcher       (tools/dev-proxy) — FSWatcher
// • NodeOs, NodeFs, NodePath, NodeUrl, NodeNet, NodeChildProcess (core/node-imports.ts)
// • Optional variants of all the above (core/node-imports.ts)
//
// ─── Intentional unknown/opaque Aliases ───
// • SideEffectValue         (schemas/index.ts) — unknown catch-all
// • DefaultLocaleStrings    (schemas/index.ts) — unknown placeholder
// • JsonData                (schemas/common) — any serializable data
// • HandlebarsValue         (schemas/common) — template engine value
// • UntypedJson             (schemas/common) — raw JSON parse result
// • UntypedParseResult      (schemas/common) — parse output before validation
// • PoolTaskResult          (core/pool.ts) — unknown generic default
//
// ─── Promise/Async Types ───
// • OptionalPendingInstall  (utils/installer.ts) — Promise<Result<Void>> | undefined
//
// ─── Locale Template Internals ───
// • ParamSchemas            (locale/template.ts) — Record of Valibot schema objects (opaque)
// • NullableSchemaEntries   (locale/template.ts) — derived from ParamSchemas
// • TemplateSchema<T>       (locale/template.ts) — generic conditional type
// • BuiltLocale<T>          (locale/template.ts) — generic conditional type
// • BuiltLocaleEntry<T>     (locale/template.ts) — generic conditional type
// • IntersectBuiltLocale<T> (locale/template.ts) — generic conditional type
//
// ─── Valibot Internal Types ───
// • ValidationDetail        (result/result.ts) — uses BaseIssue/FlatErrors
//
// ─── Complex Structural Types ───
// • Batch                   (format/utils/batch.ts) — Omit<> + intersection
// • CreateBatchesResult     (format/utils/batch.ts) — intentional divergence from schema
// • CliDefinition           (utils/core.ts) — private union, low value
// • ToolExportResult        (utils/core.ts) — inline, Result<> wrapping function
// • OptionalToolExport      (utils/core.ts) — wraps ToolExportResult
// • InitializeCliResult<T>  (utils/core.ts) — generic discriminated union
// =============================================================================
