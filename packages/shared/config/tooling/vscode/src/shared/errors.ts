/**
 * Shared Error Boundary Helpers
 *
 * Provides `safeRun` and `safeRunAsync` for wrapping event listener callbacks
 * and other fire-and-forget operations. Errors are logged to the output channel
 * instead of propagating to VSCode's global handler (which would silently kill
 * the listener).
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-55.md TASK 1
 *
 * @module
 */

import type * as vscode from 'vscode';
import { logError } from './output';
import { en } from '../locale/en';
import { format } from '../locale/schema';

/**
 * Wraps a synchronous function in a try/catch boundary.
 *
 * Use this for VSCode event listener callbacks where throwing would kill
 * the listener silently. Errors are logged to the Resist output channel.
 *
 * @param channel - Output channel for error logging
 * @param label - Short label identifying the operation (e.g. 'onDidSave')
 * @param fn - The function to execute safely
 */
export function safeRun(channel: vscode.OutputChannel, label: string, fn: () => void): void {
  try {
    fn();
  } catch (error: unknown) {
    logError(channel, format(en.errorBoundary.errorLog, { label, message: extractMessage(error) }));
  }
}

/**
 * Wraps an async function in a try/catch boundary.
 *
 * Use this for async operations that would otherwise produce unhandled
 * promise rejections (e.g. `void lintDocument(...)`). Errors are logged
 * to the Resist output channel.
 *
 * @param channel - Output channel for error logging
 * @param label - Short label identifying the operation (e.g. 'lintDocument')
 * @param fn - The async function to execute safely
 */
export async function safeRunAsync(
  channel: vscode.OutputChannel,
  label: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
  } catch (error: unknown) {
    logError(channel, format(en.errorBoundary.errorLog, { label, message: extractMessage(error) }));
  }
}

/**
 * Extracts a human-readable message from an unknown error value.
 *
 * @param err - The caught error (could be anything)
 * @returns A string message suitable for logging
 */
export function extractMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
