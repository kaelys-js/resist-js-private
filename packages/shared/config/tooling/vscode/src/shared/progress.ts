/**
 * Progress Reporting Helpers
 *
 * Abstraction over `vscode.window.withProgress` for file-processing
 * operations. Handles progress increment, cancellation, and per-file
 * error collection.
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 10
 *
 * @module
 */

import * as vscode from 'vscode';
import { extractMessage } from './errors';
import { logError, log } from './output';
import { format } from '../locale/schema';
import { en } from '../locale/en';

/** Result of a file processing operation. */
type FileProcessResult<T> = {
  /** The file URI that was processed. */
  readonly uri: vscode.Uri;
  /** The result if processing succeeded. */
  readonly result?: T;
  /** The error if processing failed. */
  readonly error?: string;
};

/**
 * Processes files with a VS Code progress bar.
 *
 * Shows a progress notification while processing each file. Catches
 * per-file errors and continues processing remaining files. All errors
 * are logged to the output channel.
 *
 * @param {vscode.OutputChannel} channel - Output channel for logging
 * @param {string} title - Progress bar title
 * @param {readonly vscode.Uri[]} files - Array of file URIs to process
 * @param {(uri: vscode.Uri) => Promise<T>} processFn - Async function to process each file
 * @returns {Promise<Array<FileProcessResult<T>>>} Array of results (success or error) for each file
 *
 * @example
 * ```typescript
 * const fileUris = await vscode.workspace.findFiles('**\/*.ts');
 * const results = await withFileProgress(
 *   outputChannel,
 *   'Linting workspace',
 *   fileUris,
 *   async (uri) => lintFile(uri.fsPath),
 * );
 * const failures = results.filter((r) => r.error);
 * ```
 */
export async function withFileProgress<T>(
  channel: vscode.OutputChannel,
  title: string,
  files: readonly vscode.Uri[],
  processFn: (uri: vscode.Uri) => Promise<T>,
): Promise<Array<FileProcessResult<T>>> {
  if (files.length === 0) {
    return [];
  }

  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title,
      cancellable: true,
    },
    async (progress, token) => {
      const results: Array<FileProcessResult<T>> = [];
      const increment: number = 100 / files.length;

      for (const uri of files) {
        if (token.isCancellationRequested) {
          log(channel, en.progressHelper.cancelled);
          break;
        }

        progress.report({
          increment,
          message: format(en.progressHelper.processing, { file: uri.fsPath }),
        });

        try {
          // Sequential processing is intentional — progress increments require serial execution
          const result: T = await processFn(uri); // eslint-disable-line no-await-in-loop
          results.push({ uri, result });
        } catch (error: unknown) {
          const message: string = extractMessage(error);
          logError(
            channel,
            format(en.progressHelper.fileError, { file: uri.fsPath, error: message }),
          );
          results.push({ uri, error: message });
        }
      }

      return results;
    },
  );
}
