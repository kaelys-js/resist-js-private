/**
 * Generic Config File Watcher
 *
 * Watches for file changes matching glob patterns and invokes callbacks
 * with built-in debouncing. Generalizes the lint-specific watcher.
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 7
 *
 * @module
 */

import * as vscode from 'vscode';
import { logError, log } from './output';
import { format } from '../locale/schema';
import { en } from '../locale/en';

/**
 * Creates file system watchers for the given glob patterns.
 *
 * Changes are debounced to avoid rapid re-triggering. Callback errors
 * are caught and logged — the watcher stays alive.
 *
 * @param patterns - Glob patterns to watch (e.g. ['**\/.resist-lint.jsonc'])
 * @param callback - Function to call when a matching file changes
 * @param channel - Optional output channel for logging
 * @param debounceMs - Debounce delay in milliseconds (default 1000)
 * @returns Array of disposables for cleanup
 */
export function createFileWatcher(
  patterns: string[],
  callback: () => void,
  channel?: vscode.OutputChannel,
  debounceMs: number = 1000,
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];
  let debounceTimer: NodeJS.Timeout | undefined;

  const debouncedCallback = (): void => {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      try {
        callback();
      } catch (error: unknown) {
        const message: string = error instanceof Error ? error.message : String(error);
        if (channel) {
          logError(channel, message);
        }
      }
    }, debounceMs);
  };

  for (const pattern of patterns) {
    const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidChange(() => {
      if (channel) {
        log(channel, format(en.watcher.configChanged, { pattern }));
      }
      debouncedCallback();
    });

    watcher.onDidCreate(() => {
      if (channel) {
        log(channel, format(en.watcher.configChanged, { pattern }));
      }
      debouncedCallback();
    });

    watcher.onDidDelete(() => {
      if (channel) {
        log(channel, format(en.watcher.configChanged, { pattern }));
      }
      debouncedCallback();
    });

    disposables.push(watcher);
  }

  // Cleanup timer on dispose
  disposables.push({
    dispose: () => {
      if (debounceTimer !== undefined) {
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
      }
    },
  });

  return disposables;
}
