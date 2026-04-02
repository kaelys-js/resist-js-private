/**
 * Output Channel Logging
 *
 * Manages the "Resist" output channel for debug logging. Shows CLI commands
 * being spawned, timing info, and errors for troubleshooting.
 *
 * @module
 */

import * as vscode from 'vscode';
import { en } from '../locale/en';

/**
 * Creates the Resist output channel.
 *
 * @returns {vscode.OutputChannel} The created output channel
 *
 * @example
 * ```typescript
 * const channel = createOutputChannel();
 * log(channel, 'Extension activated');
 * ```
 */
export function createOutputChannel(): vscode.OutputChannel {
  return vscode.window.createOutputChannel(en.output.channelName);
}

/**
 * Writes a timestamped info line to the output channel.
 *
 * @param {vscode.OutputChannel} channel - The output channel to write to
 * @param {string} msg - Message to log
 *
 * @example
 * ```typescript
 * log(channel, 'Config reloaded from .resist-lint.jsonc');
 * ```
 */
export function log(channel: vscode.OutputChannel, msg: string): void {
  channel.appendLine(`  [${timestamp()}] ${msg}`);
}

/**
 * Writes a timestamped error line to the output channel.
 *
 * @param {vscode.OutputChannel} channel - The output channel to write to
 * @param {string} msg - Error message to log
 *
 * @example
 * ```typescript
 * logError(channel, 'Failed to spawn resist-lint process');
 * ```
 */
export function logError(channel: vscode.OutputChannel, msg: string): void {
  channel.appendLine(`  [${timestamp()}] ${en.output.errorPrefix}: ${msg}`);
}

/**
 * Logs the start of a lint operation with a visual separator and the CLI
 * command being spawned, formatted for readability.
 *
 * @param {vscode.OutputChannel} channel - The output channel to write to
 * @param {string} cmd - Command name
 * @param {readonly string[]} args - Command arguments
 *
 * @example
 * ```typescript
 * logCommand(channel, 'resist-lint', ['--format=json', '--stdin-filename=/src/app.ts']);
 * ```
 */
export function logCommand(
  channel: vscode.OutputChannel,
  cmd: string,
  args: readonly string[],
): void {
  channel.appendLine('');
  channel.appendLine(`${'─'.repeat(60)}`);
  channel.appendLine(`  [${timestamp()}] $ ${cmd}`);
  for (const arg of args) {
    channel.appendLine(`      ${arg}`);
  }
}

/**
 * Logs performance timing for an operation with visual emphasis.
 *
 * @param {vscode.OutputChannel} channel - The output channel to write to
 * @param {string} label - Description of what was timed
 * @param {number} ms - Duration in milliseconds
 *
 * @example
 * ```typescript
 * const start = Date.now();
 * await lintFile(filePath);
 * logTiming(channel, 'Lint completed', Date.now() - start);
 * ```
 */
export function logTiming(channel: vscode.OutputChannel, label: string, ms: number): void {
  channel.appendLine(`  [${timestamp()}] ${label} (${ms}ms)`);
}

/**
 * Logs a diagnostic summary line showing counts.
 *
 * @param {vscode.OutputChannel} channel - The output channel to write to
 * @param {number} errors - Number of errors found
 * @param {number} warnings - Number of warnings found
 *
 * @example
 * ```typescript
 * logSummary(channel, 3, 1);
 * // Output:   [14:32:01] Result: 3 errors, 1 warning
 * ```
 */
export function logSummary(
  channel: vscode.OutputChannel,
  errors: number,
  warnings: number,
): void {
  const parts: string[] = [];

  if (errors > 0) {
    parts.push(`${errors} error${errors === 1 ? '' : 's'}`);
  }
  if (warnings > 0) {
    parts.push(`${warnings} warning${warnings === 1 ? '' : 's'}`);
  }

  const summary: string = parts.length > 0 ? parts.join(', ') : 'no issues';
  channel.appendLine(`  [${timestamp()}] Result: ${summary}`);
}

/**
 * Logs each diagnostic as an indented detail line after the summary.
 *
 * Format: `      file:line:col  severity  ruleId  message`
 *
 * @param {vscode.OutputChannel} channel - The output channel to write to
 * @param {readonly vscode.Diagnostic[]} diagnostics - Diagnostics to list
 * @param {string} filePath - File path for display
 *
 * @example
 * ```typescript
 * logDiagnosticList(channel, diagnostics, '/src/app.ts');
 * // Output:       /src/app.ts:3:5  error  ts/return-type  Missing return type
 * ```
 */
export function logDiagnosticList(
  channel: vscode.OutputChannel,
  diagnostics: readonly vscode.Diagnostic[],
  filePath: string,
): void {
  for (const diag of diagnostics) {
    const line: number = diag.range.start.line + 1;
    const col: number = diag.range.start.character + 1;
    const sev: string = diag.severity === 0 ? 'error' : diag.severity === 1 ? 'warn' : 'info';
    const ruleId: string =
      typeof diag.code === 'object' && diag.code !== null
        ? String((diag.code as { value: string | number }).value)
        : String(diag.code ?? '');

    // Truncate message to first line only
    const msg: string = diag.message.split('\n')[0] ?? diag.message;

    channel.appendLine(`      ${filePath}:${line}:${col}  ${sev}  ${ruleId}  ${msg}`);
  }
}

/**
 * Returns a HH:MM:SS timestamp string.
 *
 * @returns {string} Formatted timestamp string
 */
function timestamp(): string {
  const now: Date = new Date();
  const h: string = String(now.getHours()).padStart(2, '0');
  const m: string = String(now.getMinutes()).padStart(2, '0');
  const s: string = String(now.getSeconds()).padStart(2, '0');

  return `${h}:${m}:${s}`;
}
