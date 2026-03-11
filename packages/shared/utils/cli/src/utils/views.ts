/**
 * Runner Views
 *
 * Format-aware composable display functions for the task runner.
 * Extracted from `runner.ts` to separate display logic from execution logic.
 *
 * All functions:
 * - Check `isMachineReadable()` / `getOutputFormat()` internally
 * - Use `{tag}...{/}` markup in `log.*` calls, `style.*` for string building
 * - Return `Result<T>` with complete JSDoc
 *
 * @module
 */

import type { BuiltCliStrings } from '@/cli/locale/schema';
import {
  RunOutputSchema,
  RunSummarySchema,
  TaskResultSchema,
  type RunOutput,
  type RunSummary,
  type TaskResult,
} from '@/cli/schemas';
import {
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type NonNegativeInteger,
  type NonNegativeNumber,
  type PositiveInteger,
  type Str,
  type NullableRegExpMatchArray,
  type Void,
} from '@/schemas/common';
import { type Result, ok, okUnchecked } from '@/schemas/result/result';
import { escapeXml, formatDuration } from '@/utils/core/format';
import { toRelativePath } from '@/utils/core/path';
import { padRight } from '@/utils/core/string';
import { getTerminalWidth, log, style, symbols } from '@/utils/core/terminal';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Progress Counter
// =============================================================================

/**
 * Formats a progress counter like `[3/42]` with dim styling.
 *
 * @param current - Current count.
 * @param total - Total count.
 * @returns `Result<Str>` — formatted counter string, or a validation error.
 */
export function formatCounter(current: NonNegativeInteger, total: NonNegativeInteger): Result<Str> {
  const currentResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, current);
  if (!currentResult.ok) return currentResult;
  const totalResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, total);
  if (!totalResult.ok) return totalResult;
  const totalStr: Str = String(totalResult.data);
  const currentStr: Str = String(currentResult.data).padStart(totalStr.length, ' ');
  return style.dim(`[${currentStr}/${totalStr}]`);
}

// =============================================================================
// Diff View
// =============================================================================

/**
 * Prints a unified diff with syntax highlighting.
 *
 * Uses `log.print` — silent for machine-readable formats.
 *
 * @param diff - The diff content to display.
 * @returns `Result<Void>` — void on success, or a validation error.
 */
export function printDiff(diff: Str): Result<Void> {
  const diffResult: Result<Str> = safeParse(StrSchema, diff);
  if (!diffResult.ok) return diffResult;

  const lines: Str[] = diffResult.data.split('\n');

  for (const line of lines) {
    if (line.startsWith('+++') || line.startsWith('---')) {
      log.print(`{dim}{bold}${line}{/}{/}`);
    } else if (line.startsWith('@@')) {
      log.print(`{cyan}${line}{/}`);
    } else if (line.startsWith('+')) {
      log.print(`{green}${line}{/}`);
    } else if (line.startsWith('-')) {
      log.print(`{red}${line}{/}`);
    } else {
      log.print(`{dim}${line}{/}`);
    }
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Task Result View
// =============================================================================

/**
 * Prints a single task result line with status icon, path, and category.
 *
 * Uses `log.print` — silent for machine-readable formats.
 *
 * @param result - Task result to display.
 * @param current - Current index (1-based).
 * @param total - Total tasks.
 * @param showUnchanged - Whether to show unchanged files.
 * @param showOutput - Whether to show output/diff content.
 * @param strings - CLI strings for i18n.
 * @returns `Result<Void>` — void on success, or a validation error.
 */
export function printTaskResult(
  result: TaskResult,
  current?: NonNegativeInteger,
  total?: NonNegativeInteger,
  showUnchanged: Bool = false,
  showOutput: Bool = false,
  strings: BuiltCliStrings,
): Result<Void> {
  const resultValidation: Result<TaskResult> = safeParse(TaskResultSchema, result);
  if (!resultValidation.ok) return resultValidation;

  let counter: Str = '';
  if (current !== undefined && total !== undefined) {
    const counterResult: Result<Str> = formatCounter(current, total);
    if (!counterResult.ok) return counterResult;
    counter = `${counterResult.data} `;
  }

  const terminalWidthResult: Result<PositiveInteger> = getTerminalWidth();
  if (!terminalWidthResult.ok) return terminalWidthResult;
  const terminalWidth: PositiveInteger = terminalWidthResult.data;
  const pathWidthResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    Math.min(50, terminalWidth - 30),
  );
  if (!pathWidthResult.ok) return pathWidthResult;
  const pathWidth: NonNegativeInteger = pathWidthResult.data;
  const paddedPathResult: Result<Str> = padRight(resultValidation.data.relativePath, pathWidth);
  if (!paddedPathResult.ok) return paddedPathResult;
  const paddedPath: Str = paddedPathResult.data;
  const categoryCellResult: Result<Str> = resultValidation.data.category
    ? padRight(resultValidation.data.category, 12)
    : padRight('', 12);
  if (!categoryCellResult.ok) return categoryCellResult;
  const categoryCell: Str = categoryCellResult.data;

  // Build category string with magenta styling
  let categoryStr: Str;
  if (resultValidation.data.category) {
    const magentaResult: Result<Str> = style.magenta(categoryCell);
    if (!magentaResult.ok) return magentaResult;
    categoryStr = magentaResult.data;
  } else {
    categoryStr = categoryCell;
  }

  // Get skipped label from strings
  const skippedStatusResult: Result<Str> = strings.output.skippedStatus();
  if (!skippedStatusResult.ok) return skippedStatusResult;
  const skippedLabel: Str = skippedStatusResult.data;

  // Build status-specific styled strings
  const greenSuccess: Result<Str> = style.green(symbols.success);
  if (!greenSuccess.ok) return greenSuccess;
  const greenSuccessStr: Str = greenSuccess.data;
  const redError: Result<Str> = style.red(symbols.error);
  if (!redError.ok) return redError;
  const redErrorStr: Str = redError.data;
  const dimDash: Result<Str> = style.dim(symbols.dash);
  if (!dimDash.ok) return dimDash;
  const dimDashStr: Str = dimDash.data;
  const dimEllipsis: Result<Str> = style.dim(symbols.ellipsis);
  if (!dimEllipsis.ok) return dimEllipsis;
  const dimEllipsisStr: Str = dimEllipsis.data;
  const dimArrow: Result<Str> = style.dim(symbols.arrow);
  if (!dimArrow.ok) return dimArrow;
  const dimArrowStr: Str = dimArrow.data;

  // Build path strings
  const cyanPath: Result<Str> = style.cyan(paddedPath);
  if (!cyanPath.ok) return cyanPath;
  const cyanPathStr: Str = cyanPath.data;
  const dimPath: Result<Str> = style.dim(paddedPath);
  if (!dimPath.ok) return dimPath;
  const dimPathStr: Str = dimPath.data;

  switch (resultValidation.data.status) {
    case 'success':
      log.print(`${counter}${cyanPathStr} ${categoryStr} ${greenSuccessStr}`);
      break;

    case 'unchanged':
      if (showUnchanged) {
        const unchangedCatStr: Str = resultValidation.data.category ?? '';
        const unchangedCatPadResult: Result<Str> = padRight(unchangedCatStr, 12);
        if (!unchangedCatPadResult.ok) return unchangedCatPadResult;
        const unchangedCatPad: Str = unchangedCatPadResult.data;
        const dimCatPad: Result<Str> = style.dim(unchangedCatPad);
        if (!dimCatPad.ok) return dimCatPad;
        const dimCatPadStr: Str = dimCatPad.data;
        log.print(`${counter}${dimPathStr} ${dimCatPadStr} ${dimDashStr}`);
      }
      break;

    case 'failed':
      log.print(`${counter}${cyanPathStr} ${categoryStr} ${redErrorStr}`);
      if (resultValidation.data.error) {
        const redErr: Result<Str> = style.red(resultValidation.data.error);
        if (!redErr.ok) return redErr;
        const redErrStr: Str = redErr.data;
        log.print(`     ${dimArrowStr} ${redErrStr}`);
      }
      break;

    case 'skipped':
      if (showUnchanged) {
        const skippedPadResult: Result<Str> = padRight(skippedLabel, 12);
        if (!skippedPadResult.ok) return skippedPadResult;
        const skippedPad: Str = skippedPadResult.data;
        const dimSkippedPad: Result<Str> = style.dim(skippedPad);
        if (!dimSkippedPad.ok) return dimSkippedPad;
        const dimSkippedPadStr: Str = dimSkippedPad.data;
        log.print(`${counter}${dimPathStr} ${dimSkippedPadStr} ${dimEllipsisStr}`);
      }
      break;
  }

  // Show output/diff if present and enabled
  if (showOutput && resultValidation.data.output) {
    log.print('');
    printDiff(resultValidation.data.output);
    log.print('');
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Compact Format
// =============================================================================

/**
 * Formats a single result in compact format (one line per file).
 *
 * @param result - Task result to format.
 * @returns `Result<Str>` — compact format string, or a validation error.
 */
export function formatCompact(result: TaskResult): Result<Str> {
  const resultValidation: Result<TaskResult> = safeParse(TaskResultSchema, result);
  if (!resultValidation.ok) return resultValidation;

  const status: Str =
    resultValidation.data.status === 'success'
      ? 'OK'
      : resultValidation.data.status === 'failed'
        ? 'FAIL'
        : 'SKIP';

  const error: Str = resultValidation.data.error ? ` - ${resultValidation.data.error}` : '';

  return ok(StrSchema, `${status}\t${resultValidation.data.relativePath}${error}`);
}

/**
 * Prints results in compact format (one line per file).
 *
 * @param results - All task results.
 * @returns `Result<Void>` — void on success, or a validation error.
 */
export function printCompactResults(results: TaskResult[]): Result<Void> {
  for (const result of results) {
    const compactResult: Result<Str> = formatCompact(result);
    if (!compactResult.ok) return compactResult;
    log.raw(compactResult.data);
  }
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Grouped Results View
// =============================================================================

/**
 * Prints results grouped by category with per-group summary.
 *
 * Uses `log.print` — silent for machine-readable formats.
 *
 * @param results - All task results.
 * @param strings - CLI strings for i18n.
 * @returns `Result<Void>` — void on success, or a validation error.
 */
export function printGroupedResults(results: TaskResult[], strings: BuiltCliStrings): Result<Void> {
  const otherCategoryResult: Result<Str> = strings.misc.otherCategory();
  if (!otherCategoryResult.ok) return otherCategoryResult;
  const otherCategory: Str = otherCategoryResult.data;

  // Group by category
  const groups: Map<Str, TaskResult[]> = new Map();
  for (const result of results) {
    const category: Str = result.category ?? otherCategory;
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    const group = groups.get(category);
    if (group) group.push(result);
  }

  // Pre-build styled symbols
  const greenSuccess: Result<Str> = style.green(symbols.success);
  if (!greenSuccess.ok) return greenSuccess;
  const greenSuccessStr: Str = greenSuccess.data;
  const redError: Result<Str> = style.red(symbols.error);
  if (!redError.ok) return redError;
  const redErrorStr: Str = redError.data;
  const dimDash: Result<Str> = style.dim(symbols.dash);
  if (!dimDash.ok) return dimDash;
  const dimDashStr: Str = dimDash.data;
  const dimEllipsis: Result<Str> = style.dim(symbols.ellipsis);
  if (!dimEllipsis.ok) return dimEllipsis;
  const dimEllipsisStr: Str = dimEllipsis.data;
  const dimArrow: Result<Str> = style.dim(symbols.arrow);
  if (!dimArrow.ok) return dimArrow;
  const dimArrowStr: Str = dimArrow.data;
  const dimSep: Result<Str> = style.dim(' · ');
  if (!dimSep.ok) return dimSep;
  const dimSepStr: Str = dimSep.data;

  // Print each group
  for (const [category, items] of groups) {
    const successCountResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      items.filter((r: TaskResult) => r.status === 'success').length,
    );
    if (!successCountResult.ok) return successCountResult;
    const success: NonNegativeInteger = successCountResult.data;
    const failedCountResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      items.filter((r: TaskResult) => r.status === 'failed').length,
    );
    if (!failedCountResult.ok) return failedCountResult;
    const failed: NonNegativeInteger = failedCountResult.data;
    const unchangedCountResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      items.filter((r: TaskResult) => r.status === 'unchanged').length,
    );
    if (!unchangedCountResult.ok) return unchangedCountResult;
    const unchanged: NonNegativeInteger = unchangedCountResult.data;

    const filesCountResult: Result<Str> = strings.misc.filesCount({ count: items.length });
    if (!filesCountResult.ok) return filesCountResult;
    const filesCountText: Str = filesCountResult.data;

    // Category header
    const magentaCat: Result<Str> = style.magenta(category);
    if (!magentaCat.ok) return magentaCat;
    const magentaCatStr: Str = magentaCat.data;
    const boldCat: Result<Str> = style.bold(magentaCatStr);
    if (!boldCat.ok) return boldCat;
    const boldCatStr: Str = boldCat.data;
    const dimFiles: Result<Str> = style.dim(filesCountText);
    if (!dimFiles.ok) return dimFiles;
    const dimFilesStr: Str = dimFiles.data;
    log.print('');
    log.print(`${boldCatStr} ${dimFilesStr}`);

    for (const result of items) {
      switch (result.status) {
        case 'success':
          log.print(`  ${greenSuccessStr} ${result.relativePath}`);
          break;
        case 'unchanged': {
          const dimRelPath: Result<Str> = style.dim(result.relativePath);
          if (!dimRelPath.ok) return dimRelPath;
          const dimRelPathStr: Str = dimRelPath.data;
          log.print(`  ${dimDashStr} ${dimRelPathStr}`);
          break;
        }
        case 'failed':
          log.print(`  ${redErrorStr} ${result.relativePath}`);
          if (result.error) {
            const redErr: Result<Str> = style.red(result.error);
            if (!redErr.ok) return redErr;
            const redErrStr: Str = redErr.data;
            log.print(`    ${dimArrowStr} ${redErrStr}`);
          }
          break;
        case 'skipped': {
          const dimSkipPath: Result<Str> = style.dim(result.relativePath);
          if (!dimSkipPath.ok) return dimSkipPath;
          const dimSkipPathStr: Str = dimSkipPath.data;
          log.print(`  ${dimEllipsisStr} ${dimSkipPathStr}`);
          break;
        }
      }
    }

    // Group summary
    const parts: Str[] = [];
    if (success > 0) {
      const successCountResult: Result<Str> = strings.output.successCount({ count: success });
      if (!successCountResult.ok) return successCountResult;
      const successCountText: Str = successCountResult.data;
      const greenCount: Result<Str> = style.green(successCountText);
      if (!greenCount.ok) return greenCount;
      parts.push(greenCount.data);
    }
    if (unchanged > 0) {
      const unchangedCountResult: Result<Str> = strings.output.unchangedCount({ count: unchanged });
      if (!unchangedCountResult.ok) return unchangedCountResult;
      const unchangedCountText: Str = unchangedCountResult.data;
      const dimCount: Result<Str> = style.dim(unchangedCountText);
      if (!dimCount.ok) return dimCount;
      parts.push(dimCount.data);
    }
    if (failed > 0) {
      const failedCountResult: Result<Str> = strings.output.failedCount({ count: failed });
      if (!failedCountResult.ok) return failedCountResult;
      const failedCountText: Str = failedCountResult.data;
      const redCount: Result<Str> = style.red(failedCountText);
      if (!redCount.ok) return redCount;
      parts.push(redCount.data);
    }
    if (parts.length > 0) {
      log.print(`  ${dimArrowStr} ${parts.join(dimSepStr)}`);
    }
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Summary View
// =============================================================================

/**
 * Prints execution summary with statistics, timing, and optional category breakdown.
 *
 * Uses `log.print` — silent for machine-readable formats.
 *
 * @param summary - Run summary statistics.
 * @param results - All task results (for category breakdown).
 * @param verbose - Show detailed timing statistics.
 * @param strings - CLI strings for i18n.
 * @returns `Result<Void>` — void on success, or a validation error.
 */
export function printSummary(
  summary: RunSummary,
  results?: TaskResult[],
  verbose: Bool = false,
  strings: BuiltCliStrings,
): Result<Void> {
  const summaryValidation: Result<RunSummary> = safeParse(RunSummarySchema, summary);
  if (!summaryValidation.ok) return summaryValidation;

  // Get localized strings
  const statsHeaderResult: Result<Str> = strings.output.statisticsHeader();
  if (!statsHeaderResult.ok) return statsHeaderResult;
  const statsHeader: Str = statsHeaderResult.data;
  const totalFilesLabelResult: Result<Str> = strings.output.totalFiles();
  if (!totalFilesLabelResult.ok) return totalFilesLabelResult;
  const totalFilesLabel: Str = totalFilesLabelResult.data;
  const processedLabelResult: Result<Str> = strings.output.processed();
  if (!processedLabelResult.ok) return processedLabelResult;
  const processedLabel: Str = processedLabelResult.data;
  const successLabelResult: Result<Str> = strings.output.successLabel();
  if (!successLabelResult.ok) return successLabelResult;
  const successLabel: Str = successLabelResult.data;
  const unchangedLabelResult: Result<Str> = strings.output.unchangedLabel();
  if (!unchangedLabelResult.ok) return unchangedLabelResult;
  const unchangedLabel: Str = unchangedLabelResult.data;
  const failedLabelResult: Result<Str> = strings.output.failedLabel();
  if (!failedLabelResult.ok) return failedLabelResult;
  const failedLabel: Str = failedLabelResult.data;
  const skippedLabelResult: Result<Str> = strings.output.skippedLabel();
  if (!skippedLabelResult.ok) return skippedLabelResult;
  const skippedLabel: Str = skippedLabelResult.data;
  const timingHeaderResult: Result<Str> = strings.output.timingHeader();
  if (!timingHeaderResult.ok) return timingHeaderResult;
  const timingHeader: Str = timingHeaderResult.data;
  const totalLabelResult: Result<Str> = strings.output.totalLabel();
  if (!totalLabelResult.ok) return totalLabelResult;
  const totalLabel: Str = totalLabelResult.data;
  const avgPerFileLabelResult: Result<Str> = strings.output.avgPerFile();
  if (!avgPerFileLabelResult.ok) return avgPerFileLabelResult;
  const avgPerFileLabel: Str = avgPerFileLabelResult.data;
  const slowestLabelResult: Result<Str> = strings.output.slowestLabel();
  if (!slowestLabelResult.ok) return slowestLabelResult;
  const slowestLabel: Str = slowestLabelResult.data;
  const fastestLabelResult: Result<Str> = strings.output.fastestLabel();
  if (!fastestLabelResult.ok) return fastestLabelResult;
  const fastestLabel: Str = fastestLabelResult.data;
  const byCategoryHeaderResult: Result<Str> = strings.output.byCategoryHeader();
  if (!byCategoryHeaderResult.ok) return byCategoryHeaderResult;
  const byCategoryHeader: Str = byCategoryHeaderResult.data;
  const allUpToDateResult: Result<Str> = strings.output.allUpToDate();
  if (!allUpToDateResult.ok) return allUpToDateResult;
  const allUpToDate: Str = allUpToDateResult.data;
  const otherCategoryResult: Result<Str> = strings.misc.otherCategory();
  if (!otherCategoryResult.ok) return otherCategoryResult;
  const otherCategory: Str = otherCategoryResult.data;

  const terminalWidthResult: Result<PositiveInteger> = getTerminalWidth();
  if (!terminalWidthResult.ok) return terminalWidthResult;
  const terminalWidth: PositiveInteger = terminalWidthResult.data;
  const widthResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    Math.min(60, terminalWidth - 4),
  );
  if (!widthResult.ok) return widthResult;
  const width: NonNegativeInteger = widthResult.data;

  // Helper to pad labels to width 17
  const pad17 = (s: Str): Result<Str> => padRight(s, 17);

  // Separator
  const dimSep: Result<Str> = style.dim('─'.repeat(width));
  if (!dimSep.ok) return dimSep;
  const dimSepStr: Str = dimSep.data;

  log.print('');
  log.print(dimSepStr);
  log.print('');

  // Pre-build styled symbols
  const greenSuccess: Result<Str> = style.green(symbols.success);
  if (!greenSuccess.ok) return greenSuccess;
  const greenSuccessStr: Str = greenSuccess.data;
  const redError: Result<Str> = style.red(symbols.error);
  if (!redError.ok) return redError;
  const redErrorStr: Str = redError.data;

  // Main result line
  if (summaryValidation.data.failed > 0) {
    const filesFailedResult: Result<Str> = strings.output.filesFailed({
      count: summaryValidation.data.failed,
    });
    if (!filesFailedResult.ok) return filesFailedResult;
    const filesFailedText: Str = filesFailedResult.data;
    const boldFailed: Result<Str> = style.bold(filesFailedText);
    if (!boldFailed.ok) return boldFailed;
    const boldFailedStr: Str = boldFailed.data;
    log.print(`${redErrorStr} ${boldFailedStr}`);
  } else if (summaryValidation.data.success > 0) {
    const filesProcessedResult: Result<Str> = strings.output.filesProcessed({
      count: summaryValidation.data.success,
    });
    if (!filesProcessedResult.ok) return filesProcessedResult;
    const filesProcessedText: Str = filesProcessedResult.data;
    const boldProcessed: Result<Str> = style.bold(filesProcessedText);
    if (!boldProcessed.ok) return boldProcessed;
    const boldProcessedStr: Str = boldProcessed.data;
    log.print(`${greenSuccessStr} ${boldProcessedStr}`);
  } else {
    const boldUpToDate: Result<Str> = style.bold(allUpToDate);
    if (!boldUpToDate.ok) return boldUpToDate;
    const boldUpToDateStr: Str = boldUpToDate.data;
    log.print(`${greenSuccessStr} ${boldUpToDateStr}`);
  }

  // Statistics section
  const successStr: Str = String(summaryValidation.data.success);
  const failedStr: Str = String(summaryValidation.data.failed);
  const boldStats: Result<Str> = style.bold(statsHeader);
  if (!boldStats.ok) return boldStats;
  const boldStatsStr: Str = boldStats.data;
  const greenSuccessCount: Result<Str> = style.green(successStr);
  if (!greenSuccessCount.ok) return greenSuccessCount;
  const greenSuccessCountStr: Str = greenSuccessCount.data;

  const totalFilesPad: Result<Str> = pad17(totalFilesLabel);
  if (!totalFilesPad.ok) return totalFilesPad;
  const processedPad: Result<Str> = pad17(processedLabel);
  if (!processedPad.ok) return processedPad;
  const successPad: Result<Str> = pad17(successLabel);
  if (!successPad.ok) return successPad;
  const unchangedPad: Result<Str> = pad17(unchangedLabel);
  if (!unchangedPad.ok) return unchangedPad;
  const failedPad: Result<Str> = pad17(failedLabel);
  if (!failedPad.ok) return failedPad;
  const skippedPad: Result<Str> = pad17(skippedLabel);
  if (!skippedPad.ok) return skippedPad;

  log.print('');
  log.print(`  ${boldStatsStr}`);
  log.print(`  ${symbols.tree} ${totalFilesPad.data} ${summaryValidation.data.total}`);
  log.print(`  ${symbols.tree} ${processedPad.data} ${summaryValidation.data.processed}`);
  log.print(`  ${symbols.tree} ${successPad.data} ${greenSuccessCountStr}`);
  log.print(`  ${symbols.tree} ${unchangedPad.data} ${summaryValidation.data.unchanged}`);

  if (summaryValidation.data.failed > 0) {
    const redFailedCount: Result<Str> = style.red(failedStr);
    if (!redFailedCount.ok) return redFailedCount;
    const redFailedCountStr: Str = redFailedCount.data;
    log.print(`  ${symbols.tree} ${failedPad.data} ${redFailedCountStr}`);
  } else {
    log.print(`  ${symbols.tree} ${failedPad.data} ${failedStr}`);
  }
  log.print(`  ${symbols.treeLast} ${skippedPad.data} ${summaryValidation.data.skipped}`);

  // Timing section
  const totalDurationFmt: Result<Str> = formatDuration(summaryValidation.data.duration);
  if (!totalDurationFmt.ok) return totalDurationFmt;
  const totalDurationStr: Str = totalDurationFmt.data;
  const boldTiming: Result<Str> = style.bold(timingHeader);
  if (!boldTiming.ok) return boldTiming;
  const boldTimingStr: Str = boldTiming.data;

  const totalPad: Result<Str> = pad17(totalLabel);
  if (!totalPad.ok) return totalPad;

  log.print('');
  log.print(`  ${boldTimingStr}`);
  log.print(`  ${symbols.tree} ${totalPad.data} ${totalDurationStr}`);

  if (summaryValidation.data.processed > 0) {
    const avgDurationFmt: Result<Str> = formatDuration(summaryValidation.data.avgDuration);
    if (!avgDurationFmt.ok) return avgDurationFmt;
    const avgDurationStr: Str = avgDurationFmt.data;
    const avgPerFilePad: Result<Str> = pad17(avgPerFileLabel);
    if (!avgPerFilePad.ok) return avgPerFilePad;
    log.print(`  ${symbols.tree} ${avgPerFilePad.data} ${avgDurationStr}`);
  }

  if (summaryValidation.data.slowest) {
    const relResultSlowest: Result<Str> = toRelativePath(summaryValidation.data.slowest.file);
    if (!relResultSlowest.ok) return relResultSlowest;
    const relPathSlowest: Str = relResultSlowest.data;
    const slowestDurationFmt: Result<Str> = formatDuration(summaryValidation.data.slowest.duration);
    if (!slowestDurationFmt.ok) return slowestDurationFmt;
    const slowestDurationStr: Str = slowestDurationFmt.data;
    const dimSlowestDuration: Result<Str> = style.dim(`(${slowestDurationStr})`);
    if (!dimSlowestDuration.ok) return dimSlowestDuration;
    const dimSlowestDurationStr: Str = dimSlowestDuration.data;
    const slowestPad: Result<Str> = pad17(slowestLabel);
    if (!slowestPad.ok) return slowestPad;
    log.print(`  ${symbols.tree} ${slowestPad.data} ${relPathSlowest} ${dimSlowestDurationStr}`);
  }

  if (summaryValidation.data.fastest && verbose) {
    const relResultFastest: Result<Str> = toRelativePath(summaryValidation.data.fastest.file);
    if (!relResultFastest.ok) return relResultFastest;
    const relPathFastest: Str = relResultFastest.data;
    const fastestDurationFmt: Result<Str> = formatDuration(summaryValidation.data.fastest.duration);
    if (!fastestDurationFmt.ok) return fastestDurationFmt;
    const fastestDurationStr: Str = fastestDurationFmt.data;
    const dimFastestDuration: Result<Str> = style.dim(`(${fastestDurationStr})`);
    if (!dimFastestDuration.ok) return dimFastestDuration;
    const dimFastestDurationStr: Str = dimFastestDuration.data;
    const fastestPad: Result<Str> = pad17(fastestLabel);
    if (!fastestPad.ok) return fastestPad;
    log.print(
      `  ${symbols.treeLast} ${fastestPad.data} ${relPathFastest} ${dimFastestDurationStr}`,
    );
  }

  // Category breakdown (if results provided and verbose)
  if (results && results.length > 0 && verbose) {
    const categoryStats: Map<Str, { count: NonNegativeInteger; duration: NonNegativeInteger }> =
      new Map();

    for (const result of results) {
      if (result.status === 'skipped') continue;

      const category: Str = result.category ?? otherCategory;
      const existingDefault: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
      if (!existingDefault.ok) return existingDefault;
      const existing: { count: NonNegativeInteger; duration: NonNegativeInteger } =
        categoryStats.get(category) ?? {
          count: existingDefault.data,
          duration: existingDefault.data,
        };
      const newCount: Result<NonNegativeInteger> = safeParse(
        NonNegativeIntegerSchema,
        existing.count + 1,
      );
      if (!newCount.ok) return newCount;
      const newDuration: Result<NonNegativeInteger> = safeParse(
        NonNegativeIntegerSchema,
        existing.duration + result.duration,
      );
      if (!newDuration.ok) return newDuration;
      categoryStats.set(category, {
        count: newCount.data,
        duration: newDuration.data,
      });
    }

    if (categoryStats.size > 1) {
      const boldByCat: Result<Str> = style.bold(byCategoryHeader);
      if (!boldByCat.ok) return boldByCat;
      const boldByCatStr: Str = boldByCat.data;

      log.print('');
      log.print(`  ${boldByCatStr}`);

      const entries: [Str, { count: NonNegativeInteger; duration: NonNegativeInteger }][] =
        Array.from(categoryStats.entries());
      for (let index = 0; index < entries.length; index++) {
        const [category, stats] = entries[index];
        const isLast: Bool = index === entries.length - 1;
        const prefix: Str = isLast ? symbols.treeLast : symbols.tree;
        const avgMsResult: Result<NonNegativeNumber> = safeParse(
          NonNegativeNumberSchema,
          stats.count > 0 ? stats.duration / stats.count : 0,
        );
        if (!avgMsResult.ok) return avgMsResult;
        const avgMs: NonNegativeNumber = avgMsResult.data;
        const summaryCatPadResult: Result<Str> = padRight(category, 20);
        if (!summaryCatPadResult.ok) return summaryCatPadResult;
        const summaryCatPad: Str = summaryCatPadResult.data;
        const magentaCat: Result<Str> = style.magenta(summaryCatPad);
        if (!magentaCat.ok) return magentaCat;
        const magentaCatStr: Str = magentaCat.data;
        const catAvgFmt: Result<Str> = formatDuration(avgMs);
        if (!catAvgFmt.ok) return catAvgFmt;
        const catAvgStr: Str = catAvgFmt.data;
        const dimAvg: Result<Str> = style.dim(`(avg: ${catAvgStr})`);
        if (!dimAvg.ok) return dimAvg;
        const dimAvgStr: Str = dimAvg.data;
        log.print(`  ${prefix} ${magentaCatStr} ${stats.count} files ${dimAvgStr}`);
      }
    }
  }

  log.print('');

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Detailed Statistics View
// =============================================================================

/**
 * Prints detailed statistics about the run (by extension, by formatter, timing).
 *
 * Uses `log.*` — silent for machine-readable formats.
 *
 * @param results - Task results.
 * @param totalDuration - Total wall-clock duration in milliseconds.
 * @param strings - CLI strings for i18n.
 * @returns `Result<Void>` — void on success, or a validation error.
 */
export function printDetailedStats(
  results: TaskResult[],
  totalDuration: NonNegativeInteger,
  strings: BuiltCliStrings,
): Result<Void> {
  const durationResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    totalDuration,
  );
  if (!durationResult.ok) return durationResult;

  const otherCategoryResult: Result<Str> = strings.misc.otherCategory();
  if (!otherCategoryResult.ok) return otherCategoryResult;
  const otherCategory: Str = otherCategoryResult.data;

  // Group by extension
  const byExtension: Map<
    Str,
    {
      count: NonNegativeInteger;
      duration: NonNegativeInteger;
      statuses: Record<Str, NonNegativeInteger>;
    }
  > = new Map();
  // Group by category (formatter)
  const byCategory: Map<
    Str,
    {
      count: NonNegativeInteger;
      duration: NonNegativeInteger;
      statuses: Record<Str, NonNegativeInteger>;
    }
  > = new Map();

  const zeroResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
  if (!zeroResult.ok) return zeroResult;

  for (const result of results) {
    if (result.status === 'skipped') continue;

    const extMatch: NullableRegExpMatchArray = result.relativePath.match(/\.[^.]+$/);
    const ext: Str = extMatch ? extMatch[0] : '(no ext)';

    const extStats: {
      count: NonNegativeInteger;
      duration: NonNegativeInteger;
      statuses: Record<Str, NonNegativeInteger>;
    } = byExtension.get(ext) ?? { count: zeroResult.data, duration: zeroResult.data, statuses: {} };
    const extCountResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      extStats.count + 1,
    );
    if (!extCountResult.ok) return extCountResult;
    extStats.count = extCountResult.data;
    const extDurationResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      extStats.duration + result.duration,
    );
    if (!extDurationResult.ok) return extDurationResult;
    extStats.duration = extDurationResult.data;
    const extStatusResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      (extStats.statuses[result.status] ?? 0) + 1,
    );
    if (!extStatusResult.ok) return extStatusResult;
    extStats.statuses[result.status] = extStatusResult.data;
    byExtension.set(ext, extStats);

    const category: Str = result.category ?? otherCategory;
    const catStats: {
      count: NonNegativeInteger;
      duration: NonNegativeInteger;
      statuses: Record<Str, NonNegativeInteger>;
    } = byCategory.get(category) ?? {
      count: zeroResult.data,
      duration: zeroResult.data,
      statuses: {},
    };
    const catCountResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      catStats.count + 1,
    );
    if (!catCountResult.ok) return catCountResult;
    catStats.count = catCountResult.data;
    const catDurationResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      catStats.duration + result.duration,
    );
    if (!catDurationResult.ok) return catDurationResult;
    catStats.duration = catDurationResult.data;
    const catStatusResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      (catStats.statuses[result.status] ?? 0) + 1,
    );
    if (!catStatusResult.ok) return catStatusResult;
    catStats.statuses[result.status] = catStatusResult.data;
    byCategory.set(category, catStats);
  }

  // Pre-build dim separator
  const dimSep: Result<Str> = style.dim(' · ');
  if (!dimSep.ok) return dimSep;
  const dimSepStr: Str = dimSep.data;

  log.print('');
  const detailedStatsHeaderResult: Result<Str> = strings.runner.detailedStatsHeader();
  if (!detailedStatsHeaderResult.ok) return detailedStatsHeaderResult;
  const detailedStatsHeader: Str = detailedStatsHeaderResult.data;
  const boldHeader: Result<Str> = style.bold(detailedStatsHeader);
  if (!boldHeader.ok) return boldHeader;
  const boldHeaderStr: Str = boldHeader.data;
  log.print('\n{bold}' + `  ${boldHeaderStr}` + '{/}');

  // By extension
  if (byExtension.size > 0) {
    log.print('');
    const byExtensionHeaderResult: Result<Str> = strings.runner.byExtensionHeader();
    if (!byExtensionHeaderResult.ok) return byExtensionHeaderResult;
    const byExtensionHeader: Str = byExtensionHeaderResult.data;
    const boldExtHeader: Result<Str> = style.bold(byExtensionHeader);
    if (!boldExtHeader.ok) return boldExtHeader;
    const boldExtHeaderStr: Str = boldExtHeader.data;
    log.info(boldExtHeaderStr);

    const sortedExt: [
      Str,
      {
        count: NonNegativeInteger;
        duration: NonNegativeInteger;
        statuses: Record<Str, NonNegativeInteger>;
      },
    ][] = Array.from(byExtension.entries()).sort((a, b) => b[1].count - a[1].count);

    for (const [ext, stats] of sortedExt.slice(0, 15)) {
      const avgMsExtResult: Result<NonNegativeNumber> = safeParse(
        NonNegativeNumberSchema,
        stats.count > 0 ? stats.duration / stats.count : 0,
      );
      if (!avgMsExtResult.ok) return avgMsExtResult;
      const avgMs: NonNegativeNumber = avgMsExtResult.data;
      const statusParts: Str[] = [];

      if (stats.statuses.success) {
        const okText: Str = `${stats.statuses.success} ok`;
        const greenOk: Result<Str> = style.green(okText);
        if (!greenOk.ok) return greenOk;
        statusParts.push(greenOk.data);
      }
      if (stats.statuses.unchanged) {
        const unchangedText: Str = `${stats.statuses.unchanged} unchanged`;
        const dimUnchanged: Result<Str> = style.dim(unchangedText);
        if (!dimUnchanged.ok) return dimUnchanged;
        statusParts.push(dimUnchanged.data);
      }
      if (stats.statuses.failed) {
        const failedText: Str = `${stats.statuses.failed} failed`;
        const redFailed: Result<Str> = style.red(failedText);
        if (!redFailed.ok) return redFailed;
        statusParts.push(redFailed.data);
      }

      const extPadResult: Result<Str> = padRight(ext, 12);
      if (!extPadResult.ok) return extPadResult;
      const extPad: Str = extPadResult.data;
      const countStr: Str = String(stats.count);
      const countPadResult: Result<Str> = padRight(countStr, 5);
      if (!countPadResult.ok) return countPadResult;
      const countPad: Str = countPadResult.data;
      const durationFmtResult: Result<Str> = formatDuration(stats.duration);
      if (!durationFmtResult.ok) return durationFmtResult;
      const durationStr: Str = durationFmtResult.data;
      const durationPadResult: Result<Str> = padRight(durationStr, 10);
      if (!durationPadResult.ok) return durationPadResult;
      const durationPad: Str = durationPadResult.data;
      const avgFmtResult: Result<Str> = formatDuration(avgMs);
      if (!avgFmtResult.ok) return avgFmtResult;
      const avgStr: Str = avgFmtResult.data;
      log.info(
        `  ${extPad} ${countPad} files  ${durationPad}  avg: ${avgStr}  ${statusParts.join(dimSepStr)}`,
      );
    }

    if (sortedExt.length > 15) {
      const moreExtResult: Result<Str> = strings.runner.moreExtensions({
        count: sortedExt.length - 15,
      });
      if (!moreExtResult.ok) return moreExtResult;
      const moreExtText: Str = moreExtResult.data;
      log.print('{dim}' + `    ${moreExtText}` + '{/}');
    }
  }

  // By formatter/category
  if (byCategory.size > 0) {
    log.print('');
    const byFormatterHeaderResult: Result<Str> = strings.runner.byFormatterHeader();
    if (!byFormatterHeaderResult.ok) return byFormatterHeaderResult;
    const byFormatterHeader: Str = byFormatterHeaderResult.data;
    const boldFmtHeader: Result<Str> = style.bold(byFormatterHeader);
    if (!boldFmtHeader.ok) return boldFmtHeader;
    const boldFmtHeaderStr: Str = boldFmtHeader.data;
    log.info(boldFmtHeaderStr);

    const sortedCat: [
      Str,
      {
        count: NonNegativeInteger;
        duration: NonNegativeInteger;
        statuses: Record<Str, NonNegativeInteger>;
      },
    ][] = Array.from(byCategory.entries()).sort((a, b) => b[1].duration - a[1].duration);

    for (const [category, stats] of sortedCat) {
      const avgMsCatResult: Result<NonNegativeNumber> = safeParse(
        NonNegativeNumberSchema,
        stats.count > 0 ? stats.duration / stats.count : 0,
      );
      if (!avgMsCatResult.ok) return avgMsCatResult;
      const avgMs: NonNegativeNumber = avgMsCatResult.data;
      const statusParts: Str[] = [];

      if (stats.statuses.success) {
        const catOkText: Str = `${stats.statuses.success} ok`;
        const greenCatOk: Result<Str> = style.green(catOkText);
        if (!greenCatOk.ok) return greenCatOk;
        statusParts.push(greenCatOk.data);
      }
      if (stats.statuses.unchanged) {
        const catUnchangedText: Str = `${stats.statuses.unchanged} unchanged`;
        const dimCatUnchanged: Result<Str> = style.dim(catUnchangedText);
        if (!dimCatUnchanged.ok) return dimCatUnchanged;
        statusParts.push(dimCatUnchanged.data);
      }
      if (stats.statuses.failed) {
        const catFailedText: Str = `${stats.statuses.failed} failed`;
        const redCatFailed: Result<Str> = style.red(catFailedText);
        if (!redCatFailed.ok) return redCatFailed;
        statusParts.push(redCatFailed.data);
      }

      const catPadResult: Result<Str> = padRight(category, 20);
      if (!catPadResult.ok) return catPadResult;
      const catPad: Str = catPadResult.data;
      const magentaCat: Result<Str> = style.magenta(catPad);
      if (!magentaCat.ok) return magentaCat;
      const magentaCatStr: Str = magentaCat.data;
      const catCountStr: Str = String(stats.count);
      const catCountPadResult: Result<Str> = padRight(catCountStr, 5);
      if (!catCountPadResult.ok) return catCountPadResult;
      const catCountPad: Str = catCountPadResult.data;
      const catDurationFmtResult: Result<Str> = formatDuration(stats.duration);
      if (!catDurationFmtResult.ok) return catDurationFmtResult;
      const catDurationStr: Str = catDurationFmtResult.data;
      const catDurationPadResult: Result<Str> = padRight(catDurationStr, 10);
      if (!catDurationPadResult.ok) return catDurationPadResult;
      const catDurationPad: Str = catDurationPadResult.data;
      const catAvgFmtResult: Result<Str> = formatDuration(avgMs);
      if (!catAvgFmtResult.ok) return catAvgFmtResult;
      const catAvgStr: Str = catAvgFmtResult.data;
      log.info(`  ${magentaCatStr} ${catCountPad} files  ${catDurationPad}  avg: ${catAvgStr}`);
      log.info(`    ${statusParts.join(dimSepStr)}`);
    }
  }

  // Timing breakdown
  log.print('');
  const timingBreakdownHeaderResult: Result<Str> = strings.runner.timingBreakdownHeader();
  if (!timingBreakdownHeaderResult.ok) return timingBreakdownHeaderResult;
  const timingBreakdownHeader: Str = timingBreakdownHeaderResult.data;
  const boldTimingHeader: Result<Str> = style.bold(timingBreakdownHeader);
  if (!boldTimingHeader.ok) return boldTimingHeader;
  const boldTimingHeaderStr: Str = boldTimingHeader.data;
  log.info(boldTimingHeaderStr);

  const totalProcTimeInitResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    0,
  );
  if (!totalProcTimeInitResult.ok) return totalProcTimeInitResult;
  let totalProcessingTime: NonNegativeInteger = totalProcTimeInitResult.data;
  for (const result of results) {
    if (result.status !== 'skipped') {
      const newTotalResult: Result<NonNegativeInteger> = safeParse(
        NonNegativeIntegerSchema,
        totalProcessingTime + result.duration,
      );
      if (!newTotalResult.ok) return newTotalResult;
      totalProcessingTime = newTotalResult.data;
    }
  }

  const parallelizationGainResult: Result<NonNegativeNumber> = safeParse(
    NonNegativeNumberSchema,
    totalProcessingTime > 0 ? totalProcessingTime / durationResult.data : 1,
  );
  if (!parallelizationGainResult.ok) return parallelizationGainResult;
  const parallelizationGain: NonNegativeNumber = parallelizationGainResult.data;

  const wallClockTimeResult: Result<Str> = strings.runner.wallClockTime();
  if (!wallClockTimeResult.ok) return wallClockTimeResult;
  const wallClockTime: Str = wallClockTimeResult.data;
  const wallClockPadResult: Result<Str> = padRight(wallClockTime, 19);
  if (!wallClockPadResult.ok) return wallClockPadResult;
  const wallClockPad: Str = wallClockPadResult.data;
  const wallDurationFmtResult: Result<Str> = formatDuration(durationResult.data);
  if (!wallDurationFmtResult.ok) return wallDurationFmtResult;
  const wallDurationStr: Str = wallDurationFmtResult.data;
  log.info(`  ${wallClockPad} ${wallDurationStr}`);

  const totalCpuTimeResult: Result<Str> = strings.runner.totalCpuTime();
  if (!totalCpuTimeResult.ok) return totalCpuTimeResult;
  const totalCpuTime: Str = totalCpuTimeResult.data;
  const cpuTimePadResult: Result<Str> = padRight(totalCpuTime, 19);
  if (!cpuTimePadResult.ok) return cpuTimePadResult;
  const cpuTimePad: Str = cpuTimePadResult.data;
  const cpuDurationFmtResult: Result<Str> = formatDuration(totalProcessingTime);
  if (!cpuDurationFmtResult.ok) return cpuDurationFmtResult;
  const cpuDurationStr: Str = cpuDurationFmtResult.data;
  log.info(`  ${cpuTimePad} ${cpuDurationStr}`);

  const parallelizationSpeedupResult: Result<Str> = strings.runner.parallelizationSpeedup();
  if (!parallelizationSpeedupResult.ok) return parallelizationSpeedupResult;
  const parallelizationSpeedup: Str = parallelizationSpeedupResult.data;
  const speedupPadResult: Result<Str> = padRight(parallelizationSpeedup, 19);
  if (!speedupPadResult.ok) return speedupPadResult;
  const speedupPad: Str = speedupPadResult.data;
  log.info(`  ${speedupPad} ${parallelizationGain.toFixed(2)}x speedup`);

  return ok(VoidSchema, undefined);
}

// =============================================================================
// JUnit XML Output
// =============================================================================

/**
 * Builds JUnit XML output from task results and summary.
 *
 * @param summary - Run summary.
 * @param results - Task results.
 * @param suiteName - Test suite name (default: `'CLI'`).
 * @returns `Result<Str>` — JUnit XML string, or a validation error.
 */
export function buildJunitXml(
  summary: RunSummary,
  results: TaskResult[],
  suiteName: Str = 'CLI',
): Result<Str> {
  const summaryValidation: Result<RunSummary> = safeParse(RunSummarySchema, summary);
  if (!summaryValidation.ok) return summaryValidation;
  const suiteNameResult: Result<Str> = safeParse(StrSchema, suiteName);
  if (!suiteNameResult.ok) return suiteNameResult;

  const escapedSuiteResult: Result<Str> = escapeXml(suiteNameResult.data);
  if (!escapedSuiteResult.ok) return escapedSuiteResult;
  const escapedSuite: Str = escapedSuiteResult.data;

  const lines: Str[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<testsuites name="${escapedSuite}" tests="${summaryValidation.data.total}" failures="${summaryValidation.data.failed}" time="${(summaryValidation.data.duration / 1000).toFixed(3)}">`,
  );
  lines.push(
    `  <testsuite name="${escapedSuite}" tests="${summaryValidation.data.total}" failures="${summaryValidation.data.failed}" time="${(summaryValidation.data.duration / 1000).toFixed(3)}">`,
  );

  for (const result of results) {
    const nameResult: Result<Str> = escapeXml(result.relativePath);
    if (!nameResult.ok) return nameResult;
    const name: Str = nameResult.data;
    const time: Str = (result.duration / 1000).toFixed(3);

    if (result.status === 'failed') {
      const errorMsg: Str = result.error ?? 'Failed';
      const escapedErrorResult: Result<Str> = escapeXml(errorMsg);
      if (!escapedErrorResult.ok) return escapedErrorResult;
      const escapedError: Str = escapedErrorResult.data;
      lines.push(`    <testcase name="${name}" time="${time}">`);
      lines.push(`      <failure message="${escapedError}">${escapedError}</failure>`);
      lines.push('    </testcase>');
    } else if (result.status === 'skipped') {
      lines.push(`    <testcase name="${name}" time="${time}">`);
      lines.push('      <skipped/>');
      lines.push('    </testcase>');
    } else {
      lines.push(`    <testcase name="${name}" time="${time}"/>`);
    }
  }

  lines.push('  </testsuite>');
  lines.push('</testsuites>');

  return ok(StrSchema, lines.join('\n'));
}

/**
 * Prints JUnit XML output or returns the XML string.
 *
 * @param summary - Run summary.
 * @param results - Task results.
 * @param suiteName - Test suite name.
 * @param returnString - If true, returns the XML string instead of printing.
 * @returns `Result<Str>` — the JUnit XML string, or a validation error.
 */
export function printJunitOutput(
  summary: RunSummary,
  results: TaskResult[],
  suiteName: Str = 'CLI',
  returnString: Bool = false,
): Result<Str> {
  const xmlResult: Result<Str> = buildJunitXml(summary, results, suiteName);
  if (!xmlResult.ok) return xmlResult;
  if (!returnString) {
    log.raw(xmlResult.data);
  }
  return xmlResult;
}

// =============================================================================
// JSON Output Builder
// =============================================================================

/**
 * Builds structured JSON output from task results and summary.
 *
 * Groups results by category and produces a `RunOutput` object
 * suitable for JSON serialization.
 *
 * @param summary - Run summary.
 * @param results - Task results.
 * @param strings - CLI strings for i18n.
 * @returns `Result<RunOutput>` — structured output, or a validation error.
 */
export function buildRunOutput(
  summary: RunSummary,
  results: TaskResult[],
  strings: BuiltCliStrings,
): Result<RunOutput> {
  const summaryValidation: Result<RunSummary> = safeParse(RunSummarySchema, summary);
  if (!summaryValidation.ok) return summaryValidation;

  const otherCategoryResult: Result<Str> = strings.misc.otherCategory();
  if (!otherCategoryResult.ok) return otherCategoryResult;
  const otherCategory: Str = otherCategoryResult.data;

  // Group by category
  const byCategory: Record<string, TaskResult[]> = {};
  for (const result of results) {
    const category: Str = result.category ?? otherCategory;
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(result);
  }

  return safeParse(RunOutputSchema, {
    success: summaryValidation.data.failed === 0,
    summary: summaryValidation.data,
    files: results,
    byCategory,
  });
}
