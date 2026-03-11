/**
 * Formatter Batching
 *
 * Groups files by formatter and executes them in batches for efficiency.
 * Instead of spawning one process per file, batches multiple files into
 * a single invocation for tools that support it.
 *
 * @module
 */

import * as v from 'valibot';

import { TaskResultSchema, type TaskResult } from '@/cli/schemas';
import type { ExternalCommand, FormatterDefinition } from '@/cli/tools/format/schemas';
import {
  format,
  getBundledConfig,
  runCli,
  type CliResult,
  type FormatResult,
} from '@/cli/tools/format/utils/runner';
import { isToolAvailable } from '@/cli/utils/installer';
import {
  BoolSchema,
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  PathSchema,
  StrArraySchema,
  StrSchema,
  type Bool,
  type NonNegativeInteger,
  type NonNegativeNumber,
  type NullablePath,
  type Path,
  type Str,
  type StrArray,
} from '@/schemas/common';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { getFileMtimeMs } from '@/utils/core/fs';
import { toRelativePath } from '@/utils/core/path';
import { isMacOS } from '@/utils/core/process';
import { safeParse } from '@/utils/result/safe';

// ============================================================================
// Local Type Aliases
// ============================================================================

/** Schema for nullable external command. Uses `v.custom()` because `ExternalCommandSchema` is module-private. */
const NullableExternalCommandSchema = v.nullable(
  v.custom<ExternalCommand>(
    (val: unknown): boolean =>
      typeof val === 'object' && val !== null && 'tool' in val && 'args' in val,
    'Expected an ExternalCommand object',
  ),
);

/** @see {@link NullableExternalCommandSchema} */
type NullableExternalCommand = v.InferOutput<typeof NullableExternalCommandSchema>;

// ============================================================================
// Schemas
// ============================================================================

/** Identifies a unique batch group. Files with the same key run in one process. */
const BatchKeySchema = v.pipe(v.string(), v.minLength(1));

/** Inferred output type of {@link BatchKeySchema}. A non-empty batch group identifier. */
type BatchKey = v.InferOutput<typeof BatchKeySchema>;

/** Schema for a batch of files to process together. */
const BatchSchema = v.strictObject({
  /** Batch group identifier. */
  key: BatchKeySchema,
  /** File paths to process (non-empty). */
  files: v.pipe(v.array(PathSchema), v.minLength(1)),
  /** Formatter definition for this batch. */
  formatter: v.custom<FormatterDefinition>((val) => val !== null && typeof val === 'object'),
  /** Resolved external command, or null for biome/prettier. */
  command: v.nullable(v.custom<ExternalCommand>((val) => val !== null && typeof val === 'object')),
  /** Whether to run in check-only mode. */
  checkOnly: BoolSchema,
});

/** Inferred output type of {@link BatchSchema}. A batch of files to process together. */
type Batch = Omit<v.InferOutput<typeof BatchSchema>, 'formatter' | 'command'> & {
  formatter: FormatterDefinition;
  command: NullableExternalCommand;
};

/** Schema for the result of creating batches from a file list. */
const CreateBatchesResultSchema = v.strictObject({
  /** Batches of files grouped by formatter. */
  batches: v.array(BatchSchema),
  /** Files that cannot be batched (processed individually). */
  unbatched: v.array(
    v.strictObject({
      file: PathSchema,
      formatter: v.custom<FormatterDefinition>((val) => val !== null && typeof val === 'object'),
    }),
  ),
});

/** Inferred output type of {@link CreateBatchesResultSchema}. */
type CreateBatchesResult = {
  batches: Batch[];
  unbatched: Array<{ file: Str; formatter: FormatterDefinition }>;
};

/** Outcome of a batch command execution. */
const BatchCommandOutcomeSchema = v.strictObject({
  /** Whether the command completed successfully. */
  success: BoolSchema,
  /** Error message on failure, null on success. */
  error: v.nullable(v.pipe(v.string(), v.minLength(1))),
});

/** Inferred output type of {@link BatchCommandOutcomeSchema}. */
type BatchCommandOutcome = v.InferOutput<typeof BatchCommandOutcomeSchema>;

// ============================================================================
// Constants
// ============================================================================

/** Safe command line length limit (75% of actual ARG_MAX for safety margin). */
const ARG_MAX_SAFE: NonNegativeInteger = isMacOS ? 200_000 : 1_800_000;

// ============================================================================
// Batch Eligibility
// ============================================================================

/**
 * Resolves which external command to use for a formatter (first available bin).
 *
 * Iterates through the formatter's command list in order and returns the
 * first one whose binary is available on the system. Returns `null` inside
 * the Result if the formatter is not external or no command is available.
 *
 * @param formatter - Formatter definition to resolve a command for.
 * @returns `Result<NullableExternalCommand>` — resolved command, or `null` if none available.
 */
export function resolveCommand(formatter: FormatterDefinition): Result<NullableExternalCommand> {
  if (formatter.tool !== 'external' || !formatter.commands) {
    return okUnchecked(null);
  }

  for (const cmd of formatter.commands) {
    const avail: Result<Bool> = isToolAvailable(cmd.bin);
    if (!avail.ok) return avail;
    if (avail.data) {
      return okUnchecked(cmd);
    }
  }

  return okUnchecked(null);
}

/**
 * Determines if a formatter + command combination can be batched.
 *
 * Biome and Prettier always support batching. External tools support
 * batching unless they write to stdout, explicitly opt out, or use
 * stdout-based check modes. Custom and noop tools never batch.
 *
 * @param formatter - Formatter definition.
 * @param command - Resolved external command (null for non-external).
 * @param checkOnly - Whether running in check-only mode.
 * @param diff - Whether running in diff mode.
 * @returns `Result<Bool>` — `true` if the combination can be batched.
 */
function canBatch(
  formatter: FormatterDefinition,
  command: NullableExternalCommand,
  checkOnly: Bool,
  diff: Bool,
): Result<Bool> {
  // Diff mode uses temp files — inherently per-file
  if (diff) return ok(BoolSchema, false);

  // Only biome, prettier, and external tools can batch
  if (formatter.tool === 'custom' || formatter.tool === 'noop') return ok(BoolSchema, false);

  // Biome and prettier always support batching
  if (formatter.tool === 'biome' || formatter.tool === 'prettier') return ok(BoolSchema, true);

  // External tool checks
  if (!command) return ok(BoolSchema, false);

  // Tools that write to stdout can't batch (output would be concatenated)
  if (command.writesStdout) return ok(BoolSchema, false);

  // Explicit opt-out
  if (command.supportsBatching === false) return ok(BoolSchema, false);

  // In check mode, tools that check via stdout comparison can't batch
  if (checkOnly && (command.checkByDiff || command.checkByEmptyStdout))
    return ok(BoolSchema, false);

  // In check mode, tools without checkArgs can't batch (they assume formatted)
  if (checkOnly && !command.checkArgs) return ok(BoolSchema, false);

  return ok(BoolSchema, true);
}

/**
 * Computes the batch key for a file's formatter + command combination.
 * Files with the same batch key are grouped into a single batch.
 *
 * @param formatter - Formatter definition.
 * @param command - Resolved external command (null for non-external).
 * @returns `Result<BatchKey>` — non-empty batch group identifier.
 */
function getBatchKey(
  formatter: FormatterDefinition,
  command: NullableExternalCommand,
): Result<BatchKey> {
  let key: Str;

  if (formatter.tool === 'biome') {
    key = 'biome';
  } else if (formatter.tool === 'prettier') {
    key = `prettier|${formatter.parser ?? 'auto'}`;
  } else if (formatter.tool === 'external' && command) {
    key = `external|${command.bin}|${command.configFile ?? 'none'}`;
  } else {
    // Should not reach here if canBatch was checked first
    key = `unknown|${formatter.id}`;
  }

  return safeParse(BatchKeySchema, key);
}

// ============================================================================
// Batch Creation
// ============================================================================

/**
 * Groups files into batches by formatter, chunking by ARG_MAX.
 * Files that cannot be batched are returned in the `unbatched` array.
 *
 * @param fileFormatterPairs - Array of file + formatter pairs to batch.
 * @param checkOnly - Whether running in check-only mode.
 * @param diff - Whether running in diff mode.
 * @returns `Result<CreateBatchesResult>` — batches and unbatched files.
 */
export function createBatches(
  fileFormatterPairs: Array<{ file: Str; formatter: FormatterDefinition }>,
  checkOnly: Bool,
  diff: Bool,
): Result<CreateBatchesResult> {
  const groups = new Map<
    BatchKey,
    { files: Str[]; formatter: FormatterDefinition; command: NullableExternalCommand }
  >();
  const unbatched: Array<{ file: Str; formatter: FormatterDefinition }> = [];

  for (const { file, formatter } of fileFormatterPairs) {
    const commandResult: Result<NullableExternalCommand> =
      formatter.tool === 'external' ? resolveCommand(formatter) : okUnchecked(null);
    if (!commandResult.ok) return commandResult;
    const command: NullableExternalCommand = commandResult.data;

    const batchableResult: Result<Bool> = canBatch(formatter, command, checkOnly, diff);
    if (!batchableResult.ok) return batchableResult;

    if (!batchableResult.data) {
      unbatched.push({ file, formatter });
      continue;
    }

    const keyResult: Result<BatchKey> = getBatchKey(formatter, command);
    if (!keyResult.ok) return keyResult;
    const key: BatchKey = keyResult.data;

    let group = groups.get(key);
    if (!group) {
      group = { files: [], formatter, command };
      groups.set(key, group);
    }
    group.files.push(file);
  }

  // Chunk each group by ARG_MAX
  const batches: Batch[] = [];

  for (const [key, group] of groups) {
    const baseLengthResult: Result<NonNegativeInteger> = estimateBaseCommandLength(
      group.formatter,
      group.command,
      checkOnly,
    );
    if (!baseLengthResult.ok) return baseLengthResult;

    const chunksResult: Result<StrArray[]> = chunkByArgLength(group.files, baseLengthResult.data);
    if (!chunksResult.ok) return chunksResult;
    const chunks: StrArray[] = chunksResult.data;

    for (const chunk of chunks) {
      batches.push({
        key,
        files: chunk,
        formatter: group.formatter,
        command: group.command,
        checkOnly,
      });
    }
  }

  return okUnchecked({ batches, unbatched });
}

/**
 * Estimates the base command length in characters (everything before the file list).
 *
 * @param formatter - Formatter definition.
 * @param command - Resolved external command (null for non-external).
 * @param checkOnly - Whether running in check-only mode.
 * @returns `Result<NonNegativeInteger>` — estimated base command length.
 */
function estimateBaseCommandLength(
  formatter: FormatterDefinition,
  command: NullableExternalCommand,
  checkOnly: Bool,
): Result<NonNegativeInteger> {
  if (formatter.tool === 'biome') {
    // biome format --write --config-path "/path/to/config"
    return ok(NonNegativeIntegerSchema, 100);
  }
  if (formatter.tool === 'prettier') {
    // prettier --write --config "/path/to/config" --ignore-path "/path" --parser xxx
    return ok(NonNegativeIntegerSchema, 200);
  }
  if (command) {
    const args: readonly Str[] =
      checkOnly && command.checkArgs ? command.checkArgs : command.formatArgs;
    const lengthResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      args.join(' ').length + 100,
    ); // 100 for config flag + padding
    if (!lengthResult.ok) return lengthResult;
    return ok(NonNegativeIntegerSchema, lengthResult.data);
  }
  return ok(NonNegativeIntegerSchema, 100);
}

/**
 * Chunks a file list so each chunk's total command line length stays under ARG_MAX.
 *
 * @param files - File paths to chunk.
 * @param baseCommandLength - Base command length before file arguments.
 * @returns `Result<string[][]>` — array of file path arrays, each within ARG_MAX limits.
 */
function chunkByArgLength(
  files: StrArray,
  baseCommandLength: NonNegativeInteger,
): Result<StrArray[]> {
  const chunks: StrArray[] = [];
  let current: StrArray = [];
  let currentLength: NonNegativeInteger = baseCommandLength;

  for (const file of files) {
    const fileArgLengthResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      file.length + 3,
    ); // quotes + space: `"file" `
    if (!fileArgLengthResult.ok) return fileArgLengthResult;
    const fileArgLength: NonNegativeInteger = fileArgLengthResult.data;

    if (currentLength + fileArgLength > ARG_MAX_SAFE && current.length > 0) {
      chunks.push(current);
      current = [file];
      const newLengthResult: Result<NonNegativeInteger> = safeParse(
        NonNegativeIntegerSchema,
        baseCommandLength + fileArgLength,
      );
      if (!newLengthResult.ok) return newLengthResult;
      currentLength = newLengthResult.data;
    } else {
      current.push(file);
      const newLengthResult: Result<NonNegativeInteger> = safeParse(
        NonNegativeIntegerSchema,
        currentLength + fileArgLength,
      );
      if (!newLengthResult.ok) return newLengthResult;
      currentLength = newLengthResult.data;
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return okUnchecked(chunks);
}

// ============================================================================
// Batch Execution
// ============================================================================

/**
 * Executes a batch and returns per-file {@link TaskResult} entries.
 * On failure, falls back to per-file execution for error isolation.
 *
 * @param batch - Batch to execute.
 * @returns `Result<Map<Str, TaskResult>>` — per-file results keyed by absolute path.
 */
export async function executeBatch(batch: Batch): Promise<Result<Map<Str, TaskResult>>> {
  const startTimeResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    Date.now(),
  );
  if (!startTimeResult.ok) return startTimeResult;
  const startTime: NonNegativeInteger = startTimeResult.data;
  const results = new Map<Str, TaskResult>();

  // Record mtimes before execution (for format mode change detection)
  const mtimesBefore = new Map<Str, NonNegativeNumber>();
  if (!batch.checkOnly) {
    for (const file of batch.files) {
      const mtimeResult = getFileMtimeMs(file);
      if (mtimeResult.ok) {
        mtimesBefore.set(file, mtimeResult.data);
      } else {
        // Intentional fallback: file may not exist yet (pre-format), use 0 as change-detection sentinel
        const zeroResult: Result<NonNegativeNumber> = safeParse(NonNegativeNumberSchema, 0);
        if (zeroResult.ok) mtimesBefore.set(file, zeroResult.data);
      }
    }
  }

  // Build and execute the batch command
  const batchResult: Result<BatchCommandOutcome> = await executeBatchCommand(batch);
  if (!batchResult.ok) return batchResult;
  const outcome: BatchCommandOutcome = batchResult.data;

  const durationResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    Date.now() - startTime,
  );
  if (!durationResult.ok) return durationResult;
  const duration: NonNegativeInteger = durationResult.data;
  const perFileDurationResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    Math.max(1, Math.round(duration / batch.files.length)),
  );
  if (!perFileDurationResult.ok) return perFileDurationResult;
  const perFileDuration: NonNegativeInteger = perFileDurationResult.data;

  if (outcome.success) {
    // Batch succeeded
    if (batch.checkOnly) {
      // Check mode: exit 0 means all files are already formatted
      for (const file of batch.files) {
        const relResult: Result<Path> = toRelativePath(file);
        if (!relResult.ok) return relResult;

        results.set(file, {
          file,
          relativePath: relResult.data,
          status: 'unchanged',
          category: batch.formatter.name,
          error: null,
          duration: perFileDuration,
          output: null,
        });
      }
    } else {
      // Format mode: check mtime to detect which files changed
      for (const file of batch.files) {
        const relResult: Result<Path> = toRelativePath(file);
        if (!relResult.ok) return relResult;

        const newMtimeResult = getFileMtimeMs(file);
        // If we can't stat after formatting, assume changed
        const changed: Bool = newMtimeResult.ok
          ? newMtimeResult.data !== mtimesBefore.get(file)
          : true;

        results.set(file, {
          file,
          relativePath: relResult.data,
          status: changed ? 'success' : 'unchanged',
          category: batch.formatter.name,
          error: null,
          duration: perFileDuration,
          output: null,
        });
      }
    }
  } else {
    // Batch failed — fall back to per-file execution for error isolation
    const fallbackResult: Result<Map<Str, TaskResult>> = await fallbackToPerFile(batch);
    if (!fallbackResult.ok) return fallbackResult;

    for (const [file, result] of fallbackResult.data) {
      results.set(file, result);
    }
  }

  return okUnchecked(results);
}

/**
 * Executes a batch command and returns the outcome.
 *
 * Dispatches to the appropriate executor based on the formatter's tool type
 * (biome, prettier, or external).
 *
 * @param batch - Batch to execute.
 * @returns `Result<BatchCommandOutcome>` — success/failure with optional error message.
 */
async function executeBatchCommand(batch: Batch): Promise<Result<BatchCommandOutcome>> {
  const fileArgs: Str = batch.files.map((f) => `"${f}"`).join(' ');

  if (batch.formatter.tool === 'biome') {
    return executeBiomeBatch(fileArgs, batch.checkOnly);
  }

  if (batch.formatter.tool === 'prettier') {
    return executePrettierBatch(fileArgs, batch.checkOnly, batch.formatter.parser);
  }

  if (batch.formatter.tool === 'external' && batch.command) {
    return executeExternalBatch(fileArgs, batch.checkOnly, batch.command);
  }

  return okUnchecked<BatchCommandOutcome>({ success: false, error: 'Unknown batch type' });
}

/**
 * Runs biome on multiple files in a single invocation.
 *
 * @param fileArgs - Quoted and space-joined file paths.
 * @param checkOnly - Whether to run in check-only mode.
 * @returns `Result<BatchCommandOutcome>` — success/failure with optional error.
 */
async function executeBiomeBatch(
  fileArgs: Str,
  checkOnly: Bool,
): Promise<Result<BatchCommandOutcome>> {
  const configResult: Result<NullablePath> = getBundledConfig('biome.jsonc');
  if (!configResult.ok) return configResult;
  const configFlag: Str = configResult.data ? `--config-path "${configResult.data}"` : '';
  const command: Str = checkOnly ? 'check' : 'format';
  const writeFlag: Str = checkOnly ? '' : '--write';

  const result: Result<CliResult> = await runCli(
    `biome ${command} ${configFlag} ${writeFlag} ${fileArgs}`,
  );
  if (!result.ok) return result;
  return okUnchecked({
    success: result.data.success,
    error: result.data.success ? null : result.data.stderr,
  });
}

/**
 * Runs prettier on multiple files (all must share the same parser).
 *
 * @param fileArgs - Quoted and space-joined file paths.
 * @param checkOnly - Whether to run in check-only mode.
 * @param parser - Optional parser override for prettier.
 * @returns `Result<BatchCommandOutcome>` — success/failure with optional error.
 */
async function executePrettierBatch(
  fileArgs: Str,
  checkOnly: Bool,
  parser?: Str,
): Promise<Result<BatchCommandOutcome>> {
  const configResult: Result<NullablePath> = getBundledConfig('.prettierrc');
  if (!configResult.ok) return configResult;
  const configFlag: Str = configResult.data ? `--config "${configResult.data}"` : '';
  const ignoreResult: Result<NullablePath> = getBundledConfig('.prettierignore');
  if (!ignoreResult.ok) return ignoreResult;
  const ignoreFlag: Str = ignoreResult.data ? `--ignore-path "${ignoreResult.data}"` : '';
  const parserFlag: Str = parser ? `--parser ${parser}` : '';
  const command: Str = checkOnly ? 'check' : 'write';

  const result: Result<CliResult> = await runCli(
    `prettier --${command} ${configFlag} ${ignoreFlag} ${parserFlag} ${fileArgs}`,
  );
  if (!result.ok) return result;
  return okUnchecked({
    success: result.data.success,
    error: result.data.success ? null : result.data.stderr,
  });
}

/**
 * Runs an external tool on multiple files in a single invocation.
 *
 * @param fileArgs - Quoted and space-joined file paths.
 * @param checkOnly - Whether to run in check-only mode.
 * @param command - Resolved external command configuration.
 * @returns `Result<BatchCommandOutcome>` — success/failure with optional error.
 */
async function executeExternalBatch(
  fileArgs: Str,
  checkOnly: Bool,
  command: ExternalCommand,
): Promise<Result<BatchCommandOutcome>> {
  // Build config flag
  let configFlag: Str = '';
  if (command.configFile && command.configFlag) {
    const configResult: Result<NullablePath> = getBundledConfig(command.configFile);
    if (!configResult.ok) return configResult;
    if (configResult.data) {
      configFlag = command.configFlag.replace('{config}', configResult.data);
    }
  }

  const args: readonly Str[] =
    checkOnly && command.checkArgs ? command.checkArgs : command.formatArgs;
  const cmdString: Str = [...args, configFlag, fileArgs].filter(Bool).join(' ');
  const result: Result<CliResult> = await runCli(cmdString);
  if (!result.ok) return result;
  return okUnchecked({
    success: result.data.success,
    error: result.data.success ? null : result.data.stderr,
  });
}

/**
 * Falls back to per-file execution when a batch fails.
 * Uses the existing single-file {@link format} function for each file.
 *
 * @param batch - Failed batch to retry per-file.
 * @returns `Result<Map<Str, TaskResult>>` — per-file results keyed by absolute path.
 */
async function fallbackToPerFile(batch: Batch): Promise<Result<Map<Str, TaskResult>>> {
  const results = new Map<Str, TaskResult>();

  /** Compute elapsed time since startTime. Returns 0 on parse failure (fallback). */
  const getDuration = (startTime: NonNegativeInteger): NonNegativeInteger => {
    const d: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      Date.now() - startTime,
    );
    return d.ok ? d.data : startTime;
  };

  for (const file of batch.files) {
    const startTimeResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      Date.now(),
    );
    if (!startTimeResult.ok) return startTimeResult;
    const startTime: NonNegativeInteger = startTimeResult.data;
    const relResult: Result<Path> = toRelativePath(file);
    if (!relResult.ok) return relResult;
    const relPath: Path = relResult.data;

    try {
      const formatResult: Result<FormatResult> = await format(
        file,
        batch.formatter,
        batch.checkOnly,
      );
      if (!formatResult.ok) {
        const duration: NonNegativeInteger = getDuration(startTime);
        results.set(file, {
          file,
          relativePath: relPath,
          status: 'failed',
          category: batch.formatter.name,
          error: formatResult.error.message,
          duration,
          output: null,
        });
        continue;
      }
      const result: FormatResult = formatResult.data;
      const duration: NonNegativeInteger = getDuration(startTime);

      if (result.error) {
        results.set(file, {
          file,
          relativePath: relPath,
          status: 'failed',
          category: batch.formatter.name,
          error: result.error,
          duration,
          output: null,
        });
      } else if (batch.checkOnly) {
        results.set(file, {
          file,
          relativePath: relPath,
          status: result.formatted ? 'unchanged' : 'failed',
          category: batch.formatter.name,
          error: result.formatted ? null : 'File needs formatting',
          duration,
          output: null,
        });
      } else {
        results.set(file, {
          file,
          relativePath: relPath,
          status: result.content !== null ? 'success' : 'unchanged',
          category: batch.formatter.name,
          error: null,
          duration,
          output: null,
        });
      }
    } catch (error: unknown) {
      const duration: NonNegativeInteger = getDuration(startTime);
      results.set(file, {
        file,
        relativePath: relPath,
        status: 'failed',
        category: batch.formatter.name,
        error: error instanceof Error ? error.message : String(error),
        duration,
        output: null,
      });
    }
  }

  return okUnchecked(results);
}
