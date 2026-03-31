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
              // Errors from individual lint calls should not stop re-linting other files
            }
          }
        }
      },
      WATCHER_DEBOUNCE_MS,
    );
  };

  // Watch resist.config.ts
  const configWatcher: vscode.FileSystemWatcher =
    vscode.workspace.createFileSystemWatcher('**/resist.config.ts');
  configWatcher.onDidChange(relintAll);
  configWatcher.onDidCreate(relintAll);
  configWatcher.onDidDelete(relintAll);
  disposables.push(configWatcher);

  // Watch .resist-lint.jsonc
  const lintConfigWatcher: vscode.FileSystemWatcher =
    vscode.workspace.createFileSystemWatcher('**/.resist-lint.jsonc');
  lintConfigWatcher.onDidChange(relintAll);
  lintConfigWatcher.onDidCreate(relintAll);
  lintConfigWatcher.onDidDelete(relintAll);
  disposables.push(lintConfigWatcher);

  return disposables;
}
