/**
 * Config File Watcher
 *
 * Watches resist.config.ts and .resist-lint.jsonc for changes and
 * re-lints all open documents when configuration changes.
 *
 * @module
 */

import * as vscode from 'vscode';
import { DocumentDebouncer } from '../shared/debounce';
import { logError } from '../shared/output';
import { format } from '../locale/schema';
import { en } from '../locale/en';
import { CONFIG_FILE_PATTERNS } from '../shared/brand';

const WATCHER_DEBOUNCE_MS = 1000;
const WATCHER_KEY = '__config-watcher__';

/**
 * Creates file system watchers for linter configuration files.
 *
 * When resist.config.ts or .resist-lint.jsonc changes, all open documents
 * are re-linted after a 1-second debounce.
 *
 * @param lintFn - Function to call for each document that needs re-linting
 * @param outputChannel - Output channel for logging errors
 * @returns Array of disposables for cleanup
 */
export function createConfigWatcher(
  lintFn: (doc: vscode.TextDocument) => void,
  outputChannel?: vscode.OutputChannel,
): vscode.Disposable[] {
  const debouncer = new DocumentDebouncer();
  const disposables: vscode.Disposable[] = [{ dispose: () => debouncer.dispose() }];

  const relintAll = (): void => {
    debouncer.schedule(
      WATCHER_KEY,
      () => {
        for (const doc of vscode.workspace.textDocuments) {
          if (doc.uri.scheme === 'file' && !doc.isUntitled) {
            try {
              lintFn(doc);
            } catch (error: unknown) {
              if (outputChannel) {
                const msg = error instanceof Error ? error.message : String(error);
                logError(
                  outputChannel,
                  format(en.watcher.relintError, { file: doc.uri.fsPath, error: msg }),
                );
              }
            }
          }
        }
      },
      WATCHER_DEBOUNCE_MS,
    );
  };

  // Watch config file patterns
  for (const pattern of CONFIG_FILE_PATTERNS) {
    const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher(pattern);
    watcher.onDidChange(relintAll);
    watcher.onDidCreate(relintAll);
    watcher.onDidDelete(relintAll);
    disposables.push(watcher);
  }

  return disposables;
}
