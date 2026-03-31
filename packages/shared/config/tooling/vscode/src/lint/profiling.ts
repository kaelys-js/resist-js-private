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

/** Parsed timing entry from CLI output. */
export interface TimingEntry {
  readonly rule: string;
  readonly ms: number;
}

/**
 * Parses timing output from resist-lint --timing.
 *
 * Expected format: lines of "rule-name: 123ms" or similar.
 *
 * @param output - Raw CLI output text
 * @returns Array of parsed timing entries sorted by time descending
 */
export function parseTimingOutput(output: string): TimingEntry[] {
  const entries: TimingEntry[] = [];
  const lines: string[] = output.split('\n');

  for (const line of lines) {
    // Match patterns like "rule-name: 123ms" or "rule-name  123ms"
    const match: RegExpMatchArray | null = line.match(/^\s*(.+?)[\s:]+(\d+(?:\.\d+)?)\s*ms/);
    if (match) {
      entries.push({
        rule: match[1].trim(),
        ms: parseFloat(match[2]),
      });
    }
  }

  // Sort descending by time
  entries.sort((a, b) => b.ms - a.ms);
  return entries;
}

/**
 * Formats timing entries for display in the output channel.
 *
 * @param entries - Parsed timing entries
 * @returns Formatted string for output
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
 * @param channel - Output channel for display
 */
export async function showTimingReport(channel: vscode.OutputChannel): Promise<void> {
  const folders: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage(en.messages.noWorkspaceFolder);
    return;
  }

  const binPath: string | undefined = getBinaryPath(BINARY_NAME, folders[0].uri);
  if (!binPath) {
    vscode.window.showErrorMessage(en.messages.binaryNotInNodeModules);
    return;
  }

  const cwd: string | undefined = getWorkspaceRoot(folders[0].uri);
  if (!cwd) {
    return;
  }

  const args: string[] = ['--timing', '.'];
  logCommand(channel, binPath, args);

  const result = await runToolText({
    command: binPath,
    args,
    cwd,
    timeout: 120000,
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
