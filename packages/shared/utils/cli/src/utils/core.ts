/**
 * CLI Core Infrastructure
 *
 * Shared utilities for command and runner modules.
 * Extracts common functionality to eliminate duplication.
 *
 * All functions return `Result<T>`.
 * All callers check `.ok` before using `.data`.
 *
 * @module
 */

import type { BuiltCliStrings } from '@/cli/locale/schema';
import {
  ExitCodeValue,
  type BaseLocaleStrings,
  type CommandDefinition,
  type CoreParseFlagsResult,
  type ExtendedFlags,
  type FlagDefinition,
  type FlagName,
  type HelpFlagEntry,
  type StandardFlagsConfig,
  type NullableStandardFlagsResult,
  type StandardFlagsResult,
  type TaskRunnerDefinitionBase,
} from '@/cli/schemas';
import { isOnboarded, isOnboardingInProgress } from '@/cli/tools/onboard/utils';
import {
  COMMAND_FLAG_DEFS,
  RUNNER_FLAG_DEFS,
  extractPositionalArgs,
  parseFlags,
} from '@/cli/utils/flags';
import { buildCommandHelpFlags, buildStandardHelpFlags } from '@/cli/utils/flags/help';
import { type ResolvedLocale, resolveLocale } from '@/cli/utils/locales';
import { loadConfig } from '@/config/loader';
import {
  BoolSchema,
  ExitCodeSchema,
  NonNegativeIntegerSchema,
  PathSchema,
  StrArraySchema,
  VoidSchema,
  type Bool,
  type DynamicModule,
  type EnvironmentConfig,
  type ExitCode,
  type KebabCaseId,
  type Message,
  type Never,
  type NonNegativeInteger,
  type OutputFormat,
  type Path,
  type RuntimeKind,
  type Semver,
  type OptionalStr,
  type Str,
  type StrArray,
  type TeardownFn,
  type Void,
} from '@/schemas/common';
import { type CapturedError } from '@/schemas/result/captured-error';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { detectEnvironment, detectRuntime } from '@/utils/core/environment';
import type { DeepReadonly } from '@/utils/core/object';
import { setOutputFormat } from '@/utils/core/output-context';
import { cwd as getCwd } from '@/utils/core/path';
import {
  clearLine,
  cursorTo,
  exit,
  getArgv,
  isTTY,
  setExitCode,
  writeStderr,
} from '@/utils/core/process';
import { getPmTool } from '@/utils/core/shell';
import { flushBuffer, mergeContext, setupLogging } from '@/utils/core/logger';
import { log as baseLog } from '@/utils/core/logger';
import { setupGlobalErrorHandling } from '@/utils/core/signal';
import { log, stopSpinner, style, symbols } from '@/utils/core/terminal';
import { formatErrorDebug } from '@/utils/result/format';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Signal Handling
// =============================================================================

/**
 * Sets up CLI-specific global error handlers for graceful shutdown.
 *
 * Delegates to {@link setupGlobalErrorHandling} with a CLI-specific
 * `onError` callback that handles TTY clearing, localized interrupt
 * messages, colored output, and process exit.
 *
 * Covers all environments detected by `setupGlobalErrorHandling`:
 * Node.js signals, uncaughtException, unhandledRejection, browser errors,
 * worker errors, Deno signals, Bun process events.
 *
 * @param strings - CLI framework locale strings for interrupt messages.
 * @returns `Result<Void>` — success, or a validation error if strings are invalid.
 */
export function setupCliSignalHandlers(strings: BuiltCliStrings): Result<Void> {
  if (!strings.runner.interrupted) {
    // Framework invariant
    return err(ERRORS.INTERNAL.INVARIANT_VIOLATED, {
      meta: {
        reason: 'missing runner.interrupted in BuiltCliStrings',
        function: 'setupCliSignalHandlers',
      },
    });
  }

  const setupResult: Result<TeardownFn> = setupGlobalErrorHandling({
    onError: (captured: CapturedError): Void => {
      // Clear TTY progress output
      // Fire-and-forget callback — can't return Result
      const ttyResult: Result<Bool> = isTTY();
      if (ttyResult.ok && ttyResult.data) {
        clearLine();
        const cursorPosResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
        if (cursorPosResult.ok) cursorTo(cursorPosResult.data);
      }

      if (captured.type === 'resultError') {
        // Route through logging pipeline — gets transports, redaction,
        // buffering, structured output, GitHub Actions annotations
        baseLog.errorObject(captured.error);
        flushBuffer();
        stopSpinner();
        return;
      }

      // Signal/exception handling
      const signalLabel: Str =
        captured.type === 'signal'
          ? ((captured.meta?.signal as Str) ?? 'UNKNOWN')
          : captured.type === 'uncaughtException'
            ? `uncaughtException: ${captured.error.message}`
            : `unhandledRejection: ${captured.error.message}`;

      // Print interrupt message to stderr (bypasses stdout buffering)
      writeStderr('\n');
      const msgResult: Result<Str> = strings.runner.interrupted({ signal: signalLabel });
      // Fire-and-forget: process signal handler cannot return Result — fallback is intentional
      const msgText: Str = msgResult.ok
        ? msgResult.data
        : `Received ${signalLabel}, shutting down...`;
      const colorResult: Result<Str> = style.red(msgText);
      // Fire-and-forget: same context — use unstyled text if styling fails
      writeStderr((colorResult.ok ? colorResult.data : msgText) + '\n');

      stopSpinner();

      // exit() is correct here — signal handler is fire-and-forget (can't return Result)
      const interruptedCodeResult: Result<ExitCode> = safeParse(
        ExitCodeSchema,
        ExitCodeValue.INTERRUPTED,
      );
      if (interruptedCodeResult.ok) {
        setExitCode(interruptedCodeResult.data);
        exit(interruptedCodeResult.data);
      }
    },
    exitTimeoutMs: 0, // CLI handles exit itself
  });

  if (!setupResult.ok) return setupResult;
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Standard Flag Handling
// =============================================================================

/**
 * Handles all standard flags shared by both command and runner.
 *
 * Resolves name/description from locale strings, prints the tool header
 * (unless suppressed by flag definitions), then iterates over flag
 * definitions sorted by `order` and calls each handler. Handlers
 * returning `{ kind: 'exit' }` abort the loop. After all handlers,
 * extracts positional args and resolves the cwd.
 *
 * @template TStrings - Tool/runner locale string type.
 * @param config - Standard flags configuration.
 * @returns `Result<StandardFlagsResult>` — discriminated result, or an error.
 */
export function handleStandardFlags<TStrings extends BaseLocaleStrings>(
  config: StandardFlagsConfig<TStrings>,
): Result<StandardFlagsResult> {
  // StandardFlagsConfig is a complex generic interface with callbacks — TS types are sufficient
  // (no Valibot schema exists; all callers are internal framework code)

  const { args, flags, toolStrings, definitionVersion, flagDefs } = config;

  // Resolve name/description from locale strings
  const nameResult: Result<Str> = toolStrings.name();
  if (!nameResult.ok) return nameResult;
  const name: Str = nameResult.data;
  const descResult: Result<Str> = toolStrings.description();
  if (!descResult.ok) return descResult;
  const description: Str = descResult.data;

  // Print header (before handlers — colors default to TTY detection)
  // suppressHeader is driven by flag definitions (--no-header, --quiet, --format, --stdin)
  const headerSuppressed: Bool = flagDefs.some(
    (def: FlagDefinition): Bool => def.suppressHeader?.(flags),
  );
  if (!headerSuppressed) {
    const h1: Result<Void> = log.print('');
    if (!h1.ok) return h1;
    const h2: Result<Void> = log.raw(`{bold}${name}{/}{dim}v${definitionVersion}{/}`);
    if (!h2.ok) return h2;
    const h3: Result<Void> = log.raw(`{dim}${description}{/}`);
    if (!h3.ok) return h3;
    const h4: Result<Void> = log.print('');
    if (!h4.ok) return h4;
  }

  // Run all flag handlers in order (sorted by `order` field)
  for (const def of flagDefs) {
    const handleResult: Result<NullableStandardFlagsResult> = def.handle(config);
    if (!handleResult.ok) return handleResult;
    if (handleResult.data !== null) {
      // Early exit — handler returned exit result (help, version, cwd failure)
      return okUnchecked<StandardFlagsResult>(handleResult.data);
    }
  }

  // Extract positional args
  const positionalArgsResult: Result<StrArray> = extractPositionalArgs(args, flagDefs);
  if (!positionalArgsResult.ok) return positionalArgsResult;

  // Resolve cwd (--cwd handler already validated it if provided; fall back to process cwd)
  let resolvedCwd: Path;
  if (flags.cwd) {
    const cwdParseResult: Result<Path> = safeParse(PathSchema, flags.cwd);
    if (!cwdParseResult.ok) return cwdParseResult;
    resolvedCwd = cwdParseResult.data;
  } else {
    const cwdResult: Result<Path> = getCwd();
    if (!cwdResult.ok) return cwdResult;
    resolvedCwd = cwdResult.data;
  }

  return okUnchecked<StandardFlagsResult>({
    kind: 'continue',
    name,
    description,
    positionalArgs: positionalArgsResult.data,
    cwd: resolvedCwd,
  });
}

// =============================================================================
// Shared CLI Initialization
// =============================================================================

/**
 * Result of {@link initializeCli}.
 *
 * Either an early exit (for --help/--version/--cwd errors) or all resolved
 * context needed by the caller to proceed with tool-specific logic.
 */
export type InitializeCliResult<TStrings extends BaseLocaleStrings> =
  | { kind: 'exit'; code: ExitCode }
  | {
      kind: 'continue';
      /** Parsed options (standard + custom flag values). */
      options: ExtendedFlags;
      /** CLI framework built locale strings. */
      cliStrings: BuiltCliStrings;
      /** Tool-specific built locale strings. */
      toolStrings: TStrings;
      /** Extracted args (positional, non-flag arguments). */
      args: StrArray;
      /** Resolved current working directory (--cwd or process.cwd()). */
      cwd: Path;
      /** Resolved display name from locale strings. */
      name: Str;
      /** Resolved description from locale strings. */
      description: Str;
    };

/** A command or runner definition. Commands have `handler`, runners have `task`. */
export type CliDefinition = CommandDefinition | TaskRunnerDefinitionBase;

/**
 * Checks whether the current runtime is supported by the definition.
 *
 * If `definition.runtimes` is undefined, all runtimes are allowed (returns success).
 * Otherwise, detects the current runtime via {@link detectRuntime} and checks
 * if it appears in the allowed list.
 *
 * @param definition - Command or runner definition with optional `runtimes` field.
 * @returns `Result<Void>` — success if runtime is supported, or
 *          `RUNTIME.UNSUPPORTED` if the current runtime is not in the allowed list.
 *
 * @example
 * ```typescript
 * const check = checkRuntimeSupport(definition);
 * if (!check.ok) return check; // exits with RUNTIME.UNSUPPORTED
 * ```
 */
function checkRuntimeSupport(definition: CliDefinition): Result<Void> {
  if (!definition.runtimes) {
    return ok(VoidSchema, undefined);
  }

  const runtimeResult: Result<RuntimeKind> = detectRuntime();
  if (!runtimeResult.ok) return runtimeResult;

  const currentRuntime: RuntimeKind = runtimeResult.data;
  const isSupported: Bool = definition.runtimes.includes(currentRuntime);

  if (!isSupported) {
    return err(ERRORS.RUNTIME.UNSUPPORTED, {
      meta: {
        function: definition.id,
        requires: definition.runtimes.join(', '),
      },
    });
  }

  return ok(VoidSchema, undefined);
}

/**
 * Shared CLI initialization sequence for both commands and runners.
 *
 * Accepts a {@link CommandDefinition} or {@link TaskRunnerDefinitionBase} directly.
 * Detects command vs runner via `'handler' in definition`, and derives config:
 * - **Command** → `COMMAND_FLAG_DEFS`, `buildCommandHelpFlags`, `'[options]'`
 * - **Runner** → `RUNNER_FLAG_DEFS`, `buildStandardHelpFlags`, `'[options] [files...]'`
 *
 * Performs the canonical initialization order:
 * 0. Check runtime support
 * 1. Merge framework + tool flag definitions into a single sorted array
 * 2. Set global log context (runtime, CI, correlationId, operation)
 * 3. Setup signal handlers
 * 4. Parse flags
 * 5. Detect environment + apply environment defaults
 * 6. Handle standard flags (colors, logLevel, help, version, header, cwd)
 *
 * @template TStrings - Tool/runner locale string type (extends BaseLocaleStrings).
 * @param definition - Command or runner definition.
 * @param overrideArgs - Optional argv override for programmatic invocation.
 *   When provided, bypasses `getArgv()` and uses these args for flag parsing
 *   and locale resolution. Used by `invoke()` on CommandRunner and TaskRunner.
 * @returns `Promise<Result<InitializeCliResult<TStrings>>>` — exit or resolved context, or an error.
 */
export async function initializeCli<TStrings extends BaseLocaleStrings>(
  definition: CliDefinition,
  overrideArgs?: StrArray,
): Promise<Result<InitializeCliResult<TStrings>>> {
  // 0. Check runtime support
  const runtimeCheck: Result<Void> = checkRuntimeSupport(definition);
  if (!runtimeCheck.ok) return runtimeCheck;

  // Detect command vs runner and derive framework config
  const isCommand: Bool = 'handler' in definition;
  const frameworkFlagDefs: readonly FlagDefinition[] = isCommand
    ? COMMAND_FLAG_DEFS
    : RUNNER_FLAG_DEFS;
  const allFlagDefs: readonly FlagDefinition[] = definition.flagDefs
    ? [...frameworkFlagDefs, ...definition.flagDefs]
    : frameworkFlagDefs;

  const help: StandardFlagsConfig<TStrings>['help'] = {
    standardFlagsBuilder: (
      cliStrings: BuiltCliStrings,
      toolFlagDescriptions?: Record<string, Str>,
    ): Result<HelpFlagEntry[]> =>
      isCommand
        ? buildCommandHelpFlags(allFlagDefs, cliStrings, toolFlagDescriptions)
        : buildStandardHelpFlags(allFlagDefs, cliStrings, toolFlagDescriptions),
    usageSuffix: isCommand ? '[options]' : '[options] [files...]',
  };

  // 1. Resolve locale (before context so definition.id is available)
  const localeResult: Result<ResolvedLocale<TStrings>> = await resolveLocale<TStrings>(
    definition.id,
    definition.flagDefs,
    overrideArgs,
  );
  if (!localeResult.ok) return localeResult;
  const { cliStrings, toolStrings } = localeResult.data;

  // 2. Set global log context with auto-detected runtime info
  const runtimeResult: Result<RuntimeKind> = detectRuntime();
  if (runtimeResult.ok) {
    const envDetectResult: Result<EnvironmentConfig> = detectEnvironment();
    const contextResult: Result<Void> = mergeContext({
      runtime: runtimeResult.data,
      ci: envDetectResult.ok ? envDetectResult.data.isCI : undefined,
      correlationId: crypto.randomUUID(),
      operation: definition.id,
    });
    // Non-fatal — context is a nice-to-have
    if (!contextResult.ok) {
      log.debug(`Failed to set log context: ${contextResult.error.message}`);
    }
  }

  // 2.5 Setup logging system (level from env, default redaction, async context)
  //     Must happen BEFORE signal handlers so transports are available for error routing.
  //     Level and format may be overridden by flag handlers in step 6.
  const loggingSetup: Result<TeardownFn> = setupLogging({
    initFromEnv: true,
    asyncContext: true,
  });
  if (!loggingSetup.ok) {
    // Non-fatal — logging works without explicit setup (just uses defaults)
    log.debug(`Logging setup failed: ${loggingSetup.error.message}`);
  }

  // 3. Setup signal handlers (AFTER logging — onError routes through log.errorObject)
  const signalSetupResult: Result<Void> = setupCliSignalHandlers(cliStrings);
  if (!signalSetupResult.ok) return signalSetupResult;

  // 4. Parse flags
  let args: StrArray;
  if (overrideArgs !== undefined) {
    const overrideResult: Result<StrArray> = safeParse(StrArraySchema, overrideArgs);
    if (!overrideResult.ok) return overrideResult;
    args = overrideResult.data;
  } else {
    const argsResult: Result<StrArray> = getArgv();
    if (!argsResult.ok) return argsResult;
    args = argsResult.data;
  }
  const parseFlagsResult: Result<CoreParseFlagsResult> = parseFlags(args, allFlagDefs, cliStrings);
  if (!parseFlagsResult.ok) return parseFlagsResult;
  const { explicitFlags } = parseFlagsResult.data;

  // 5. Detect environment + apply defaults
  const envResult: Result<EnvironmentConfig> = detectEnvironment();
  if (!envResult.ok) return envResult;
  const flags: ExtendedFlags = { ...parseFlagsResult.data.flags };
  for (const def of allFlagDefs) {
    if (def.applyEnvDefault) {
      const envDefaultResult: Result<Void> = def.applyEnvDefault(
        flags,
        envResult.data,
        explicitFlags,
      );
      if (!envDefaultResult.ok) return envDefaultResult;
    }
  }

  // 5b. Set output format context
  if (flags.format) {
    const formatResult: Result<Void> = setOutputFormat(flags.format);
    if (!formatResult.ok) return formatResult;
  }

  // 6. Handle standard flags
  const result: Result<StandardFlagsResult> = handleStandardFlags({
    args,
    flags,
    explicitFlags,
    env: envResult.data,
    cliStrings,
    toolStrings,
    definitionId: definition.id,
    definitionVersion: definition.version,
    flagDefs: allFlagDefs,
    toolFlagDefs: definition.flagDefs,
    help,
  });
  if (!result.ok) return result;

  if (result.data.kind === 'exit') {
    return okUnchecked<InitializeCliResult<TStrings>>(result.data);
  }

  return okUnchecked<InitializeCliResult<TStrings>>({
    kind: 'continue',
    options: flags,
    cliStrings,
    toolStrings,
    args: result.data.positionalArgs,
    cwd: result.data.cwd,
    name: result.data.name,
    description: result.data.description,
  });
}

// =============================================================================
// Fatal Error Output
// =============================================================================

/**
 * Logs a fatal error and terminates. Fire-and-forget — cannot return Result.
 *
 * Used exclusively by {@link dispatchTool} as the centralized error output point.
 *
 * @param message - Error message.
 * @param code - Exit code.
 * @returns Never — process exits.
 */
function fatalError(message: Message, code: ExitCode): Never {
  log.rawError(`\n  {red}{symbol:error}{/} {bold}${message}{/}\n`);
  exit(code);
}

// =============================================================================
// Tool Dispatch
// =============================================================================

/**
 * Dispatches a CLI tool by name.
 *
 * Reads the tool name from `process.argv[2]`, splices it out,
 * dynamically imports `../tools/${name}/index.ts`, resolves
 * the executable (command ?? runner ?? default), runs it,
 * and exits with the returned code.
 *
 * This is the process entry point — calls `process.exit()` on success
 * (via direct call) or failure (via {@link fatalError}).
 * Signal/crash exits are handled by {@link setupCliSignalHandlers}.
 *
 * @returns Never — always exits the process.
 */
export async function dispatchTool(): Promise<Never> {
  try {
    await loadConfig();

    const dispatchArgv: Result<StrArray> = getArgv();
    if (!dispatchArgv.ok) fatalError(dispatchArgv.error.message, ExitCodeValue.INVALID_USAGE);
    const tool: OptionalStr = dispatchArgv.data[0];
    if (!tool) {
      const pmToolResult: Result<Str> = getPmTool();
      if (!pmToolResult.ok) fatalError(pmToolResult.error.message, ExitCodeValue.INTERNAL_ERROR);
      const pmTool: Str = pmToolResult.data;
      fatalError(`Usage: ${pmTool} <name> [options]`, ExitCodeValue.INVALID_USAGE);
    }

    let mod: DynamicModule;
    try {
      mod = await import(`../tools/${tool}/index.ts`);
    } catch {
      fatalError(`Tool "${tool}" not found`, ExitCodeValue.INVALID_USAGE);
    }

    type ToolExportResult = Result<{ run: () => Promise<Result<ExitCode>> }>;
    type OptionalToolExport = ToolExportResult | undefined;

    /**
     * Runtime guard for tool exports — checks that the value is a Result-shaped object.
     *
     * @param value - Unknown value from dynamic import.
     * @returns `true` if value has Result shape (`{ ok }` property).
     */
    function isToolExport(value: unknown): value is ToolExportResult {
      return typeof value === 'object' && value !== null && 'ok' in value;
    }

    const raw: unknown = mod.command ?? mod.runner ?? mod.default;
    const exported: OptionalToolExport = isToolExport(raw) ? raw : undefined;

    if (!exported) {
      fatalError(
        `Tool "${tool}" does not export a valid command or runner`,
        ExitCodeValue.INVALID_USAGE,
      );
    }

    if (!exported.ok) {
      // Route through logging pipeline (transports, redaction, structured output)
      baseLog.errorObject(exported.error);
      flushBuffer();
      fatalError(`[${exported.error.code}] ${exported.error.message}`, ExitCodeValue.INVALID_USAGE);
    }

    const executable = exported.data;
    if (!executable || typeof executable.run !== 'function') {
      fatalError(
        `Tool "${tool}" does not export a valid command or runner`,
        ExitCodeValue.INVALID_USAGE,
      );
    }

    const runResult: Result<ExitCode> = await executable.run();
    if (!runResult.ok) {
      // Route through logging pipeline (transports, redaction, structured output)
      baseLog.errorObject(runResult.error);
      flushBuffer();

      const exitCodeRaw: number =
        typeof runResult.error.meta?.exitCode === 'number'
          ? runResult.error.meta.exitCode
          : ExitCodeValue.TASK_FAILURE;
      const exitCodeParseResult: Result<ExitCode> = safeParse(ExitCodeSchema, exitCodeRaw);
      if (!exitCodeParseResult.ok) {
        // Fallback to known-good value if meta exitCode is invalid
        const fallbackCodeResult: Result<ExitCode> = safeParse(
          ExitCodeSchema,
          ExitCodeValue.TASK_FAILURE,
        );
        if (!fallbackCodeResult.ok) throw new Error('Failed to parse fallback exit code');
        fatalError(`[${runResult.error.code}] ${runResult.error.message}`, fallbackCodeResult.data);
      }
      fatalError(`[${runResult.error.code}] ${runResult.error.message}`, exitCodeParseResult.data);
    }
    exit(runResult.data);
  } catch (thrown: unknown) {
    // Truly unexpected exception — route through logging pipeline
    const error = fromUnknownError(thrown);
    baseLog.errorObject(error);
    flushBuffer();
    fatalError(`[${error.code}] ${error.message}`, ExitCodeValue.TASK_FAILURE);
  }
}

// =============================================================================
// Onboarding Check
// =============================================================================

/**
 * Check whether onboarding has been completed or is bypassed.
 *
 * Call at the start of tools that should only run after onboarding.
 * Returns `true` if onboarding is complete or bypassed, `false` if not.
 * Callers decide how to handle `false` (error message, early exit, etc.).
 *
 * Bypass conditions:
 * - Currently running as part of onboarding (RESIST_ONBOARDING=1)
 * - Running in CI environment (CI=true)
 *
 * @returns `Result<Bool>` — `true` if onboarding complete or bypassed, `false` if not.
 *
 * @example
 * ```typescript
 * const onboardResult = requireOnboarding();
 * if (!onboardResult.ok) return onboardResult;
 * if (!onboardResult.data) {
 *   return err(ERRORS.CONFIG.ONBOARDING_REQUIRED);
 * }
 * ```
 */
export function requireOnboarding(): Result<Bool> {
  // Allow if currently running as part of onboard
  const inProgressResult: Result<Bool> = isOnboardingInProgress();
  if (!inProgressResult.ok) return inProgressResult;
  if (inProgressResult.data) return ok(BoolSchema, true);

  // Allow in CI environments
  const envResult: Result<EnvironmentConfig> = detectEnvironment();
  if (!envResult.ok) return envResult;
  if (envResult.data.isCI) return ok(BoolSchema, true);

  // Allow if onboarding marker exists
  const onboardedResult: Result<Bool> = isOnboarded();
  if (!onboardedResult.ok) return onboardedResult;
  if (onboardedResult.data) return ok(BoolSchema, true);

  return ok(BoolSchema, false);
}
