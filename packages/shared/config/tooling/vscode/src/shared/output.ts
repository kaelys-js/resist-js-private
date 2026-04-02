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
  channel.appendLine(`[${timestamp()}] ${msg}`);
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
  channel.appendLine(`[${timestamp()}] ${en.output.errorPrefix}: ${msg}`);
}

/**
 * Logs the full CLI command being spawned so the user can reproduce it
 * in the terminal for debugging.
 *
 * @param {vscode.OutputChannel} channel - The output channel to write to
 * @param {string} cmd - Command name
 * @param {readonly string[]} args - Command arguments
 *
 * @example
 * ```typescript
 * logCommand(channel, 'resist-lint', ['--format', 'json', 'src/app.ts']);
 * // Output: [14:32:01] $ resist-lint --format json src/app.ts
 * ```
 */
export function logCommand(
  channel: vscode.OutputChannel,
  cmd: string,
  args: readonly string[],
): void {
  channel.appendLine(`[${timestamp()}] $ ${cmd} ${args.join(' ')}`);
}

/**
 * Logs performance timing for an operation.
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
 * // Output: [14:32:01] Lint completed: 245ms
 * ```
 */
export function logTiming(channel: vscode.OutputChannel, label: string, ms: number): void {
  channel.appendLine(`[${timestamp()}] ${label}: ${ms}ms`);
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
