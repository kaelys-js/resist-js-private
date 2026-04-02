/**
 * Performance Profiling
 *
 * Displays per-rule timing breakdown in the output channel.
 * Runs resist-lint with --timing flag and parses the output.
 *
 * @module
 */

import * as vscode from 'vscode';
import { runToolText } from '../shared/runner';
import { getBinaryPath, getWorkspaceRoot } from '../shared/workspace';
import { logError, logCommand } from '../shared/output';
import { en } from '../locale/en';
import { format } from '../locale/schema';
import { BINARY_NAME } from '../shared/brand';

// =============================================================================
// Types
// =============================================================================

/** Parsed timing entry from CLI output. */
export type TimingEntry = {
  readonly rule: string;
  readonly ms: number;
};

// =============================================================================
// Exported API
// =============================================================================

/**
 * Parses timing output from resist-lint --timing.
 *
 * Expected format: lines of "rule-name: 123ms" or similar.
 *
 * @param {string} output - Raw CLI output text
 * @returns {TimingEntry[]} Array of parsed timing entries sorted by time descending
 *
 * @example
 * ```typescript
 * const entries = parseTimingOutput('no-unused-vars: 42ms\nimport-order: 18ms');
 * // entries = [{ rule: 'no-unused-vars', ms: 42 }, { rule: 'import-order', ms: 18 }]
 * ```
 */
export function parseTimingOutput(output: string): TimingEntry[] {
  const entries: TimingEntry[] = [];
  const lines: string[] = output.split('\n');

  for (const line of lines) {
    // Match patterns like "rule-name: 123ms" or "rule-name  123ms"
    const match: RegExpMatchArray | null = line.match(/^\s*(.+?)[\s:]+(\d+(?:\.\d+)?)\s*ms/);

    if (match) {
      const [, rule, msStr] = match;

      if (rule !== undefined && msStr !== undefined) {
        entries.push({
          rule: rule.trim(),
          ms: Number.parseFloat(msStr),
        });
      }
    }
  }

  // Sort descending by time
  entries.sort((a, b) => b.ms - a.ms);

  return entries;
}

/**
 * Formats timing entries for display in the output channel.
 *
 * @param {TimingEntry[]} entries - Parsed timing entries
 * @returns {string} Formatted string for output
 *
 * @example
 * ```typescript
 * const entries: TimingEntry[] = [
 *   { rule: 'no-unused-vars', ms: 42 },
 *   { rule: 'import-order', ms: 18 },
 * ];
 * const report = formatTimingReport(entries);
 * outputChannel.appendLine(report);
 * ```
 */
export function formatTimingReport(entries: TimingEntry[]): string {
  if (entries.length === 0) {
    return en.profiling.noData;
  }

  const lines: string[] = [en.profiling.header];

  for (const entry of entries) {
    lines.push(format(en.profiling.ruleTime, { rule: entry.rule, ms: entry.ms }));
  }

  const totalMs: number = entries.reduce((sum, e) => sum + e.ms, 0);

  lines.push(format(en.profiling.total, { ms: Math.round(totalMs), count: entries.length }));

  return lines.join('\n');
}

/**
 * Runs lint with --timing and displays the report.
 *
 * @param {vscode.OutputChannel} channel - Output channel for display
 *
 * @example
 * ```typescript
 * const outputChannel = vscode.window.createOutputChannel('Resist Lint');
 * await showTimingReport(outputChannel);
 * ```
 */
export async function showTimingReport(channel: vscode.OutputChannel): Promise<void> {
  const folders: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders;

  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage(en.messages.noWorkspaceFolder);
    return;
  }

  const [firstFolder] = folders;

  if (!firstFolder) {
    return;
  }

  const binPath: string | undefined = getBinaryPath(BINARY_NAME, firstFolder.uri);

  if (!binPath) {
    vscode.window.showErrorMessage(en.messages.binaryNotInNodeModules);
    return;
  }

  const cwd: string | undefined = getWorkspaceRoot(firstFolder.uri);

  if (!cwd) {
    return;
  }

  const args: string[] = ['--timing', '.'];

  logCommand(channel, binPath, args);

  const result = await runToolText({
    command: binPath,
    args,
    cwd,
    timeout: 120_000,
  });

  if (!result.ok) {
    logError(channel, format(en.messages.timingReportFailed, { error: result.error }));
    return;
  }

  const entries: TimingEntry[] = parseTimingOutput(result.data);
  const report: string = formatTimingReport(entries);

  channel.appendLine('');
  channel.appendLine(report);
  channel.show();
}
