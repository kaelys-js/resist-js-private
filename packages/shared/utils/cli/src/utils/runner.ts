/**
 * Task Runner Engine
 *
 * Core engine for running tasks in parallel with progress tracking,
 * output formatting, and comprehensive statistics.
 *
 * @module
 */

import { glob } from 'glob';
import * as v from 'valibot';

import type { BuiltCliStrings } from '@/cli/locale/schema';
import {
  CreateRunnerInputSchema,
  DiscoverFilesInputSchema,
  ExitCodeValue,
  RunSummarySchema,
  TaskResultSchema,
  type CreateRunnerInputTyped,
  type DiscoverFilesInput,
  type FlagDefinition,
  type InvokeOptions,
  type InvokeResult,
  type ReadonlyTaskOptions,
  type RunCoreResult,
  type RunOutput,
  type RunSummary,
  type TaskContext,
  type TaskOptions,
  type TaskResult,
  type TaskRunner,
  type TaskRunnerDefinition,
} from '@/cli/schemas';
import { type InitializeCliResult, initializeCli } from '@/cli/utils/core';
import { RUNNER_FLAG_DEFS, buildArgvFromFlags } from '@/cli/utils/flags';
import {
  buildRunOutput,
  formatCounter,
  printCompactResults,
  printDetailedStats,
  printGroupedResults,
  printJunitOutput,
  printSummary,
  printTaskResult,
} from '@/cli/utils/views';
import {
  ExitCodeSchema,
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  OutputFormatSchema,
  PathSchema,
  PositiveIntegerSchema,
  StrArraySchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type ExitCode,
  type NonNegativeInteger,
  type NonNegativeNumber,
  type OutputFormat,
  type Path,
  type PositiveInteger,
  type OptionalStr,
  type Str,
  type StrArray,
  type NullableAbortSignal,
  type NullablePath,
  type OptionalAbortSignal,
  type Void,
} from '@/schemas/common';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { withTimeout } from '@/utils/core/async';
import { formatDuration } from '@/utils/core/format';
import { deleteFile, readFile, writeFile } from '@/utils/core/fs';
import { deepFreeze, safeStringify } from '@/utils/core/object';
import { getFileExtension, getTempDir, joinPath, toRelativePath } from '@/utils/core/path';
import { type PoolResult, type PoolTask, runPool } from '@/utils/core/pool';
import {
  clearLine,
  cursorTo,
  isTTY,
  readStdin as readStdinShared,
  writeStdout,
} from '@/utils/core/process';
import { getAbortSignal } from '@/utils/core/signal';
import {
  log,
  progressBar,
  startSpinner,
  stopSpinner,
  style,
  symbols,
  truncateLine,
} from '@/utils/core/terminal';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Local Type Aliases
// =============================================================================

/** Schema for nullable file duration entry. */
const NullableFileDurationSchema = v.nullable(
  v.strictObject({
    /** File path. */
    file: PathSchema,
    /** Duration in milliseconds. */
    duration: NonNegativeIntegerSchema,
  }),
);

/** File path with associated duration — for slowest/fastest tracking in summaries. @see {@link NullableFileDurationSchema} */
type NullableFileDuration = v.InferOutput<typeof NullableFileDurationSchema>;

/** Schema for task options cast target — shape defined by tool FlagDefinition[] at runtime. */
const TaskOptionsRecordSchema = v.record(v.string(), v.unknown());

/** Task options cast target. @see {@link TaskOptionsRecordSchema} */
type TaskOptionsRecord = v.InferOutput<typeof TaskOptionsRecordSchema>;

// =============================================================================
// Styled String Helper
// =============================================================================

/**
 * Unwraps a style Result for use in template literals.
 * Fire-and-forget string unwrap for display-only pool callbacks.
 *
 * Pool task callbacks return `Promise<TaskResult>` (not `Result<T>`),
 * so style/format errors cannot be propagated. If a style call fails,
 * the unstyled fallback text is shown instead.
 *
 * @param result - Result from a style/format function.
 * @param fallback - Plain text to show if the Result is an error.
 * @returns The styled string on success, or the fallback on error.
 */
function s(result: Result<Str>, fallback: Str = ''): Str {
  // Fire-and-forget: pool callbacks cannot return Result
  return result.ok ? result.data : fallback;
}

// =============================================================================
// Stdin Reader
// =============================================================================

/**
 * Reads content from stdin with a timeout.
 * Returns empty string if stdin is a TTY or times out.
 *
 * @returns `Promise<Result<Str>>` — stdin content, or an error.
 */
async function readStdin(): Promise<Result<Str>> {
  const timeoutResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 100);
  if (!timeoutResult.ok) return timeoutResult;
  return readStdinShared(timeoutResult.data);
}

// =============================================================================
// File Discovery
// =============================================================================

/**
 * Discovers files matching patterns.
 *
 * @param input - Discovery options (patterns, extensions, ignore, filter, cwd).
 * @returns `Promise<Result<StrArray>>` — array of absolute file paths, or an error.
 */
async function discoverFiles(input: DiscoverFilesInput): Promise<Result<StrArray>> {
  const inputResult: Result<DiscoverFilesInput> = safeParse(DiscoverFilesInputSchema, input);
  if (!inputResult.ok) return inputResult;

  const patterns: StrArray = inputResult.data.patterns;
  const extensions: StrArray = inputResult.data.extensions;
  const ignore: StrArray = inputResult.data.ignore;
  const filter: Str = inputResult.data.filter;
  const cwd: Path = inputResult.data.cwd;

  // Build glob patterns
  let globPatterns: StrArray = [];

  if (patterns.length > 0) {
    globPatterns = patterns;
  } else if (extensions.length > 0) {
    // Convert extensions to glob patterns
    for (const ext of extensions) {
      const cleanExt: Str = ext.startsWith('.') ? ext : `.${ext}`;
      globPatterns.push(`**/*${cleanExt}`);
    }
  } else {
    // Default: all files
    globPatterns = ['**/*'];
  }

  // Default ignore patterns
  const defaultIgnore: StrArray = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/.svelte-kit/**',
    '**/coverage/**',
  ];

  const allIgnore: StrArray = [...defaultIgnore, ...ignore];

  // Run glob
  const files: Str[] = [];
  for (const pattern of globPatterns) {
    try {
      const matches: Str[] = await glob(pattern, {
        cwd,
        ignore: allIgnore,
        nodir: true,
        absolute: true,
      });
      files.push(...matches);
    } catch (e: unknown) {
      return err(ERRORS.IO.READDIR_FAILED, {
        cause: fromUnknownError(e),
        meta: { path: pattern },
      });
    }
  }

  // Dedupe
  const uniqueResult: Result<StrArray> = safeParse(StrArraySchema, [...new Set(files)]);
  if (!uniqueResult.ok) return uniqueResult;
  const uniqueFiles: StrArray = uniqueResult.data;

  // Apply filter
  if (filter.length > 0) {
    const filterLower: Str = filter.toLowerCase();
    const filtered: StrArray = uniqueFiles.filter(
      (file: Str): Bool => file.toLowerCase().includes(filterLower),
    );
    return ok(StrArraySchema, filtered);
  }

  return ok(StrArraySchema, uniqueFiles);
}

// =============================================================================
// Summary Calculation
// =============================================================================

/**
 * Calculates a run summary from task results and wall-clock duration.
 *
 * Counts files by status, computes average duration, and identifies
 * the slowest and fastest tasks (excluding skipped).
 *
 * @param results - Array of task results.
 * @param duration - Total wall-clock duration in milliseconds.
 * @returns `Result<RunSummary>` — computed summary, or a validation error.
 */
function calculateSummary(results: TaskResult[], duration: NonNegativeInteger): Result<RunSummary> {
  const durationResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, duration);
  if (!durationResult.ok) return durationResult;

  const totalResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    results.length,
  );
  if (!totalResult.ok) return totalResult;
  const total: NonNegativeInteger = totalResult.data;
  const processedResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    results.filter((r: TaskResult) => r.status !== 'skipped').length,
  );
  if (!processedResult.ok) return processedResult;
  const processed: NonNegativeInteger = processedResult.data;
  const successResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    results.filter((r: TaskResult) => r.status === 'success').length,
  );
  if (!successResult.ok) return successResult;
  const success: NonNegativeInteger = successResult.data;
  const unchangedResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    results.filter((r: TaskResult) => r.status === 'unchanged').length,
  );
  if (!unchangedResult.ok) return unchangedResult;
  const unchanged: NonNegativeInteger = unchangedResult.data;
  const failedResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    results.filter((r: TaskResult) => r.status === 'failed').length,
  );
  if (!failedResult.ok) return failedResult;
  const failed: NonNegativeInteger = failedResult.data;
  const skippedResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    results.filter((r: TaskResult) => r.status === 'skipped').length,
  );
  if (!skippedResult.ok) return skippedResult;
  const skipped: NonNegativeInteger = skippedResult.data;
  const avgDurationResult: Result<NonNegativeNumber> = safeParse(
    NonNegativeNumberSchema,
    processed > 0 ? durationResult.data / processed : 0,
  );
  if (!avgDurationResult.ok) return avgDurationResult;
  const avgDuration: NonNegativeNumber = avgDurationResult.data;

  // Find slowest and fastest
  let slowest: NullableFileDuration = null;
  let fastest: NullableFileDuration = null;

  for (const result of results) {
    if (result.status === 'skipped') continue;

    if (!slowest || result.duration > slowest.duration) {
      slowest = { file: result.file, duration: result.duration };
    }
    if (!fastest || result.duration < fastest.duration) {
      fastest = { file: result.file, duration: result.duration };
    }
  }

  return safeParse(RunSummarySchema, {
    total,
    processed,
    success,
    unchanged,
    failed,
    skipped,
    duration: durationResult.data,
    avgDuration,
    slowest,
    fastest,
  });
}

// =============================================================================
// Core Execution (No Display)
// =============================================================================

/**
 * Core task execution logic — computation without display.
 *
 * Performs file discovery, pool execution, hook lifecycle,
 * and summary calculation. Returns structured results for
 * programmatic invocation ({@link invoke}). Does not handle
 * stdin mode or --list-files (CLI-specific concerns).
 *
 * @template TToolFlags - Tool-specific flag value types.
 * @template TStrings - Runner-specific locale string types.
 * @param init - Resolved initialization context from `initializeCli`.
 * @param definition - Task runner definition.
 * @returns `Promise<Result<RunCoreResult>>` — exit code, results, and summary.
 */
async function runCore<TToolFlags extends Record<string, unknown>, TStrings>(
  init: InitializeCliResult<TStrings> & { kind: 'continue' },
  definition: TaskRunnerDefinition<TToolFlags, TStrings>,
): Promise<Result<RunCoreResult>> {
  const flags: TaskOptions = init.options;
  const strings: BuiltCliStrings = init.cliStrings;
  const runnerStrings: TStrings = init.toolStrings;
  const effectiveCwd: Path = init.cwd;
  const positionalArgs: StrArray = init.args;

  // -- File discovery --
  let files: StrArray;
  const ignorePatterns: StrArray = [...definition.ignore, ...flags.ignore];

  if (positionalArgs.length > 0) {
    const allFiles: Str[] = [];
    for (const arg of positionalArgs) {
      if (arg.includes('*')) {
        try {
          const matches: Str[] = await glob(arg, {
            cwd: effectiveCwd,
            nodir: true,
            absolute: true,
            ignore: ignorePatterns,
          });
          allFiles.push(...matches);
        } catch (e: unknown) {
          return err(ERRORS.IO.READDIR_FAILED, {
            cause: fromUnknownError(e),
            meta: { path: arg },
          });
        }
      } else {
        allFiles.push(arg.startsWith('/') ? arg : `${effectiveCwd}/${arg}`);
      }
    }
    const uniqueFilesResult: Result<StrArray> = safeParse(StrArraySchema, [...new Set(allFiles)]);
    if (!uniqueFilesResult.ok) return uniqueFilesResult;
    files = uniqueFilesResult.data;
  } else {
    const discoverResult: Result<StrArray> = await discoverFiles({
      patterns: definition.patterns,
      extensions: definition.extensions,
      ignore: ignorePatterns,
      filter: flags.filter,
      cwd: effectiveCwd,
    });
    if (!discoverResult.ok) return discoverResult;
    files = discoverResult.data;
  }

  // -- No files → empty result --
  if (files.length === 0) {
    const zeroResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
    if (!zeroResult.ok) return zeroResult;
    const emptySummaryResult: Result<RunSummary> = calculateSummary([], zeroResult.data);
    if (!emptySummaryResult.ok) return emptySummaryResult;
    return okUnchecked<RunCoreResult>({
      exitCode: 0,
      results: [],
      summary: emptySummaryResult.data,
    });
  }

  // -- Build task options --
  const taskOptions: TaskOptions = { ...flags };
  const typedOptions: ReadonlyTaskOptions<TToolFlags> = deepFreeze(taskOptions);
  const taskContext: TaskContext<TToolFlags, TStrings> = {
    options: typedOptions,
    locale: {
      cli: strings,
      runner: runnerStrings,
    },
    cwd: effectiveCwd,
  };

  // -- Lifecycle hooks --
  if (definition.onStart) {
    const onStartResult: Result<Void> = await definition.onStart(taskContext);
    if (!onStartResult.ok) return onStartResult;
  }

  if (definition.onFilesDiscovered) {
    await definition.onFilesDiscovered(files, taskContext);
  }

  // -- Get timeout --
  const timeoutMsResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    typeof flags.timeout === 'number' && flags.timeout > 0 ? flags.timeout : definition.timeout,
  );
  if (!timeoutMsResult.ok) return timeoutMsResult;
  const timeoutMs: NonNegativeInteger = timeoutMsResult.data;

  // -- Create tasks (computation only, no display) --
  const tasks: PoolTask<TaskResult>[] = files.map((file: Str) => async (): Promise<TaskResult> => {
    const startTaskTime = Date.now();
    let result: TaskResult;

    if (timeoutMs > 0) {
      const taskPromise: Promise<TaskResult> = Promise.resolve(definition.task(file, taskContext));
      // Fire-and-forget: pool callback returns Promise<TaskResult>, not Result
      const relResultTimeout: Result<Str> = toRelativePath(file);
      const relPathTimeout: Str = relResultTimeout.ok ? relResultTimeout.data : file;
      const timedOutResult: Result<Str> = strings.errors.taskTimedOut({
        file: relPathTimeout,
        timeout: String(timeoutMs),
      });
      const timedOutMsg: Str = timedOutResult.ok
        ? timedOutResult.data
        : `Task timed out: ${relPathTimeout}`;
      const timedResult: Result<TaskResult> = await withTimeout(
        taskPromise,
        timeoutMs,
        timedOutMsg,
      );
      if (!timedResult.ok) {
        const relResultFailed: Result<Str> = toRelativePath(file);
        result = {
          file,
          relativePath: relResultFailed.ok ? relResultFailed.data : file,
          status: 'failed',
          category: null,
          error: timedResult.error.message,
          duration: Date.now() - startTaskTime,
          output: null,
        };
      } else {
        result = timedResult.data;
      }
    } else {
      result = await definition.task(file, taskContext);
    }

    // Ensure relativePath is set
    if (!result.relativePath) {
      const relResultEnsure: Result<Str> = toRelativePath(file);
      result.relativePath = relResultEnsure.ok ? relResultEnsure.data : file;
    }

    // Check abort signal
    const abortSignalResult: Result<AbortSignal> = getAbortSignal();
    const abortSignal: NullableAbortSignal = abortSignalResult.ok ? abortSignalResult.data : null;
    if (abortSignal?.aborted) {
      const validated: Result<TaskResult> = safeParse(TaskResultSchema, result);
      return validated.ok ? validated.data : result;
    }

    const validated: Result<TaskResult> = safeParse(TaskResultSchema, result);
    return validated.ok ? validated.data : result;
  });

  // -- Run pool --
  const startTimeResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    Date.now(),
  );
  if (!startTimeResult.ok) return startTimeResult;
  const startTime: NonNegativeInteger = startTimeResult.data;

  const poolSignalResult: Result<AbortSignal> = getAbortSignal();
  if (!poolSignalResult.ok) return poolSignalResult;
  const poolSignal: OptionalAbortSignal = poolSignalResult.data;

  const poolResult: PoolResult<TaskResult> = await runPool(tasks, {
    concurrency: flags.concurrency,
    failFast: flags.failFast,
    signal: poolSignal,
    onTaskError: definition.onError
      ? async (error: Error, index: NonNegativeInteger) => {
          const file: Path = files[index];
          if (definition.onError) {
            await definition.onError(taskContext, error, file);
          }
        }
      : undefined,
  });

  const endTimeResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, Date.now());
  if (!endTimeResult.ok) return endTimeResult;
  const durationCalcResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    endTimeResult.data - startTime,
  );
  if (!durationCalcResult.ok) return durationCalcResult;
  const duration: NonNegativeInteger = durationCalcResult.data;

  // -- Collect results --
  const results: TaskResult[] = [...poolResult.results];

  // -- onComplete hook --
  if (definition.onComplete) {
    await definition.onComplete(taskContext, results);
  }

  // -- Calculate summary --
  const summaryResult: Result<RunSummary> = calculateSummary(results, duration);
  if (!summaryResult.ok) return summaryResult;
  const summary: RunSummary = summaryResult.data;

  // -- Exit code --
  const exitCode: ExitCode =
    summary.failed > 0 ? ExitCodeValue.TASK_FAILURE : ExitCodeValue.SUCCESS;

  return okUnchecked<RunCoreResult>({
    exitCode,
    results,
    summary,
  });
}

// =============================================================================
// Task Runner Factory
// =============================================================================

/**
 * Creates a task runner from a definition.
 *
 * @param input - Runner definition.
 * @returns Task runner instance.
 */
export function createRunner<
  TToolFlags extends Record<string, unknown> = Record<string, unknown>,
  TStrings = unknown,
>(input: CreateRunnerInputTyped<TToolFlags, TStrings>): TaskRunner<TToolFlags, TStrings> {
  // Runtime validation (schema doesn't carry generic info)
  const inputResult: Result<v.InferOutput<typeof CreateRunnerInputSchema>> = safeParse(
    CreateRunnerInputSchema,
    input,
  );
  if (!inputResult.ok) {
    return {
      run: async (): Promise<Result<ExitCode>> => inputResult,
      invoke: async (): Promise<Result<InvokeResult>> => inputResult,
      getDefinition: (): TaskRunnerDefinition<TToolFlags, TStrings> => input.definition,
    };
  }
  const definition = input.definition;

  /**
   * Runs the task runner. Reads args from process.argv.
   *
   * @returns `Promise<Result<ExitCode>>` — exit code (0 = success, 1 = failures), or an error.
   */
  async function run(): Promise<Result<ExitCode>> {
    const initResult: Result<InitializeCliResult<TStrings>> =
      await initializeCli<TStrings>(definition);
    if (!initResult.ok) return initResult;
    const init = initResult.data;

    if (init.kind === 'exit') return ok(ExitCodeSchema, init.code);

    const flags: TaskOptions = init.options;
    const strings: BuiltCliStrings = init.cliStrings;
    const runnerStrings: TStrings = init.toolStrings;
    const name: Str = init.name;
    const description: Str = init.description;

    // Runner-specific: validate --stdin flags
    if (flags.stdin) {
      if (!flags.stdinFilepath || flags.stdinFilepath.length === 0) {
        return err(ERRORS.VALIDATION.STDIN_CONFLICT, { meta: { reason: 'requires_filepath' } });
      }
    }

    // Validate --stdin is mutually exclusive with file arguments
    if (flags.stdin && init.args.length > 0) {
      return err(ERRORS.VALIDATION.STDIN_CONFLICT, { meta: { reason: 'mutually_exclusive' } });
    }

    // Use effective cwd (--cwd overrides process.cwd())
    const effectiveCwd: Path = init.cwd;
    const positionalArgs: StrArray = init.args;

    let files: StrArray;
    let stdinTempFile: NullablePath = null;
    let stdinContent: OptionalStr;

    // Handle --stdin mode: read stdin and create a temp file
    if (flags.stdin && flags.stdinFilepath) {
      const stdinResult: Result<Str> = await readStdin();
      if (!stdinResult.ok) return stdinResult;
      stdinContent = stdinResult.data;

      // Create a temp file with the stdin content, preserving the extension
      const extResult: Result<Str> = getFileExtension(flags.stdinFilepath);
      if (!extResult.ok) return extResult;
      const tmpDirResult: Result<Path> = getTempDir();
      if (!tmpDirResult.ok) return tmpDirResult;
      const tempPathResult: Result<Path> = joinPath([
        tmpDirResult.data,
        `stdin-${Date.now()}${extResult.data}`,
      ]);
      if (!tempPathResult.ok) return tempPathResult;
      stdinTempFile = tempPathResult.data;
      const writeStdinResult: Result<Void> = writeFile(stdinTempFile, stdinContent);
      if (!writeStdinResult.ok) return writeStdinResult;

      const stdinFilesResult: Result<StrArray> = safeParse(StrArraySchema, [stdinTempFile]);
      if (!stdinFilesResult.ok) return stdinFilesResult;
      files = stdinFilesResult.data;
    } else {
      // Combine definition ignore patterns with --ignore flag patterns
      const ignorePatterns: StrArray = [...definition.ignore, ...flags.ignore];

      if (positionalArgs.length > 0) {
        // Use provided files/patterns
        const allFiles: Str[] = [];
        for (const arg of positionalArgs) {
          if (arg.includes('*')) {
            // Glob pattern
            try {
              const matches: Str[] = await glob(arg, {
                cwd: effectiveCwd,
                nodir: true,
                absolute: true,
                ignore: ignorePatterns,
              });
              allFiles.push(...matches);
            } catch (e: unknown) {
              return err(ERRORS.IO.READDIR_FAILED, {
                cause: fromUnknownError(e),
                meta: { path: arg },
              });
            }
          } else {
            // Single file
            allFiles.push(arg.startsWith('/') ? arg : `${effectiveCwd}/${arg}`);
          }
        }
        const uniqueFilesResult: Result<StrArray> = safeParse(StrArraySchema, [
          ...new Set(allFiles),
        ]);
        if (!uniqueFilesResult.ok) return uniqueFilesResult;
        files = uniqueFilesResult.data;
      } else {
        // Use definition patterns
        const discoverResult: Result<StrArray> = await discoverFiles({
          patterns: definition.patterns,
          extensions: definition.extensions,
          ignore: ignorePatterns,
          filter: flags.filter,
          cwd: effectiveCwd,
        });
        if (!discoverResult.ok) return discoverResult;
        files = discoverResult.data;
      }
    }

    // Handle --list-files (early exit)
    if (flags.listFiles) {
      if (flags.json) {
        const relativePaths: Str[] = [];
        for (const f of files) {
          const r: Result<Str> = toRelativePath(f);
          if (!r.ok) return r;
          relativePaths.push(r.data);
        }
        const listJsonData = { files: relativePaths };
        const listJsonIndentResult: Result<NonNegativeInteger> = safeParse(
          NonNegativeIntegerSchema,
          2,
        );
        if (!listJsonIndentResult.ok) return listJsonIndentResult;
        const listJsonStr: Result<Str> = safeStringify(listJsonData, listJsonIndentResult.data);
        if (!listJsonStr.ok) return listJsonStr;
        const listJsonResult: Result<Void> = log.raw(listJsonStr.data);
        if (!listJsonResult.ok) return listJsonResult;
      } else {
        for (const file of files) {
          const relResult: Result<Str> = toRelativePath(file);
          if (!relResult.ok) return relResult;
          const listFileResult: Result<Void> = log.raw(relResult.data);
          if (!listFileResult.ok) return listFileResult;
        }
        if (!flags.quiet) {
          const filesFoundResult: Result<Str> = strings.output.filesFound({ count: files.length });
          if (!filesFoundResult.ok) return filesFoundResult;
          const filesFoundText: Str = filesFoundResult.data;
          const filesFoundLogResult: Result<Void> = log.print(`{dim}\n${filesFoundText}{/}`);
          if (!filesFoundLogResult.ok) return filesFoundLogResult;
        }
      }
      return ok(ExitCodeSchema, 0);
    }

    // Handle no files
    if (files.length === 0) {
      if (!flags.quiet && !flags.json) {
        const noFilesResult: Result<Str> = strings.summary.noFiles();
        if (!noFilesResult.ok) return noFilesResult;
        const noFilesText: Str = noFilesResult.data;
        const noFilesLogResult: Result<Void> = log.info(noFilesText);
        if (!noFilesLogResult.ok) return noFilesLogResult;
      }
      if (flags.json) {
        const emptySummaryResult: Result<RunSummary> = safeParse(RunSummarySchema, {
          total: 0,
          processed: 0,
          success: 0,
          unchanged: 0,
          failed: 0,
          skipped: 0,
          duration: 0,
          avgDuration: 0,
          slowest: null,
          fastest: null,
        });
        if (!emptySummaryResult.ok) return emptySummaryResult;
        const emptyOutputResult: Result<RunOutput> = buildRunOutput(
          emptySummaryResult.data,
          [],
          strings,
        );
        if (!emptyOutputResult.ok) return emptyOutputResult;
        const emptyJsonLogResult: Result<Void> = log.json(emptyOutputResult.data);
        if (!emptyJsonLogResult.ok) return emptyJsonLogResult;
      }
      return ok(ExitCodeSchema, 0);
    }

    // Build task options from flags (flags already conforms to StandardFlags + tool flags)
    const taskOptions: TaskOptions = { ...flags };

    // Add stdinContent to options if in stdin mode
    if (stdinContent !== undefined) {
      const mutableOptions: TaskOptionsRecord = taskOptions;
      mutableOptions.stdinContent = stdinContent;
    }

    // Deep freeze options to prevent mutation in tasks and hooks.
    // taskOptions contains tool flags from parsing — deepFreeze returns DeepReadonly.
    const typedOptions: ReadonlyTaskOptions<TToolFlags> = deepFreeze(taskOptions);

    // Build task context for hooks and tasks
    const taskContext: TaskContext<TToolFlags, TStrings> = {
      options: typedOptions,
      locale: {
        cli: strings,
        runner: runnerStrings,
      },
      cwd: effectiveCwd,
    };

    // Call onStart hook with context (before spinner, so info modes can exit cleanly)
    if (definition.onStart) {
      const onStartResult: Result<Void> = await definition.onStart(taskContext);
      if (!onStartResult.ok) return onStartResult;
    }

    // Call onFilesDiscovered hook (after discovery + onStart, before pool execution).
    // Allows tools to pre-process files (e.g., batch by formatter for efficient execution).
    if (definition.onFilesDiscovered) {
      // Return value intentionally discarded — lifecycle hook, not a gate
      await definition.onFilesDiscovered(files, taskContext);
    }

    // Show scanning message (after onStart, so info modes don't show this)
    // Also skip in stdin mode since we only want to output the formatted content
    if (!flags.quiet && !flags.json && !stdinTempFile) {
      const scanningResult: Result<Str> = strings.progress.scanning({ count: files.length });
      if (!scanningResult.ok) return scanningResult;
      startSpinner(scanningResult.data);
    }

    // Get timeout value (flag overrides definition default)
    const timeoutMsResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      typeof flags.timeout === 'number' && flags.timeout > 0 ? flags.timeout : definition.timeout,
    );
    if (!timeoutMsResult.ok) return timeoutMsResult;
    const timeoutMs: NonNegativeInteger = timeoutMsResult.data;

    // Create tasks
    const totalCountResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      files.length,
    );
    if (!totalCountResult.ok) return totalCountResult;
    const total: NonNegativeInteger = totalCountResult.data;
    const zeroCountResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
    if (!zeroCountResult.ok) return zeroCountResult;
    let completedCount: NonNegativeInteger = zeroCountResult.data;
    const results: TaskResult[] = [];

    const tasks: PoolTask<TaskResult>[] = files.map(
      (file: Str, _index: NonNegativeInteger) => async (): Promise<TaskResult> => {
        const startTaskTime = Date.now();

        let result: TaskResult;

        // Execute task with optional timeout
        if (timeoutMs > 0) {
          // Ensure task result is always a promise
          const taskPromise: Promise<TaskResult> = Promise.resolve(
            definition.task(file, taskContext),
          );
          // Fire-and-forget: pool callback returns Promise<TaskResult>, not Result
          const relResultTimeout: Result<Str> = toRelativePath(file);
          const relPathTimeout: Str = relResultTimeout.ok ? relResultTimeout.data : file;
          const timedOutResult: Result<Str> = strings.errors.taskTimedOut({
            file: relPathTimeout,
            timeout: Str(timeoutMs),
          });
          const timedOutMsg: Str = timedOutResult.ok
            ? timedOutResult.data
            : `Task timed out: ${relPathTimeout}`;
          const timedResult: Result<TaskResult> = await withTimeout(
            taskPromise,
            timeoutMs,
            timedOutMsg,
          );
          if (!timedResult.ok) {
            // Fire-and-forget: pool callback, cannot propagate Result
            const relResultFailed: Result<Str> = toRelativePath(file);
            result = {
              file,
              relativePath: relResultFailed.ok ? relResultFailed.data : file,
              status: 'failed',
              category: null,
              error: timedResult.error.message,
              duration: Date.now() - startTaskTime,
              output: null,
            };
          } else {
            result = timedResult.data;
          }
        } else {
          result = await definition.task(file, taskContext);
        }

        // Ensure relativePath is set
        // Fire-and-forget: pool callback, cannot propagate Result
        if (!result.relativePath) {
          const relResultEnsure = toRelativePath(file);
          result.relativePath = relResultEnsure.ok ? relResultEnsure.data : file;
        }

        completedCount++;

        // Check if abort signal was triggered (Ctrl+C)
        // If aborted, skip printing and return early to stop output spam
        // Fire-and-forget: pool callback, cannot propagate Result
        const abortSignalResult: Result<AbortSignal> = getAbortSignal();
        const abortSignal: NullableAbortSignal = abortSignalResult.ok
          ? abortSignalResult.data
          : null;
        if (abortSignal?.aborted) {
          // Fire-and-forget: pool callback, cannot propagate Result
          const validated: Result<TaskResult> = safeParse(TaskResultSchema, result);
          return validated.ok ? validated.data : result;
        }

        // Check for --summary-only flag
        const summaryOnly: Bool = flags.summaryOnly === true;

        // Check for --timing flag
        const showTiming: Bool = flags.timing === true;

        // Get current format
        const currentFormat: OutputFormat = flags.format;
        const isGithubFormat: Bool = currentFormat === 'github';
        const isMachineFormat: Bool = ['json', 'junit'].includes(currentFormat);

        // Fire-and-forget display — pool task callback returns TaskResult (not Result<T>),
        // so log Results cannot be propagated. Display failures degrade gracefully.

        // Print progress (unless quiet/machine format/grouped/summaryOnly/stdin)
        if (!flags.quiet && !isMachineFormat && !flags.group && !summaryOnly && !flags.stdin) {
          stopSpinner();

          // Check if task output should be shown (via result.output field)
          const showOutput: Bool = result.output !== null;

          // Progress bar disabled when showing output (they conflict visually)
          const showProgressBar: Bool = flags.progress === true && !showOutput;

          const ttyResult: Result<Bool> = isTTY();
          const isTerminal: Bool = ttyResult.ok ? ttyResult.data : false;

          if (showProgressBar && isTerminal) {
            const bar: Str = s(progressBar(completedCount, total, 30));
            const statusIcon: Str =
              result.status === 'success'
                ? s(style.green(symbols.success), symbols.success)
                : result.status === 'failed'
                  ? s(style.red(symbols.error), symbols.error)
                  : s(style.dim(symbols.dash), symbols.dash);
            // Truncate to terminal width to prevent line wrapping artifacts
            const progressLineInput: Str = `${bar} ${s(formatCounter(completedCount, total))} ${statusIcon} ${s(style.dim(result.relativePath), result.relativePath)}`;
            const progressLineResult: Result<Str> = truncateLine(progressLineInput);
            const progressLine: Str = progressLineResult.ok
              ? progressLineResult.data
              : progressLineInput;

            // Always clear current line and move to start
            clearLine();
            cursorTo(zeroCountResult.data);

            // For failed tasks, print error ABOVE the progress bar
            // by printing error, then re-printing progress bar below it
            if (result.status === 'failed' && result.error) {
              // Print error line (stays visible)
              const errorLineInput: Str = s(style.red(result.error), result.error);
              const errorLineResult: Result<Str> = truncateLine(errorLineInput);
              const errorLineTruncated: Str = errorLineResult.ok
                ? errorLineResult.data
                : errorLineInput;
              log.raw(
                `${s(style.red(symbols.error), symbols.error)} ${s(style.dim(result.relativePath), result.relativePath)} ${s(style.dim(symbols.arrow), symbols.arrow)} ${errorLineTruncated}`,
              );
              // Re-print progress bar (will be updated in-place by next task)
              writeStdout(progressLine);
            } else {
              // Update progress bar in place
              writeStdout(progressLine);
            }
          } else if (isGithubFormat) {
            // GitHub Actions annotation format
            if (result.status === 'failed') {
              const needsFmtResult: Result<Str> = strings.runner.needsFormatting();
              const needsFmtText: Str = needsFmtResult.ok
                ? needsFmtResult.data
                : 'Needs formatting';
              const errorMsg: Str = result.error || needsFmtText;
              log.raw(`::error file=${result.relativePath}::${errorMsg}`);
            } else if (result.status === 'success' && showTiming) {
              const durationFmtResult: Result<Str> = formatDuration(result.duration);
              const durationStr: Str = durationFmtResult.ok ? durationFmtResult.data : '';
              const fmtInResult: Result<Str> = strings.runner.formattedIn({
                duration: durationStr,
              });
              const fmtInText: Str = fmtInResult.ok
                ? fmtInResult.data
                : `Formatted in ${durationStr}`;
              log.raw(`::notice file=${result.relativePath}::${fmtInText}`);
            }
          } else if (showTiming) {
            // Show timing for each file
            const statusIcon: Str =
              result.status === 'success'
                ? s(style.green(symbols.success), symbols.success)
                : result.status === 'failed'
                  ? s(style.red(symbols.error), symbols.error)
                  : result.status === 'unchanged'
                    ? s(style.dim(symbols.dash), symbols.dash)
                    : s(style.dim(symbols.ellipsis), symbols.ellipsis);
            const timingDurationFmt: Result<Str> = formatDuration(result.duration);
            const timingDurationStr: Str = timingDurationFmt.ok ? timingDurationFmt.data : '';
            const timingStr: Str = s(style.dim(`(${timingDurationStr})`), `(${timingDurationStr})`);
            log.raw(
              `${s(formatCounter(completedCount, total))} ${statusIcon} ${s(style.cyan(result.relativePath), result.relativePath)} ${timingStr}`,
            );
            if (result.status === 'failed' && result.error) {
              log.raw(
                `     ${s(style.dim(symbols.arrow), symbols.arrow)} ${s(style.red(result.error), result.error)}`,
              );
            }
          } else {
            printTaskResult(result, completedCount, total, flags.verbose, showOutput, strings);
          }
        }

        // Fire-and-forget: pool callback, cannot propagate Result
        const validated: Result<TaskResult> = safeParse(TaskResultSchema, result);
        return validated.ok ? validated.data : result;
      },
    );

    // Run tasks
    const startTimeResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      Date.now(),
    );
    if (!startTimeResult.ok) return startTimeResult;
    const startTime: NonNegativeInteger = startTimeResult.data;

    // Show initial progress bar (0%) if --progress is set
    const initTtyResult: Result<Bool> = isTTY();
    if (!initTtyResult.ok) return initTtyResult;
    const initIsTerminal: Bool = initTtyResult.data;
    if (flags.progress && initIsTerminal && !flags.quiet && !flags.json && !flags.group) {
      stopSpinner();
      const bar: Str = s(progressBar(0, total, 30));
      const initialProgressInput: Str = `${bar} ${s(formatCounter(0, total))} ${s(style.dim('Starting...'), 'Starting...')}`;
      const initialProgressResult: Result<Str> = truncateLine(initialProgressInput);
      if (!initialProgressResult.ok) return initialProgressResult;
      const initialProgress: Str = initialProgressResult.data;
      writeStdout(initialProgress);
    }

    const poolSignalResult: Result<AbortSignal> = getAbortSignal();
    if (!poolSignalResult.ok) return poolSignalResult;
    const poolSignal: OptionalAbortSignal = poolSignalResult.data;

    const poolResult: PoolResult<TaskResult> = await runPool(tasks, {
      concurrency: flags.concurrency,
      failFast: flags.failFast,
      signal: poolSignal,
      onTaskError: definition.onError
        ? async (error: Error, index: NonNegativeInteger) => {
            const file: Path = files[index];
            if (definition.onError) {
              await definition.onError(taskContext, error, file);
            }
          }
        : undefined,
    });

    const endTimeResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      Date.now(),
    );
    if (!endTimeResult.ok) return endTimeResult;
    const endTime: NonNegativeInteger = endTimeResult.data;
    const durationCalcResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      endTime - startTime,
    );
    if (!durationCalcResult.ok) return durationCalcResult;
    const duration: NonNegativeInteger = durationCalcResult.data;

    // Stop spinner
    stopSpinner();

    // Clear progress bar line if it was used
    const showProgressBar: Bool = flags.progress === true;
    const clearTtyResult: Result<Bool> = isTTY();
    if (!clearTtyResult.ok) return clearTtyResult;
    const clearIsTerminal: Bool = clearTtyResult.data;
    if (showProgressBar && clearIsTerminal && !flags.quiet && !flags.json) {
      clearLine();
      cursorTo(zeroCountResult.data);
    }

    // Collect results
    results.push(...poolResult.results);

    // Call onComplete hook with context and results
    if (definition.onComplete) {
      // Return value intentionally discarded — lifecycle hook, not a gate
      await definition.onComplete(taskContext, results);
    }

    // Calculate summary
    const summaryResult: Result<RunSummary> = calculateSummary(results, duration);
    if (!summaryResult.ok) return summaryResult;
    const summary: RunSummary = summaryResult.data;

    // Check for slow files if --slow-threshold is set
    const slowThresholdResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      typeof flags.slowThreshold === 'number' ? flags.slowThreshold : 0,
    );
    if (!slowThresholdResult.ok) return slowThresholdResult;
    const slowThreshold: NonNegativeInteger = slowThresholdResult.data;
    const slowFiles: TaskResult[] = [];
    if (slowThreshold > 0) {
      for (const result of results) {
        if (result.status !== 'skipped' && result.duration > slowThreshold) {
          slowFiles.push(result);
        }
      }
    }

    // Check for --stats flag
    const showStats: Bool = flags.stats === true;

    // Build JSON output for --output or --json
    const jsonOutputResult: Result<RunOutput> = buildRunOutput(summary, results, strings);
    if (!jsonOutputResult.ok) return jsonOutputResult;
    const jsonOutput: RunOutput = jsonOutputResult.data;

    // Get the output format (default is 'pretty')
    const format: OutputFormat = flags.format;

    // Write to file if --output is specified
    if (flags.output && typeof flags.output === 'string' && flags.output.length > 0) {
      // Write in the specified format
      let outputContent: Str;
      switch (format) {
        case 'json': {
          const jsonIndentResult: Result<NonNegativeInteger> = safeParse(
            NonNegativeIntegerSchema,
            2,
          );
          if (!jsonIndentResult.ok) return jsonIndentResult;
          const jsonStr: Result<Str> = safeStringify(jsonOutput, jsonIndentResult.data);
          if (!jsonStr.ok) return jsonStr;
          outputContent = jsonStr.data;
          break;
        }
        case 'junit': {
          const junitOutputResult: Result<Str> = printJunitOutput(summary, results, name, true);
          if (!junitOutputResult.ok) return junitOutputResult;
          outputContent = junitOutputResult.data;
          break;
        }
        default: {
          // For pretty, compact, github - write JSON as default
          const defaultJsonIndentResult: Result<NonNegativeInteger> = safeParse(
            NonNegativeIntegerSchema,
            2,
          );
          if (!defaultJsonIndentResult.ok) return defaultJsonIndentResult;
          const defaultJsonStr: Result<Str> = safeStringify(
            jsonOutput,
            defaultJsonIndentResult.data,
          );
          if (!defaultJsonStr.ok) return defaultJsonStr;
          outputContent = defaultJsonStr.data;
          break;
        }
      }
      const writeOutputResult: Result<Void> = writeFile(flags.output, outputContent);
      if (!writeOutputResult.ok) return writeOutputResult;
      if (!flags.quiet && format !== 'json') {
        const outputWrittenResult: Result<Str> = strings.output.outputWritten({
          path: flags.output,
        });
        if (!outputWrittenResult.ok) return outputWrittenResult;
        const outputWrittenText: Str = outputWrittenResult.data;
        const outputWrittenLogResult: Result<Void> = log.print('{dim}' + outputWrittenText + '{/}');
        if (!outputWrittenLogResult.ok) return outputWrittenLogResult;
      }
    }

    // Skip normal output in stdin mode - only output the formatted content
    if (!stdinTempFile) {
      // Output based on format
      switch (format) {
        case 'json': {
          const jsonLogResult: Result<Void> = log.json(jsonOutput);
          if (!jsonLogResult.ok) return jsonLogResult;
          break;
        }

        case 'github': {
          // GitHub Actions summary
          if (summary.failed > 0) {
            const filesNeedFmtResult: Result<Str> = strings.runner.filesNeedFormatting({
              count: summary.failed,
            });
            if (!filesNeedFmtResult.ok) return filesNeedFmtResult;
            const filesNeedFmtText: Str = filesNeedFmtResult.data;
            const githubErrorLogResult: Result<Void> = log.raw(`::error::${filesNeedFmtText}`);
            if (!githubErrorLogResult.ok) return githubErrorLogResult;
          } else {
            const summaryDurationFmt: Result<Str> = formatDuration(summary.duration);
            if (!summaryDurationFmt.ok) return summaryDurationFmt;
            const summaryDurationStr: Str = summaryDurationFmt.data;
            const allFmtResult: Result<Str> = strings.runner.allFormatted({
              count: summary.total,
              duration: summaryDurationStr,
            });
            if (!allFmtResult.ok) return allFmtResult;
            const allFmtText: Str = allFmtResult.data;
            const githubNoticeLogResult: Result<Void> = log.raw(`::notice::${allFmtText}`);
            if (!githubNoticeLogResult.ok) return githubNoticeLogResult;
          }
          break;
        }

        case 'junit':
          printJunitOutput(summary, results, name);
          break;

        case 'compact':
          if (!flags.quiet) {
            printCompactResults(results);
            printSummary(summary, results, flags.verbose, strings);
          }
          break;

        case 'pretty':
        default:
          if (flags.group) {
            printGroupedResults(results, strings);
            printSummary(summary, results, flags.verbose, strings);
          } else if (!flags.quiet) {
            printSummary(summary, results, flags.verbose, strings);
          }
          break;
      }

      // Print detailed statistics if --stats is set (only for non-machine formats)
      const machineFormats = new Set(['json', 'junit', 'github']);
      if (showStats && !flags.quiet && !machineFormats.has(format)) {
        printDetailedStats(results, duration, strings);
      }

      // Print slow file warnings (only for non-machine formats)
      if (slowFiles.length > 0 && !flags.quiet && !machineFormats.has(format)) {
        const slowBlankResult: Result<Void> = log.print('');
        if (!slowBlankResult.ok) return slowBlankResult;
        const slowThresholdResult: Result<Str> = strings.warnings.slowThresholdExceeded({
          count: slowFiles.length,
          threshold: slowThreshold,
        });
        if (!slowThresholdResult.ok) return slowThresholdResult;
        const slowThresholdText: Str = slowThresholdResult.data;
        const slowWarnResult: Result<Void> = log.warn(slowThresholdText);
        if (!slowWarnResult.ok) return slowWarnResult;
        // Sort by duration descending and show top 10
        const sortedSlow: TaskResult[] = slowFiles
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 10);
        for (const result of sortedSlow) {
          const relResultSlow: Result<Str> = toRelativePath(result.file);
          if (!relResultSlow.ok) return relResultSlow;
          const relPathSlow: Str = relResultSlow.data;
          const slowDurationText: Str = `(${Math.round(result.duration)}ms)`;
          const slowInfoResult: Result<Void> = log.info(
            `${s(style.dim(symbols.arrow), symbols.arrow)} ${relPathSlow} ${s(style.yellow(slowDurationText), slowDurationText)}`,
          );
          if (!slowInfoResult.ok) return slowInfoResult;
        }
        if (slowFiles.length > 10) {
          const andMoreResult: Result<Str> = strings.warnings.andMore({
            count: slowFiles.length - 10,
          });
          if (!andMoreResult.ok) return andMoreResult;
          const andMoreText: Str = andMoreResult.data;
          const andMoreLogResult: Result<Void> = log.print(`{dim}  ${andMoreText}{/}`);
          if (!andMoreLogResult.ok) return andMoreLogResult;
        }
      }
    }

    // Handle stdin mode output: read formatted content and output to stdout
    if (stdinTempFile && results.length > 0) {
      const stdinResult: TaskResult = results[0];
      if (stdinResult.status === 'success' || stdinResult.status === 'unchanged') {
        // Read the formatted content and output to stdout
        const readStdinFileResult: Result<Str> = readFile(stdinTempFile);
        if (!readStdinFileResult.ok) return readStdinFileResult;
        writeStdout(readStdinFileResult.data);
      }
      // Clean up temp file (ignore errors)
      deleteFile(stdinTempFile);
    }

    // Exit code
    const exitCode: ExitCode =
      summary.failed > 0 ? ExitCodeValue.TASK_FAILURE : ExitCodeValue.SUCCESS;
    return ok(ExitCodeSchema, exitCode);
  }

  /**
   * Gets the runner definition.
   *
   * @returns TaskRunnerDefinition<TToolFlags, TStrings>
   */
  function getDefinition(): TaskRunnerDefinition<TToolFlags, TStrings> {
    return definition;
  }

  /**
   * Programmatically invoke this runner with typed flags.
   *
   * Converts flag values to an argv array, runs through the standard
   * initialization pipeline, then executes file discovery and task
   * processing via {@link runCore}. Returns structured results with
   * summary statistics.
   *
   * @param options - Invocation options (flags, args, cwd, locale, silent).
   * @returns `Promise<Result<InvokeResult>>` — exit code, results, and summary.
   *
   * @example
   * ```typescript
   * const result = await runner.invoke({
   *   flags: { check: true, filter: '*.ts' },
   *   cwd: '/my/project',
   * });
   * if (result.ok && result.data.summary) {
   *   const failed = result.data.summary.failed;
   * }
   * ```
   */
  async function invoke(options?: InvokeOptions<TToolFlags>): Promise<Result<InvokeResult>> {
    try {
      // Build flag definitions (framework + tool)
      const allFlagDefs: readonly FlagDefinition[] = definition.flagDefs
        ? [...RUNNER_FLAG_DEFS, ...definition.flagDefs]
        : RUNNER_FLAG_DEFS;

      // Build argv from provided flags
      const flagRecord: Record<Str, unknown> = {
        ...(options?.flags ?? {}),
      };

      // Inject silent mode flags
      const silent: Bool = options?.silent !== false;
      if (silent) {
        flagRecord.quiet = true;
        flagRecord.noHeader = true;
      }

      // Inject cwd if provided
      if (options?.cwd) {
        flagRecord.cwd = options.cwd;
      }

      // Inject locale if provided
      if (options?.locale) {
        flagRecord.locale = options.locale;
      }

      const argvResult: Result<StrArray> = buildArgvFromFlags(flagRecord, allFlagDefs);
      if (!argvResult.ok) return argvResult;

      // Append positional args
      const argv: StrArray = [...argvResult.data, ...(options?.args ?? [])];
      const validatedArgv: Result<StrArray> = safeParse(StrArraySchema, argv);
      if (!validatedArgv.ok) return validatedArgv;

      // Initialize with override args
      const initResult: Result<InitializeCliResult<TStrings>> = await initializeCli<TStrings>(
        definition,
        validatedArgv.data,
      );
      if (!initResult.ok) return initResult;

      if (initResult.data.kind === 'exit') {
        return okUnchecked<InvokeResult>({ exitCode: initResult.data.code });
      }

      // Run core computation (no display)
      const coreResult: Result<RunCoreResult> = await runCore(initResult.data, definition);
      if (!coreResult.ok) return coreResult;

      return okUnchecked<InvokeResult>({
        exitCode: coreResult.data.exitCode,
        results: coreResult.data.results,
        summary: coreResult.data.summary,
      });
    } catch (thrown: unknown) {
      return err(ERRORS.INTERNAL.UNEXPECTED, {
        cause: fromUnknownError(thrown),
        meta: { runnerId: definition.id },
      });
    }
  }

  return {
    run,
    invoke,
    getDefinition,
  };
}
