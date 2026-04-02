/**
 * Config File Watcher
 *
 * Watches resist.config.ts and .resist-lint.jsonc for changes and
 * re-lints all open documents when configuration changes.
 *
 * @module
 */

import * as vscode from 'vscode';
import { createFileWatcher } from '../shared/file-watcher';
import { extractMessage } from '../shared/errors';
import { logError } from '../shared/output';
import { format } from '../locale/schema';
import { en } from '../locale/en';
import { CONFIG_FILE_PATTERNS } from '../shared/brand';

/**
 * Creates file system watchers for linter configuration files.
 *
 * When resist.config.ts or .resist-lint.jsonc changes, all open documents
 * are re-linted after a 1-second debounce.
 *
 * @param {(doc: vscode.TextDocument) => void} lintFn - Function to call for each document that needs re-linting
 * @param {vscode.OutputChannel} outputChannel - Output channel for logging errors
 * @returns {vscode.Disposable[]} Array of disposables for cleanup
 *
 * @example
 * ```typescript
 * const watchers = createConfigWatcher(
 *   (doc) => lintDocument(doc, diagnosticCollection, outputChannel, stateManager, options),
 *   outputChannel,
 * );
 * context.subscriptions.push(...watchers);
 * ```
 */
export function createConfigWatcher(
  lintFn: (doc: vscode.TextDocument) => void,
  outputChannel?: vscode.OutputChannel,
): vscode.Disposable[] {
  const relintAll = (): void => {
    for (const doc of vscode.workspace.textDocuments) {
      if (doc.uri.scheme === 'file' && !doc.isUntitled) {
        try {
          lintFn(doc);
        } catch (error: unknown) {
          if (outputChannel) {
            const msg = extractMessage(error);
            logError(
              outputChannel,
              format(en.watcher.relintError, { file: doc.uri.fsPath, error: msg }),
            );
          }
        }
      }
    }
  };

  return createFileWatcher([...CONFIG_FILE_PATTERNS], relintAll, outputChannel);
}
