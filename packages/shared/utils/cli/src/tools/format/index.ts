#!/usr/bin/env tsx

/**
 * Format Tool
 *
 * Multi-language code formatter supporting 90+ file types.
 * Orchestrates Biome, Prettier, external CLI tools, custom transforms,
 * and noop pass-throughs via a plugin-like formatter registry.
 *
 * @module
 */

import * as v from 'valibot';

import type { BuiltCliStrings } from '@/cli/locale/schema';
import {
  TaskResultSchema,
  type InstallCommandsRecord,
  type TaskContext,
  type TaskResult,
  type TaskRunnerDefinition,
} from '@/cli/schemas';
import { TOOL_FLAG_DEFS } from '@/cli/tools/format/flags';
import type { BuiltFormatStrings } from '@/cli/tools/format/locales/schema';
import { FormatterDefinitionSchema, type FormatterDefinition } from '@/cli/tools/format/schemas';
import { createBatches, executeBatch } from '@/cli/tools/format/utils/batch';
import { getAllFormatters, getFormatterForFile } from '@/cli/tools/format/utils/registry';
import {
  format,
  formatWithDiff,
  type FormatResult,
  type FormatWithDiffResult,
} from '@/cli/tools/format/utils/runner';
import { requireOnboarding } from '@/cli/utils/core';
import {
  getToolInstallCommands,
  installToolAsync,
  isToolAvailable,
  waitForBrewLock,
} from '@/cli/utils/installer';
import { createRunner } from '@/cli/utils/runner';
import {
  BoolSchema,
  DEFAULT_EXIT_CODE,
  ExitCodeSchema,
  NonNegativeIntegerSchema,
  PathSchema,
  StrArraySchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type ExitCode,
  type NonNegativeInteger,
  type NullableRegExpMatchArray,
  type Path,
  type NullableStr,
  type OptionalStr,
  type Str,
  type StrArray,
  type SupportedRuntimes,
  type Void,
} from '@/schemas/common';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { readFile, writeFile } from '@/utils/core/fs';
import { cwd, joinPath, pathExists, toRelativePath } from '@/utils/core/path';
import {
  clearLine,
  cursorTo,
  exit,
  getScriptPath,
  isTTY,
  isWindows,
  writeStdout,
} from '@/utils/core/process';
import { padRight } from '@/utils/core/string';
import { log, progressBar, stopSpinner, style, symbols } from '@/utils/core/terminal';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Local Type Aliases
// =============================================================================

/** Schema for nullable formatter definition. */
const NullableFormatterDefinitionSchema = v.nullable(FormatterDefinitionSchema);

/** @see {@link NullableFormatterDefinitionSchema} */
type NullableFormatterDefinition = v.InferOutput<typeof NullableFormatterDefinitionSchema>;

/** Schema for optional formatter definitions array. */
const OptionalFormatterDefinitionsSchema = v.optional(v.array(FormatterDefinitionSchema));

/** @see {@link OptionalFormatterDefinitionsSchema} */
type OptionalFormatterDefinitions = v.InferOutput<typeof OptionalFormatterDefinitionsSchema>;

/** Schema for optional string commands array. */
const OptionalStrCommandsSchema = v.optional(StrArraySchema);

/** @see {@link OptionalStrCommandsSchema} */
type OptionalStrCommands = v.InferOutput<typeof OptionalStrCommandsSchema>;

/** Schema for optional task result. */
const OptionalTaskResultSchema = v.optional(TaskResultSchema);

/** @see {@link OptionalTaskResultSchema} */
type OptionalTaskResult = v.InferOutput<typeof OptionalTaskResultSchema>;

/** Schema for tool availability check result. */
const ToolAvailabilitySchema = v.strictObject({
  /** Tool identifier. */
  tool: StrSchema,
  /** Whether the tool is available on the system. */
  available: BoolSchema,
});

/** Tool availability check result. @see {@link ToolAvailabilitySchema} */
type ToolAvailability = v.InferOutput<typeof ToolAvailabilitySchema>;

// =============================================================================
// Formatting Helpers
// =============================================================================

/**
 * Formats a progress counter like [3/42] with dim styling.
 *
 * @param current - Current item index.
 * @param total - Total item count.
 * @returns `Result<Str>` — formatted dim counter string, or a validation error.
 */
function formatCounter(current: NonNegativeInteger, total: NonNegativeInteger): Result<Str> {
  const currentResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, current);
  if (!currentResult.ok) return currentResult;
  const totalResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, total);
  if (!totalResult.ok) return totalResult;
  const totalStr: Str = String(totalResult.data);
  const currentStr: Str = String(currentResult.data).padStart(totalStr.length, ' ');
  const dimResult: Result<Str> = style.dim(`[${currentStr}/${totalStr}]`);
  if (!dimResult.ok) return dimResult;
  return ok(StrSchema, dimResult.data);
}

// =============================================================================
// Types
// =============================================================================

/** Valibot schema for tool-specific flags for the format tool. */
const FormatFlagsSchema = v.strictObject({
  /** Run in check mode (no writes). */
  check: BoolSchema,
  /** Show unified diff of changes. */
  diff: BoolSchema,
  /** List all available formatters. */
  listFormatters: BoolSchema,
  /** Check availability of formatter tools. */
  checkTools: BoolSchema,
  /** Install missing formatter tools. */
  installTools: BoolSchema,
  /** List ignore patterns from .formatignore. */
  listIgnored: BoolSchema,
});

/** Tool-specific flags for the format tool. */
type FormatFlags = v.InferOutput<typeof FormatFlagsSchema>;

// =============================================================================
// Batch Result Cache
// =============================================================================

/**
 * Module-scoped cache for batch results.
 * Populated during onFilesDiscovered, consumed during formatFile.
 */
const batchResultCache = new Map<Str, TaskResult>();

// =============================================================================
// Info Mode Handlers
// =============================================================================

/**
 * Prints all available formatters grouped by tool type.
 *
 * @param strings - Built locale strings for the format tool.
 * @returns `Result<Void>` — success, or an error.
 */
function printFormatterList(strings: BuiltFormatStrings): Result<Void> {
  const allFormattersResult: Result<FormatterDefinition[]> = getAllFormatters();
  if (!allFormattersResult.ok) return allFormattersResult;
  const allFormatters: FormatterDefinition[] = allFormattersResult.data;

  log.print('');
  const headerMsg: Result<Str> = strings.formatterListHeader();
  if (!headerMsg.ok) return headerMsg;
  log.print(`\n{bold}  {bold}{cyan}${headerMsg.data}{/}{/}{/}`);
  log.print('');

  // Sort by name
  const sorted: FormatterDefinition[] = [...allFormatters].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // Group by tool type
  const byTool: Record<Str, FormatterDefinition[]> = {};
  for (const formatter of sorted) {
    const tool: Str = formatter.tool;
    if (!byTool[tool]) {
      byTool[tool] = [];
    }
    byTool[tool].push(formatter);
  }

  // Print each tool group
  const toolOrder: StrArray = ['biome', 'prettier', 'external', 'custom', 'noop'];
  for (const tool of toolOrder) {
    const formatters: OptionalFormatterDefinitions = byTool[tool];
    if (!formatters || formatters.length === 0) continue;

    log.info(`{magenta}{bold}${tool.toUpperCase()}{/}{/} {dim}(${formatters.length}){/}`);

    for (const formatter of formatters) {
      const extensions: Str = formatter.extensions?.join(', ') ?? '';
      const filenames: Str = formatter.filenames?.join(', ') ?? '';
      const patterns: Str = formatter.patterns?.join(', ') ?? '';

      const parts: StrArray = [];
      if (extensions) parts.push(extensions);
      if (filenames) parts.push(filenames);
      if (patterns) parts.push(patterns);

      const targets: Str = parts.join(', ') || '(no targets)';

      const nameResult: Result<Str> = padRight(formatter.name, 22);
      if (!nameResult.ok) return nameResult;
      log.info(`  {green}${nameResult.data}{/} {dim}${targets}{/}`);
    }

    log.print('');
  }

  const countMsg: Result<Str> = strings.formatterCount({ count: sorted.length });
  if (!countMsg.ok) return countMsg;
  log.print(`{dim}  ${countMsg.data}{/}`);
  log.print('');
  return ok(VoidSchema, undefined);
}

/**
 * Checks and prints availability of all formatter tools.
 *
 * @param strings - Built locale strings for the format tool.
 * @returns `Result<Void>` — success, or an error.
 */
function printToolAvailability(strings: BuiltFormatStrings): Result<Void> {
  const allFormattersResult: Result<FormatterDefinition[]> = getAllFormatters();
  if (!allFormattersResult.ok) return allFormattersResult;
  const allFormatters: FormatterDefinition[] = allFormattersResult.data;

  const results: ToolAvailability[] = [];
  const checkedTools: Set<Str> = new Set<Str>();

  for (const formatter of allFormatters) {
    if (formatter.tool === 'biome') {
      if (!checkedTools.has('biome')) {
        checkedTools.add('biome');
        const biomeAvail: Result<Bool> = isToolAvailable('biome');
        results.push({ tool: 'biome', available: biomeAvail.ok && biomeAvail.data });
      }
    } else if (formatter.tool === 'prettier') {
      if (!checkedTools.has('prettier')) {
        checkedTools.add('prettier');
        const prettierAvail: Result<Bool> = isToolAvailable('prettier');
        results.push({ tool: 'prettier', available: prettierAvail.ok && prettierAvail.data });
      }
    } else if (formatter.tool === 'external' && formatter.commands) {
      for (const cmd of formatter.commands) {
        if (!checkedTools.has(cmd.bin)) {
          checkedTools.add(cmd.bin);
          const cmdAvail: Result<Bool> = isToolAvailable(cmd.bin);
          results.push({ tool: cmd.bin, available: cmdAvail.ok && cmdAvail.data });
        }
      }
    }
  }

  log.print('');
  const availHeaderMsg: Result<Str> = strings.toolAvailabilityHeader();
  if (!availHeaderMsg.ok) return availHeaderMsg;
  log.print(`\n{bold}  {bold}${availHeaderMsg.data}{/}{/}`);
  log.print('');

  const available: ToolAvailability[] = results.filter((r: ToolAvailability) => r.available);
  const unavailable: ToolAvailability[] = results.filter((r: ToolAvailability) => !r.available);

  const installedMsg: Result<Str> = strings.toolInstalled();
  if (!installedMsg.ok) return installedMsg;
  const notFoundMsg: Result<Str> = strings.toolNotFound();
  if (!notFoundMsg.ok) return notFoundMsg;

  for (const result of results.sort((a: ToolAvailability, b: ToolAvailability) =>
    a.tool.localeCompare(b.tool),
  )) {
    const toolPadResult: Result<Str> = padRight(result.tool, 20);
    if (!toolPadResult.ok) return toolPadResult;
    const toolPad: Str = toolPadResult.data;

    if (result.available) {
      log.print(`  {green}{symbol:success}{/} ${toolPad} {green}${installedMsg.data}{/}`);
    } else {
      log.error(`${toolPad} {red}${notFoundMsg.data}{/}`);
    }
  }

  log.print('');
  const summaryMsg: Result<Str> = strings.toolSummary({
    available: available.length,
    missing: unavailable.length,
  });
  if (!summaryMsg.ok) return summaryMsg;
  log.print(`{dim}  ${summaryMsg.data}{/}`);
  log.print('');
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Install Helpers (extracted from installMissingTools)
// =============================================================================

/**
 * Cleans raw error text by filtering noise lines and extracting the most relevant error.
 *
 * @param text - Raw error output from a CLI tool.
 * @returns `Result<Str>` — the most relevant error line.
 */
function cleanError(text: Str): Result<Str> {
  const lines: Str[] = text
    .split('\n')
    .map((l: Str) => l.trim())
    .filter(
      (l: Str) =>
        l.length > 0 &&
        !l.startsWith('✔︎') &&
        !l.startsWith('==>') &&
        !l.startsWith('Downloading') &&
        !l.startsWith('Fetching') &&
        !l.startsWith('Installing') &&
        !l.startsWith('Pouring'),
    );
  const result: Str =
    lines.find((l: Str) => /^(Error|Warning|ERROR|WARNING|error)/i.test(l)) ??
    lines[0] ??
    'Unknown error';
  return ok(StrSchema, result);
}

/**
 * Extracts a human-readable error message from a nested error string.
 *
 * @param rawError - Raw error string, possibly with nested "Failed to install" prefix.
 * @returns `Result<Str>` — extracted error message.
 */
function extractError(rawError: Str): Result<Str> {
  const nestedMatch: NullableRegExpMatchArray = rawError.match(/^Failed to install \w+: (.+)$/s);
  if (nestedMatch) {
    const cleanResult: Result<Str> = cleanError(nestedMatch[1]);
    if (!cleanResult.ok) return cleanResult;
    const prereqName: OptionalStr = rawError.match(/^Failed to install (\w+):/)?.[1];
    const message: Str = prereqName ? `${prereqName}: ${cleanResult.data}` : cleanResult.data;
    return ok(StrSchema, message);
  }
  return cleanError(rawError);
}

/**
 * Checks if a tool uses brew for installation (directly or via sh -c).
 *
 * @param tool - Tool name to check.
 * @param commands - Install commands record.
 * @returns `Result<Bool>` — whether the tool is brew-based.
 */
function isBrewBased(tool: Str, commands: InstallCommandsRecord): Result<Bool> {
  const cmd: OptionalStrCommands = commands[tool]?.cmd;
  if (!cmd) return ok(BoolSchema, false);
  if (cmd[0] === 'brew') return ok(BoolSchema, true);
  if (cmd[0] === 'sh' && cmd[1] === '-c' && cmd[2]?.includes('brew')) return ok(BoolSchema, true);
  return ok(BoolSchema, false);
}

/**
 * Gets the prerequisite binary for a tool installation (null if none or self-contained).
 *
 * @param tool - Tool name.
 * @param commands - Install commands record.
 * @returns `Result<NullableStr>` — prerequisite tool name, or null.
 */
function getPrereq(tool: Str, commands: InstallCommandsRecord): Result<NullableStr> {
  const installDef = commands[tool];
  if (!installDef) return okUnchecked<NullableStr>(null);
  const requires: OptionalStr = installDef.requires;
  if (requires) return okUnchecked<NullableStr>(requires);
  if (installDef.cmd[0] === 'sh' || installDef.cmd[0] === 'brew')
    return okUnchecked<NullableStr>(null);
  return okUnchecked<NullableStr>(installDef.cmd[0]);
}

/**
 * Recursively collects missing prerequisites that can be installed.
 *
 * @param tool - Tool to check prerequisites for.
 * @param commands - Install commands record.
 * @param missingPrereqs - Mutable set to add missing prerequisites to.
 * @param visited - Set of already-visited tools (prevents cycles).
 * @returns `Result<Void>` — success, or an error.
 */
function collectMissingPrereqs(
  tool: Str,
  commands: InstallCommandsRecord,
  missingPrereqs: Set<Str>,
  visited: Set<Str> = new Set<Str>(),
): Result<Void> {
  if (visited.has(tool)) return ok(VoidSchema, undefined);
  visited.add(tool);
  const prereqResult: Result<NullableStr> = getPrereq(tool, commands);
  if (!prereqResult.ok) return prereqResult;
  const prereq: NullableStr = prereqResult.data;
  if (prereq) {
    const prereqAvail: Result<Bool> = isToolAvailable(prereq);
    if (!prereqAvail.ok) return prereqAvail;
    if (!prereqAvail.data && commands[prereq]) {
      missingPrereqs.add(prereq);
      const recurseResult: Result<Void> = collectMissingPrereqs(
        prereq,
        commands,
        missingPrereqs,
        visited,
      );
      if (!recurseResult.ok) return recurseResult;
    }
  }
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Install Missing Tools
// =============================================================================

/**
 * Installs missing formatter tools in parallel with progress.
 *
 * @param strings - Built locale strings for the format tool.
 * @param cliStrings - Built CLI locale strings for installer messages.
 * @param showProgress - Whether to show progress bar (TTY mode).
 * @returns `Promise<Result<Void>>` — success, or an error.
 */
async function installMissingTools(
  strings: BuiltFormatStrings,
  cliStrings: BuiltCliStrings,
  showProgress: Bool,
): Promise<Result<Void>> {
  // Stop any active spinner from file scanning
  stopSpinner();

  const commandsResult: Result<InstallCommandsRecord> = getToolInstallCommands();
  if (!commandsResult.ok) return commandsResult;
  const commands: InstallCommandsRecord = commandsResult.data;

  const allFormattersResult: Result<FormatterDefinition[]> = getAllFormatters();
  if (!allFormattersResult.ok) return allFormattersResult;
  const allFormatters: FormatterDefinition[] = allFormattersResult.data;

  const toolInfos: ToolAvailability[] = [];
  const checkedTools: Set<Str> = new Set<Str>();

  // Collect all tools and their availability
  for (const formatter of allFormatters) {
    if (formatter.tool === 'biome') {
      if (!checkedTools.has('biome')) {
        checkedTools.add('biome');
        const biomeCheck: Result<Bool> = isToolAvailable('biome');
        toolInfos.push({ tool: 'biome', available: biomeCheck.ok && biomeCheck.data });
      }
    } else if (formatter.tool === 'prettier') {
      if (!checkedTools.has('prettier')) {
        checkedTools.add('prettier');
        const prettierCheck: Result<Bool> = isToolAvailable('prettier');
        toolInfos.push({ tool: 'prettier', available: prettierCheck.ok && prettierCheck.data });
      }
    } else if (formatter.tool === 'external' && formatter.commands) {
      for (const cmd of formatter.commands) {
        if (!checkedTools.has(cmd.bin)) {
          checkedTools.add(cmd.bin);
          const toolCheck: Result<Bool> = isToolAvailable(cmd.bin);
          toolInfos.push({ tool: cmd.bin, available: toolCheck.ok && toolCheck.data });
        }
      }
    }
  }

  const missingTools: ToolAvailability[] = toolInfos.filter((t: ToolAvailability) => !t.available);
  const alreadyInstalled: ToolAvailability[] = toolInfos.filter(
    (t: ToolAvailability) => t.available,
  );

  if (missingTools.length === 0) {
    log.print('');
    const noToolsMsg: Result<Str> = strings.noToolsToInstall();
    if (!noToolsMsg.ok) return noToolsMsg;
    log.print(`  {green}{symbol:success}{/} ${noToolsMsg.data}`);
    log.print('');
    return ok(VoidSchema, undefined);
  }

  // Separate tools with install commands from those without
  const installable: ToolAvailability[] = missingTools.filter(
    ({ tool }: ToolAvailability) => commands[tool],
  );
  const notInstallable: ToolAvailability[] = missingTools.filter(
    ({ tool }: ToolAvailability) => !commands[tool],
  );

  log.print('');
  const installingHeaderMsg: Result<Str> = strings.installingToolsHeader();
  if (!installingHeaderMsg.ok) return installingHeaderMsg;
  log.print(`\n{bold}  {bold}{cyan}${installingHeaderMsg.data}{/}{/}{/}`);
  log.print('');

  const ttyResult: Result<Bool> = isTTY();
  const isTtyFlag: Bool = !!(ttyResult.ok && ttyResult.data && showProgress);
  const installedCountResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
  if (!installedCountResult.ok) return installedCountResult;
  let installedCount: NonNegativeInteger = installedCountResult.data;
  const failedCountResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    notInstallable.length,
  );
  if (!failedCountResult.ok) return failedCountResult;
  let failedCount: NonNegativeInteger = failedCountResult.data;

  // Print already installed tools first (dimmed)
  for (const { tool } of alreadyInstalled) {
    log.print(`{dim}  ${symbols.dash} ${tool.padEnd(20)} already installed{/}`);
  }

  // Print tools without install commands
  for (const { tool } of notInstallable) {
    log.warn(`${tool.padEnd(20)} {yellow}no install command{/}`);
  }

  // Collect all missing prerequisites (recursive) that we can install
  const missingPrereqs: Set<Str> = new Set<Str>();
  for (const { tool } of installable) {
    const collectResult: Result<Void> = collectMissingPrereqs(tool, commands, missingPrereqs);
    if (!collectResult.ok) return collectResult;
  }

  // Separate prerequisites by type (brew-based must run sequentially)
  const brewPrereqs: StrArray = Array.from(missingPrereqs).filter((p: Str): Bool => {
    const r: Result<Bool> = isBrewBased(p, commands);
    return r.ok && r.data;
  });
  const nonBrewPrereqs: StrArray = Array.from(missingPrereqs).filter((p: Str): Bool => {
    const r: Result<Bool> = isBrewBased(p, commands);
    return !r.ok || !r.data;
  });

  // Separate tools by type, excluding any that are already in prereqs (avoid duplicates)
  const brewTools: ToolAvailability[] = installable.filter(({ tool }: ToolAvailability): Bool => {
    const r: Result<Bool> = isBrewBased(tool, commands);
    return r.ok && r.data && !missingPrereqs.has(tool);
  });
  const nonBrewTools: ToolAvailability[] = installable.filter(
    ({ tool }: ToolAvailability): Bool => {
      const r: Result<Bool> = isBrewBased(tool, commands);
      return (!r.ok || !r.data) && !missingPrereqs.has(tool);
    },
  );

  const totalResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    installable.length + missingPrereqs.size,
  );
  if (!totalResult.ok) return totalResult;
  const total: NonNegativeInteger = totalResult.data;
  const completedResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
  if (!completedResult.ok) return completedResult;
  let completed: NonNegativeInteger = completedResult.data;

  /**
   * Serializes output operations using a promise chain mutex.
   * Fire-and-forget closure — bound to mutable `outputLock` state.
   *
   * @param fn - Synchronous function to execute with exclusive output access.
   */
  let outputLock: Promise<void> = Promise.resolve();
  const withOutputLock = async (fn: () => void): Promise<void> => {
    const prev: Promise<void> = outputLock;
    let resolve: () => void;
    outputLock = new Promise<void>((r: (value: void) => void) => {
      resolve = r;
    });
    await prev;
    fn();
    resolve!();
  };

  /**
   * Redraws the progress bar on the current TTY line.
   * Fire-and-forget closure — bound to mutable `completed`, `total`, `isTtyFlag` state.
   */
  const updateProgressBar = (): void => {
    if (isTtyFlag) {
      clearLine();
      const zeroResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
      if (zeroResult.ok) cursorTo(zeroResult.data);
      const barResult: Result<Str> = progressBar(completed, total, 30);
      const counterResult: Result<Str> = formatCounter(completed, total);
      const bar: Str = barResult.ok ? barResult.data : '';
      const counter: Str = counterResult.ok ? counterResult.data : '';
      writeStdout(`  ${bar} ${counter}`);
    }
  };

  // Tools that may need PATH additions after install
  const gemPath: Str = isWindows
    ? 'Add %USERPROFILE%\\.gem\\ruby\\*\\bin to PATH'
    : 'Add ~/.gem/ruby/*/bin to PATH';
  const pathNotes: Record<Str, Str> = {
    rubocop: gemPath,
    rufo: gemPath,
  };

  /**
   * Installs a single tool and reports the result with serialized output.
   * Fire-and-forget closure — bound to mutable install counters and output lock.
   *
   * @param tool - Tool name to install.
   */
  const installAndReport = async (tool: Str): Promise<void> => {
    const result: Result<Void> = await installToolAsync(tool, cliStrings);

    await withOutputLock(() => {
      completed++;

      if (isTtyFlag) {
        clearLine();
        const zeroResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
        if (zeroResult.ok) cursorTo(zeroResult.data);
      }

      if (result.ok) {
        const note: OptionalStr = pathNotes[tool];
        if (note) {
          log.print(
            `  {green}{symbol:success}{/} ${tool.padEnd(20)} {green}installed{/} {dim}(${note}){/}`,
          );
        } else {
          log.print(`  {green}{symbol:success}{/} ${tool.padEnd(20)} {green}installed{/}`);
        }
        installedCount++;
      } else {
        const errorResult: Result<Str> = extractError(result.error.message ?? 'Unknown error');
        const errorMsg: Str = errorResult.ok ? errorResult.data : 'Unknown error';
        log.error(`${tool.padEnd(20)} {red}${errorMsg}{/}`);
        failedCount++;
      }

      updateProgressBar();
    });
  };

  // Print initial progress bar
  if (isTtyFlag) {
    const barResult: Result<Str> = progressBar(0, total, 30);
    const initZeroResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
    const counterResult: Result<Str> = initZeroResult.ok
      ? formatCounter(initZeroResult.data, total)
      : okUnchecked<Str>('');
    const bar: Str = barResult.ok ? barResult.data : '';
    const counter: Str = counterResult.ok ? counterResult.data : '';
    writeStdout(`  ${bar} ${counter}`);
  }

  // Installation strategy:
  // 1. Wait for any existing brew processes to finish
  // 2. All brew-based installs (prereqs + tools) run sequentially to avoid brew lock
  // 3. Non-brew prereqs run in parallel with brew installs
  // 4. Non-brew tools run after their prerequisites are installed

  // Check for existing brew lock before starting
  const hasBrewTools: Bool = brewPrereqs.length > 0 || brewTools.length > 0;
  if (hasBrewTools) {
    const brewResult: Result<Bool> = await waitForBrewLock(10000, 1000);
    if (!brewResult.ok || !brewResult.data) {
      const brewWaitMsg: Result<Str> = strings.brewLockWaiting();
      if (!brewWaitMsg.ok) return brewWaitMsg;
      log.warn(brewWaitMsg.data);
      const lockResult: Result<Bool> = await waitForBrewLock(300000, 2000);
      if (!lockResult.ok || !lockResult.data) {
        const brewTimeoutMsg: Result<Str> = strings.brewLockTimeout();
        if (!brewTimeoutMsg.ok) return brewTimeoutMsg;
        log.error(brewTimeoutMsg.data);
        return ok(VoidSchema, undefined);
      }
    }
  }

  await Promise.all([
    // Sequential: All brew-based (prereqs first, then tools)
    (async () => {
      for (const prereq of brewPrereqs) {
        await installAndReport(prereq);
      }
      for (const { tool } of brewTools) {
        await installAndReport(tool);
      }
    })(),
    // Parallel: Non-brew prerequisites
    ...nonBrewPrereqs.map((prereq: Str) => installAndReport(prereq)),
  ]);

  // Now install non-brew tools (their prereqs should be available now)
  await Promise.all(nonBrewTools.map(({ tool }: ToolAvailability) => installAndReport(tool)));

  // Clear progress bar line
  if (isTtyFlag) {
    clearLine();
    const finalZeroResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
    if (finalZeroResult.ok) cursorTo(finalZeroResult.data);
  }

  // Print summary
  log.print('');
  const installSummaryMsg: Result<Str> = strings.installSummary({
    installed: installedCount,
    failed: failedCount,
    skipped: alreadyInstalled.length,
  });
  if (!installSummaryMsg.ok) return installSummaryMsg;
  log.print(`{dim}  ${installSummaryMsg.data}{/}`);
  log.print('');
  return ok(VoidSchema, undefined);
}

/**
 * Prints ignore patterns from .formatignore.
 *
 * @param strings - Built locale strings for the format tool.
 * @param cwdOverride - Optional working directory override.
 * @returns `Result<Void>` — success, or an error.
 */
function printIgnorePatterns(strings: BuiltFormatStrings, cwdOverride?: Path): Result<Void> {
  let effectiveCwd: Path;
  if (cwdOverride) {
    effectiveCwd = cwdOverride;
  } else {
    const cwdResult = cwd();
    if (!cwdResult.ok) return cwdResult;
    effectiveCwd = cwdResult.data;
  }
  const pathResult: Result<Str> = joinPath([effectiveCwd, '.formatignore']);
  if (!pathResult.ok) return pathResult;
  const formatIgnorePath: Str = pathResult.data;

  log.print('');

  const existsResult: Result<Bool> = pathExists(formatIgnorePath);
  if (!existsResult.ok) return existsResult;

  if (existsResult.data) {
    const ignoreHeaderMsg: Result<Str> = strings.formatIgnoreHeader();
    if (!ignoreHeaderMsg.ok) return ignoreHeaderMsg;
    log.print(`\n{bold}  {bold}${ignoreHeaderMsg.data}{/} (.formatignore){/}`);
    const contentResult: Result<Str> = readFile(formatIgnorePath);
    if (!contentResult.ok) return contentResult;
    const content: Str = contentResult.data;
    const lines: Str[] = content.split('\n').filter((l: Str) => l.trim() && !l.startsWith('#'));
    for (const line of lines) {
      log.info(`  ${symbols.dash} ${line}`);
    }
  } else {
    const noIgnoreMsg: Result<Str> = strings.noFormatIgnoreFound();
    if (!noIgnoreMsg.ok) return noIgnoreMsg;
    log.print(`{dim}  ${noIgnoreMsg.data}{/}`);
  }

  log.print('');
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Task Function
// =============================================================================

/**
 * Formats a single file.
 * If the file was already processed in a batch, returns the cached result.
 *
 * @param file - Absolute file path to format.
 * @param ctx - Task context with options and locale.
 * @returns `Promise<TaskResult>` — the formatting result.
 */
async function formatFile(
  file: Path,
  ctx: TaskContext<FormatFlags, BuiltFormatStrings>,
): Promise<TaskResult> {
  // Check batch cache first (populated by onFilesDiscovered)
  const cached: OptionalTaskResult = batchResultCache.get(file);
  if (cached) {
    batchResultCache.delete(file);
    return cached;
  }

  const startTimeResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    Date.now(),
  );
  if (!startTimeResult.ok) {
    return {
      file,
      relativePath: file,
      status: 'failed',
      category: null,
      error: startTimeResult.error.message,
      duration: 0,
      output: null,
    };
  }
  const startTime: NonNegativeInteger = startTimeResult.data;

  /** Helper to compute duration from startTime. Falls back to 0 on parse failure. */
  const getDuration = (): NonNegativeInteger => {
    const d: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      Date.now() - startTime,
    );
    return d.ok ? d.data : startTime;
  };

  const relResult: Result<Str> = toRelativePath(file);
  if (!relResult.ok) {
    return {
      file,
      relativePath: file,
      status: 'failed',
      category: null,
      error: relResult.error.message,
      duration: getDuration(),
      output: null,
    };
  }
  const relativePath: Str = relResult.data;

  // Get formatter for this file
  const definitionResult: Result<NullableFormatterDefinition> = getFormatterForFile(file);
  if (!definitionResult.ok) {
    return {
      file,
      relativePath,
      status: 'failed',
      category: null,
      error: definitionResult.error.message,
      duration: getDuration(),
      output: null,
    };
  }
  const definition: NullableFormatterDefinition = definitionResult.data;

  if (!definition) {
    // No formatter for this file type
    return {
      file,
      relativePath,
      status: 'skipped',
      category: null,
      error: null,
      duration: getDuration(),
      output: null,
    };
  }

  // Handle --diff mode
  if (ctx.options.diff) {
    const diffResult: Result<FormatWithDiffResult> = await formatWithDiff(file, definition);
    if (!diffResult.ok) {
      return {
        file,
        relativePath,
        status: 'failed',
        category: definition.name,
        error: diffResult.error.message,
        duration: getDuration(),
        output: null,
      };
    }
    const result: FormatWithDiffResult = diffResult.data;
    const duration: NonNegativeInteger = getDuration();

    if (result.error) {
      return {
        file,
        relativePath,
        status: 'failed',
        category: definition.name,
        error: result.error,
        duration,
        output: null,
      };
    }

    // If already formatted, no diff
    if (result.formatted) {
      return {
        file,
        relativePath,
        status: 'unchanged',
        category: definition.name,
        error: null,
        duration,
        output: null,
      };
    }

    // Has changes - write file if not in check mode
    if (!ctx.options.check && result.content !== null) {
      const writeResult: Result<Void> = writeFile(file, result.content);
      if (!writeResult.ok) {
        return {
          file,
          relativePath,
          status: 'failed',
          category: definition.name,
          error: writeResult.error.message,
          duration: getDuration(),
          output: null,
        };
      }
    }

    return {
      file,
      relativePath,
      status: ctx.options.check ? 'failed' : 'success',
      category: definition.name,
      error: ctx.options.check ? 'File needs formatting' : null,
      duration,
      output: result.diff,
    };
  }

  // Standard format mode
  const formatResult: Result<FormatResult> = await format(file, definition, ctx.options.check);
  if (!formatResult.ok) {
    return {
      file,
      relativePath,
      status: 'failed',
      category: definition.name,
      error: formatResult.error.message,
      duration: getDuration(),
      output: null,
    };
  }
  const result: FormatResult = formatResult.data;
  const duration: NonNegativeInteger = getDuration();

  if (result.error) {
    return {
      file,
      relativePath,
      status: 'failed',
      category: definition.name,
      error: result.error,
      duration,
      output: null,
    };
  }

  // In check mode: formatted=true means already formatted
  if (ctx.options.check) {
    return {
      file,
      relativePath,
      status: result.formatted ? 'unchanged' : 'failed',
      category: definition.name,
      error: result.formatted ? null : 'File needs formatting',
      duration,
      output: null,
    };
  }

  // In write mode: content !== null means file was changed
  return {
    file,
    relativePath,
    status: result.content !== null ? 'success' : 'unchanged',
    category: definition.name,
    error: null,
    duration,
    output: null,
  };
}

// =============================================================================
// Definition
// =============================================================================

/** Default ignore patterns (empty - user controls via .formatignore). */
const defaultIgnore: StrArray = [];

/** Format tool definition. */
const definition: TaskRunnerDefinition<FormatFlags, BuiltFormatStrings> = {
  id: 'format',
  version: '1.0.0',
  runtimes: ['node-tty', 'node-pipe'],

  // File discovery - match all files, let formatter registry filter
  patterns: ['**/*'],
  ignore: defaultIgnore,

  // Tool flag definitions
  flagDefs: TOOL_FLAG_DEFS,

  // Task function
  task: formatFile,

  // Hooks
  onStart: async (ctx: TaskContext<FormatFlags, BuiltFormatStrings>): Promise<Result<Void>> => {
    // Clear batch cache from any previous run
    batchResultCache.clear();

    // Check onboarding requirement
    const onboardResult: Result<Bool> = requireOnboarding();
    if (!onboardResult.ok) return onboardResult;
    if (!onboardResult.data) {
      return err(ERRORS.CONFIG.ONBOARDING_REQUIRED);
    }

    // Handle info modes (print and exit)
    if (ctx.options.listFormatters) {
      const listResult: Result<Void> = printFormatterList(ctx.locale.runner);
      if (!listResult.ok) return listResult;
      exit(DEFAULT_EXIT_CODE);
    }

    if (ctx.options.checkTools) {
      const checkResult: Result<Void> = printToolAvailability(ctx.locale.runner);
      if (!checkResult.ok) return checkResult;
      exit(DEFAULT_EXIT_CODE);
    }

    if (ctx.options.installTools) {
      const installResult: Result<Void> = await installMissingTools(
        ctx.locale.runner,
        ctx.locale.cli,
        ctx.options.progress,
      );
      if (!installResult.ok) return installResult;
      exit(DEFAULT_EXIT_CODE);
    }

    if (ctx.options.listIgnored) {
      const ignoreResult: Result<Void> = printIgnorePatterns(ctx.locale.runner, ctx.options.cwd);
      if (!ignoreResult.ok) return ignoreResult;
      exit(DEFAULT_EXIT_CODE);
    }

    return ok(VoidSchema, undefined);
  },

  onFilesDiscovered: async (
    files: readonly Str[],
    ctx: TaskContext<FormatFlags, BuiltFormatStrings>,
  ): Promise<Void> => {
    // Skip batching in diff mode (uses temp files, inherently per-file)
    if (ctx.options.diff) return;

    // Classify all files by formatter
    const pairs: Array<{ file: Str; formatter: FormatterDefinition }> = [];
    for (const file of files) {
      const filePathResult: Result<Path> = safeParse(PathSchema, file);
      if (!filePathResult.ok) continue;
      const formatterResult: Result<NullableFormatterDefinition> = getFormatterForFile(
        filePathResult.data,
      );
      if (!formatterResult.ok) continue;
      const formatter: NullableFormatterDefinition = formatterResult.data;
      if (formatter) {
        pairs.push({ file, formatter });
      }
    }

    // Create batches (groups batchable files, returns unbatched separately)
    const batchesResult: ReturnType<typeof createBatches> = createBatches(
      pairs,
      ctx.options.check,
      false,
    );
    if (!batchesResult.ok) return;
    const { batches } = batchesResult.data;

    // Execute all batches and cache results
    for (const batch of batches) {
      const batchResult: Result<Map<Str, TaskResult>> = await executeBatch(batch);
      if (!batchResult.ok) continue;
      for (const [file, result] of batchResult.data) {
        batchResultCache.set(file, result);
      }
    }
  },
};

// =============================================================================
// Export & Run
// =============================================================================

/** Runner instance for tool dispatcher. */
export const runner = createRunner({ definition });

// Run directly if executed as a script
const scriptPathResult: Result<OptionalStr> = getScriptPath();
if (
  scriptPathResult.ok &&
  scriptPathResult.data &&
  import.meta.url === `file://${scriptPathResult.data}`
) {
  runner.run().then((exitCode) => {
    const exitCodeResult: Result<ExitCode> = safeParse(ExitCodeSchema, exitCode);
    exit(exitCodeResult.ok ? exitCodeResult.data : DEFAULT_EXIT_CODE);
  });
}
