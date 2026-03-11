/**
 * Formatter Runner
 *
 * Executes formatting based on {@link FormatterDefinition}.
 * Handles biome, prettier, external tools, custom transforms, and noop.
 *
 * All functions return `Result<T>` — input is validated via
 * `safeParse`, subprocess errors are caught and returned as structured errors.
 *
 * @module
 */

import { createTwoFilesPatch } from 'diff';
import * as v from 'valibot';

import type { ExternalCommand, FormatterDefinition } from '@/cli/tools/format/schemas';
import { isToolAvailable } from '@/cli/utils/installer';
import {
  BoolSchema,
  StrSchema,
  type Bool,
  type ExitCode,
  type NullableExitCode,
  type NullablePath,
  type Path,
  type Str,
  type Void,
} from '@/schemas/common';
import { ERRORS, type Result, ok, okUnchecked } from '@/schemas/result/result';
import { deleteFile, readFile, writeFile } from '@/utils/core/fs';
import {
  getDirFromImportMeta,
  getFileExtension,
  getTempDir,
  joinPath,
  pathExists,
  resolvePath,
} from '@/utils/core/path';
import { isWindows } from '@/utils/core/process';
import { spawnProcess } from '@/utils/core/shell';
import { getAbortSignal } from '@/utils/core/signal';

// ============================================================================
// Config Directory (module scope — fallback pattern)
// ============================================================================

/**
 * Path to bundled config files.
 *
 * Computed at module load via `getDirFromImportMeta` + `resolvePath`.
 * Falls back to `null` if resolution fails (module scope can't
 * return Result — fallback pattern per MEMORY.md).
 */
const CONFIG_DIR: NullablePath = (() => {
  const dirResult: Result<Path> = getDirFromImportMeta(import.meta.url);
  if (!dirResult.ok) return null;
  const resolveResult: Result<Path> = resolvePath([dirResult.data, 'config']);
  if (!resolveResult.ok) return null;
  return resolveResult.data;
})();

// ============================================================================
// Schemas
// ============================================================================

/** Schema for the result of running a CLI subprocess. */
const CliResultSchema = v.strictObject({
  /** Whether the command completed successfully. */
  success: BoolSchema,
  /** Captured stdout output. */
  stdout: StrSchema,
  /** Captured stderr output. */
  stderr: StrSchema,
});

/** Inferred output type of {@link CliResultSchema}. */
export type CliResult = v.InferOutput<typeof CliResultSchema>;

/** Schema for the result of formatting a file. */
const FormatResultSchema = v.strictObject({
  /** Whether the file was successfully formatted (or already formatted in check mode). */
  formatted: BoolSchema,
  /** Formatted content, or null if check-only or unchanged. */
  content: v.nullable(StrSchema),
  /** Error message on failure, null on success. */
  error: v.nullable(StrSchema),
});

/** Inferred output type of {@link FormatResultSchema}. */
export type FormatResult = v.InferOutput<typeof FormatResultSchema>;

/** Schema for the result of formatting a file with unified diff output. */
const FormatWithDiffResultSchema = v.strictObject({
  /** Whether the file was successfully formatted (or already formatted). */
  formatted: BoolSchema,
  /** Formatted content, or null if check-only, unchanged, or error. */
  content: v.nullable(StrSchema),
  /** Unified diff showing changes, or null if unchanged or error. */
  diff: v.nullable(StrSchema),
  /** Error message on failure, null on success. */
  error: v.nullable(StrSchema),
});

/** Inferred output type of {@link FormatWithDiffResultSchema}. */
export type FormatWithDiffResult = v.InferOutput<typeof FormatWithDiffResultSchema>;

// ============================================================================
// CLI Runner
// ============================================================================

/**
 * Runs a CLI command and returns the result.
 *
 * Uses async spawn to allow signal handling during execution.
 * Checks the global abort signal before starting and kills the
 * child process if abort is triggered during execution.
 *
 * @param command - Shell command string to execute.
 * @param cwd - Optional working directory for the subprocess.
 * @returns `Promise<Result<CliResult>>` — subprocess outcome, or error if abort signal fails.
 */
export async function runCli(command: Str, cwd?: Str): Promise<Result<CliResult>> {
  const signalResult: Result<AbortSignal> = getAbortSignal();
  if (!signalResult.ok) return signalResult;
  const signal: AbortSignal = signalResult.data;

  // Check if already aborted before starting
  if (signal.aborted) {
    return ok(CliResultSchema, { success: false, stdout: '', stderr: 'Aborted' });
  }

  const shellCmd: Str = isWindows ? 'cmd' : 'sh';
  const shellArgs: Str[] = isWindows ? ['/c', command] : ['-c', command];
  const spawnResult = spawnProcess(shellCmd, shellArgs, {
    stdio: ['pipe', 'pipe', 'pipe'],
    inherit: false,
    ...(cwd ? { cwd } : {}),
  });

  if (!spawnResult.ok) {
    return ok(CliResultSchema, { success: false, stdout: '', stderr: spawnResult.error.message });
  }

  const child = spawnResult.data;

  return new Promise((resolve) => {
    let stdout: Str = '';
    let stderr: Str = '';

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // Handle abort signal — kill child process immediately
    const abortHandler = (): void => {
      if (child.pid && !child.killed) {
        child.kill('SIGINT');
      }
    };

    signal.addEventListener('abort', abortHandler, { once: true });

    child.on('close', (code: NullableExitCode) => {
      signal.removeEventListener('abort', abortHandler);

      // If aborted, return failure
      if (signal.aborted) {
        resolve(ok(CliResultSchema, { success: false, stdout: '', stderr: 'Aborted' }));
        return;
      }

      resolve(
        ok(CliResultSchema, {
          success: code === 0,
          stdout,
          stderr,
        }),
      );
    });

    child.on('error', (error: Error) => {
      signal.removeEventListener('abort', abortHandler);
      resolve(
        ok(CliResultSchema, {
          success: false,
          stdout: '',
          stderr: error.message,
        }),
      );
    });
  });
}

/**
 * Gets a bundled config file path.
 *
 * Always uses configs from the bundled config directory. Returns
 * `null` inside the Result if the config file doesn't exist.
 *
 * @param filename - Config filename to look up (e.g., `'biome.jsonc'`).
 * @returns `Result<NullablePath>` — config file path, or `null` if not found.
 */
export function getBundledConfig(filename: Str): Result<NullablePath> {
  if (!CONFIG_DIR) {
    return okUnchecked<NullablePath>(null);
  }

  const configPathResult: Result<Path> = joinPath([CONFIG_DIR, filename]);
  if (!configPathResult.ok) return configPathResult;

  const existsResult: Result<Bool> = pathExists(configPathResult.data);
  if (!existsResult.ok) return existsResult;

  if (existsResult.data) {
    return okUnchecked<NullablePath>(configPathResult.data);
  }

  return okUnchecked<NullablePath>(null);
}

// ============================================================================
// Tool Runners
// ============================================================================

/**
 * Formats a file using Biome.
 *
 * @param file - Absolute file path to format.
 * @param checkOnly - Whether to check without modifying.
 * @returns `Promise<Result<FormatResult>>` — format result.
 */
async function runBiome(file: Path, checkOnly: Bool): Promise<Result<FormatResult>> {
  const biomeAvail: Result<Bool> = isToolAvailable('biome');
  if (!biomeAvail.ok) return biomeAvail;
  if (!biomeAvail.data) {
    return ok(FormatResultSchema, {
      formatted: false,
      content: null,
      error: 'biome not installed',
    });
  }

  const configResult: Result<NullablePath> = getBundledConfig('biome.jsonc');
  if (!configResult.ok) return configResult;
  const configFlag: Str = configResult.data ? `--config-path "${configResult.data}"` : '';

  const command: Str = checkOnly ? 'check' : 'format';
  const writeFlag: Str = checkOnly ? '' : '--write';

  const cliResult: Result<CliResult> = await runCli(
    `biome ${command} ${configFlag} ${writeFlag} "${file}"`,
  );
  if (!cliResult.ok) return cliResult;

  if (checkOnly) {
    return ok(FormatResultSchema, {
      formatted: cliResult.data.success,
      content: null,
      error: cliResult.data.success ? null : 'File needs formatting',
    });
  }

  if (cliResult.data.success) {
    const formatted: Result<Str> = readFile(file);
    if (!formatted.ok) return formatted;
    return ok(FormatResultSchema, { formatted: true, content: formatted.data, error: null });
  }

  return ok(FormatResultSchema, { formatted: false, content: null, error: cliResult.data.stderr });
}

/**
 * Formats a file using Prettier.
 *
 * @param file - Absolute file path to format.
 * @param checkOnly - Whether to check without modifying.
 * @param parser - Optional parser override for prettier.
 * @returns `Promise<Result<FormatResult>>` — format result.
 */
async function runPrettier(
  file: Path,
  checkOnly: Bool,
  parser?: Str,
): Promise<Result<FormatResult>> {
  const prettierAvail: Result<Bool> = isToolAvailable('prettier');
  if (!prettierAvail.ok) return prettierAvail;
  if (!prettierAvail.data) {
    return ok(FormatResultSchema, {
      formatted: false,
      content: null,
      error: 'prettier not installed',
    });
  }

  const configResult: Result<NullablePath> = getBundledConfig('.prettierrc');
  if (!configResult.ok) return configResult;
  const configFlag: Str = configResult.data ? `--config "${configResult.data}"` : '';

  const ignoreResult: Result<NullablePath> = getBundledConfig('.prettierignore');
  if (!ignoreResult.ok) return ignoreResult;
  const ignoreFlag: Str = ignoreResult.data ? `--ignore-path "${ignoreResult.data}"` : '';

  const parserFlag: Str = parser ? `--parser ${parser}` : '';
  const command: Str = checkOnly ? 'check' : 'write';

  const cliResult: Result<CliResult> = await runCli(
    `prettier --${command} ${configFlag} ${ignoreFlag} ${parserFlag} "${file}"`,
  );
  if (!cliResult.ok) return cliResult;

  if (checkOnly) {
    return ok(FormatResultSchema, {
      formatted: cliResult.data.success,
      content: null,
      error: cliResult.data.success ? null : 'File needs formatting',
    });
  }

  if (cliResult.data.success) {
    const formatted: Result<Str> = readFile(file);
    if (!formatted.ok) return formatted;
    return ok(FormatResultSchema, { formatted: true, content: formatted.data, error: null });
  }

  return ok(FormatResultSchema, { formatted: false, content: null, error: cliResult.data.stderr });
}

/**
 * Formats a file using an external CLI tool.
 *
 * Tries commands in order; the first available binary wins.
 * Falls through to the next command on failure.
 *
 * @param file - Absolute file path to format.
 * @param content - Current file content (for stdout-comparison checks).
 * @param checkOnly - Whether to check without modifying.
 * @param commands - Ordered list of external commands to try.
 * @returns `Promise<Result<FormatResult>>` — format result.
 */
async function runExternal(
  file: Path,
  content: Str,
  checkOnly: Bool,
  commands: ExternalCommand[],
): Promise<Result<FormatResult>> {
  for (const cmd of commands) {
    const cmdAvail: Result<Bool> = isToolAvailable(cmd.bin);
    if (!cmdAvail.ok) return cmdAvail;
    if (!cmdAvail.data) continue;

    // Build config flag if applicable (always use bundled config)
    let configFlag: Str = '';
    if (cmd.configFile && cmd.configFlag) {
      const configResult: Result<NullablePath> = getBundledConfig(cmd.configFile);
      if (!configResult.ok) return configResult;
      if (configResult.data) {
        configFlag = cmd.configFlag.replace('{config}', configResult.data);
      }
    }

    // Check mode
    if (checkOnly) {
      if (!cmd.checkArgs) {
        // No check mode available, assume formatted
        return ok(FormatResultSchema, { formatted: true, content: null, error: null });
      }

      const checkCommand: Str = [...cmd.checkArgs, configFlag, `"${file}"`].filter(Bool).join(' ');
      const cliResult: Result<CliResult> = await runCli(checkCommand);
      if (!cliResult.ok) return cliResult;

      if (cmd.checkByEmptyStdout) {
        const isEmpty: Bool = cliResult.data.stdout.trim() === '';
        return ok(FormatResultSchema, {
          formatted: isEmpty,
          content: null,
          error: isEmpty ? null : 'File needs formatting',
        });
      }

      if (cmd.checkByDiff) {
        const isSame: Bool = cliResult.data.stdout === content;
        return ok(FormatResultSchema, {
          formatted: isSame,
          content: null,
          error: isSame ? null : 'File needs formatting',
        });
      }

      return ok(FormatResultSchema, {
        formatted: cliResult.data.success,
        content: null,
        error: cliResult.data.success ? null : 'File needs formatting',
      });
    }

    // Format mode
    const formatCommand: Str = [...cmd.formatArgs, configFlag, `"${file}"`].filter(Bool).join(' ');
    const cliResult: Result<CliResult> = await runCli(formatCommand);
    if (!cliResult.ok) return cliResult;

    if (cmd.writesStdout && cliResult.data.success) {
      const writeResult: Result<Void> = writeFile(file, cliResult.data.stdout);
      if (!writeResult.ok) return writeResult;
      return ok(FormatResultSchema, {
        formatted: true,
        content: cliResult.data.stdout,
        error: null,
      });
    }

    if (cliResult.data.success) {
      const formatted: Result<Str> = readFile(file);
      if (!formatted.ok) return formatted;
      return ok(FormatResultSchema, { formatted: true, content: formatted.data, error: null });
    }

    // This tool failed, try next
    continue;
  }

  // No tool available
  const toolNames: Str = commands.map((c) => c.bin).join(' or ');
  return ok(FormatResultSchema, {
    formatted: false,
    content: null,
    error: `${toolNames} not installed`,
  });
}

/**
 * Formats a file using a custom inline transform function.
 *
 * @param file - Absolute file path to format.
 * @param content - Current file content.
 * @param checkOnly - Whether to check without modifying.
 * @param transform - Custom transform function.
 * @returns `Result<FormatResult>` — format result.
 */
function runCustom(
  file: Path,
  content: Str,
  checkOnly: Bool,
  transform: (content: Str) => Str,
): Result<FormatResult> {
  const transformed: Str = transform(content);

  if (checkOnly) {
    const isFormatted: Bool = transformed === content;
    return ok(FormatResultSchema, {
      formatted: isFormatted,
      content: null,
      error: isFormatted ? null : 'File needs formatting',
    });
  }

  const writeResult: Result<Void> = writeFile(file, transformed);
  if (!writeResult.ok) return writeResult;
  return ok(FormatResultSchema, { formatted: true, content: transformed, error: null });
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Formats a file using the appropriate formatter.
 *
 * Dispatches to the correct tool runner based on the formatter's `tool` field.
 * Reads the file content upfront for tools that need it (external, custom).
 *
 * @param file - Absolute file path to format.
 * @param formatter - Formatter definition specifying the tool and config.
 * @param checkOnly - Whether to check without modifying.
 * @returns `Promise<Result<FormatResult>>` — format result.
 */
export async function format(
  file: Path,
  formatter: FormatterDefinition,
  checkOnly: Bool,
): Promise<Result<FormatResult>> {
  const contentResult: Result<Str> = readFile(file);
  if (!contentResult.ok) return contentResult;
  const content: Str = contentResult.data;

  switch (formatter.tool) {
    case 'biome':
      return runBiome(file, checkOnly);

    case 'prettier':
      return runPrettier(file, checkOnly, formatter.parser);

    case 'external':
      if (!formatter.commands || formatter.commands.length === 0) {
        return ok(FormatResultSchema, {
          formatted: false,
          content: null,
          error: `No commands defined for ${formatter.id}`,
        });
      }
      return runExternal(file, content, checkOnly, formatter.commands);

    case 'custom':
      if (!formatter.transform) {
        return ok(FormatResultSchema, {
          formatted: false,
          content: null,
          error: `No transform defined for ${formatter.id}`,
        });
      }
      return runCustom(file, content, checkOnly, formatter.transform);

    case 'noop':
      return ok(FormatResultSchema, { formatted: true, content, error: null });

    default:
      return ok(FormatResultSchema, {
        formatted: false,
        content: null,
        error: `Unknown tool type: ${formatter.tool}`,
      });
  }
}

/**
 * Formats a file and returns a diff showing changes.
 *
 * Does NOT modify the original file. Creates a temp file, formats it,
 * compares with the original, and generates a unified diff.
 *
 * @param file - Absolute file path to diff-format.
 * @param formatter - Formatter definition specifying the tool and config.
 * @returns `Promise<Result<FormatWithDiffResult>>` — diff result.
 */
export async function formatWithDiff(
  file: Path,
  formatter: FormatterDefinition,
): Promise<Result<FormatWithDiffResult>> {
  const originalResult: Result<Str> = readFile(file);
  if (!originalResult.ok) return originalResult;
  const originalContent: Str = originalResult.data;

  // Create temp file with same extension for proper formatter detection
  const extResult: Result<Str> = getFileExtension(file);
  if (!extResult.ok) return extResult;

  const tmpResult: Result<Path> = getTempDir();
  if (!tmpResult.ok) return tmpResult;

  const tempFileResult: Result<Path> = joinPath([
    tmpResult.data,
    `format-diff-${Date.now()}${extResult.data}`,
  ]);
  if (!tempFileResult.ok) return tempFileResult;
  const tempFile: Path = tempFileResult.data;

  try {
    // Write original content to temp file
    const writeResult: Result<Void> = writeFile(tempFile, originalContent);
    if (!writeResult.ok) return writeResult;

    // Format the temp file
    const result: Result<FormatResult> = await format(tempFile, formatter, false);
    if (!result.ok) return result;

    if (!result.data.formatted) {
      return ok(FormatWithDiffResultSchema, {
        formatted: false,
        content: null,
        diff: null,
        error: result.data.error,
      });
    }

    // Read formatted content from temp file
    const formattedResult: Result<Str> = readFile(tempFile);
    if (!formattedResult.ok) return formattedResult;
    const formattedContent: Str = formattedResult.data;

    // Check if file is already formatted
    if (originalContent === formattedContent) {
      return ok(FormatWithDiffResultSchema, {
        formatted: true,
        content: null,
        diff: null,
        error: null,
      });
    }

    // Generate unified diff
    const diff: Str = createTwoFilesPatch(
      file,
      file,
      originalContent,
      formattedContent,
      'original',
      'formatted',
    );

    return ok(FormatWithDiffResultSchema, {
      formatted: false,
      content: formattedContent,
      diff,
      error: null,
    });
  } finally {
    // Clean up temp file — fire-and-forget (finally block, can't return Result)
    deleteFile(tempFile);
  }
}
