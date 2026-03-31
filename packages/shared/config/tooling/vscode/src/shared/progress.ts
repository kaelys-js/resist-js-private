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
import { logError, log } from './output';
import { format } from '../locale/schema';
import { en } from '../locale/en';

/** Result of a file processing operation. */
export interface FileProcessResult<T> {
  /** The file URI that was processed. */
  readonly uri: vscode.Uri;
  /** The result if processing succeeded. */
  readonly result?: T;
  /** The error if processing failed. */
  readonly error?: string;
}

/**
 * Processes files with a VS Code progress bar.
 *
 * Shows a progress notification while processing each file. Catches
 * per-file errors and continues processing remaining files. All errors
 * are logged to the output channel.
 *
 * @param channel - Output channel for logging
 * @param title - Progress bar title
 * @param files - Array of file URIs to process
 * @param processFn - Async function to process each file
 * @returns Array of results (success or error) for each file
 */
export async function withFileProgress<T>(
  channel: vscode.OutputChannel,
  title: string,
  files: readonly vscode.Uri[],
  processFn: (uri: vscode.Uri) => Promise<T>,
): Promise<FileProcessResult<T>[]> {
  if (files.length === 0) {
    return [];
  }

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title,
      cancellable: true,
    },
    async (progress, token) => {
      const results: FileProcessResult<T>[] = [];
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
          const result: T = await processFn(uri);
          results.push({ uri, result });
        } catch (error: unknown) {
          const message: string = error instanceof Error ? error.message : String(error);
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
