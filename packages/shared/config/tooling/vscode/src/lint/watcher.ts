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
 * @returns Array of disposables for cleanup
 */
export function createConfigWatcher(
  lintFn: (doc: vscode.TextDocument) => void,
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
            } catch {
              // Intentional: errors from individual lint calls must not stop re-linting
              // remaining files. Each lintFn call is wrapped in safeRunAsync at the
              // call site (extension.ts), so errors are already logged to the output channel.
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
