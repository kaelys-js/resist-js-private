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
 * @returns The created output channel
 */
export function createOutputChannel(): vscode.OutputChannel {
  return vscode.window.createOutputChannel(en.output.channelName);
}

/**
 * Writes a timestamped info line to the output channel.
 *
 * @param channel - The output channel to write to
 * @param msg - Message to log
 */
export function log(channel: vscode.OutputChannel, msg: string): void {
  channel.appendLine(`[${timestamp()}] ${msg}`);
}

/**
 * Writes a timestamped error line to the output channel.
 *
 * @param channel - The output channel to write to
 * @param msg - Error message to log
 */
export function logError(channel: vscode.OutputChannel, msg: string): void {
  channel.appendLine(`[${timestamp()}] ${en.output.errorPrefix}: ${msg}`);
}

/**
 * Logs the full CLI command being spawned so the user can reproduce it
 * in the terminal for debugging.
 *
 * @param channel - The output channel to write to
 * @param cmd - Command name
 * @param args - Command arguments
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
 * @param channel - The output channel to write to
 * @param label - Description of what was timed
 * @param ms - Duration in milliseconds
 */
export function logTiming(channel: vscode.OutputChannel, label: string, ms: number): void {
  channel.appendLine(`[${timestamp()}] ${label}: ${ms}ms`);
}

/**
 * Returns a HH:MM:SS timestamp string.
 */
function timestamp(): string {
  const now: Date = new Date();
  const h: string = String(now.getHours()).padStart(2, '0');
  const m: string = String(now.getMinutes()).padStart(2, '0');
  const s: string = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
