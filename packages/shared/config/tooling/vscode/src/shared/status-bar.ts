/**
 * Status Bar Management
 *
 * Unified status bar item for the Resist extension. Shows linting state
 * and aggregated error/warning counts for the active file.
 *
 * @module
 */

import * as vscode from 'vscode';
import type { ExtensionState } from './types';
import { en } from '../locale/en';

/**
 * Creates and shows the Resist status bar item.
 *
 * @param context - Extension context for lifecycle management
 * @returns The created status bar item
 */
export function createStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem {
  const item: vscode.StatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  item.text = en.statusBar.ready;
  item.tooltip = en.statusBar.tooltip;
  item.command = 'resist.lint.showOutput';
  item.show();
  context.subscriptions.push(item);
  return item;
}

/**
 * Updates the status bar to reflect the current extension state.
 *
 * @param item - The status bar item to update
 * @param state - Current state (ready, linting, error, disabled)
 * @param counts - Optional error/warning counts for the active file
 */
export function updateStatusBar(
  item: vscode.StatusBarItem,
  state: ExtensionState,
  counts?: { errors: number; warnings: number },
): void {
  switch (state) {
    case 'linting':
      item.text = en.statusBar.linting;
      item.backgroundColor = undefined;
      break;
    case 'error':
      item.text = en.statusBar.error;
      item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      break;
    case 'disabled':
      item.text = en.statusBar.disabled;
      item.backgroundColor = undefined;
      break;
    case 'ready':
      if (counts && (counts.errors > 0 || counts.warnings > 0)) {
        const parts: string[] = [];
        if (counts.errors > 0) {
          parts.push(`$(error) ${counts.errors}`);
        }
        if (counts.warnings > 0) {
          parts.push(`$(warning) ${counts.warnings}`);
        }
        item.text = parts.join(' ');
      } else {
        item.text = en.statusBar.ready;
      }
      item.backgroundColor = undefined;
      break;
  }
}

/**
 * Creates a status bar item for a specific tool.
 *
 * Factory function that creates consistently styled status bar items
 * for different tools (lint, format, etc.).
 *
 * @param context - Extension context for lifecycle management
 * @param toolName - Tool name for tooltip (e.g. 'Lint', 'Format')
 * @param priority - Status bar priority (higher = further left, default 100)
 * @returns The created status bar item
 */
export function createToolStatusBar(
  context: vscode.ExtensionContext,
  toolName: string,
  priority: number = 100,
): vscode.StatusBarItem {
  const item: vscode.StatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    priority,
  );
  item.text = en.statusBar.ready;
  item.tooltip = `${en.statusBar.tooltipPrefix} ${toolName}`;
  item.show();
  context.subscriptions.push(item);
  return item;
}

/**
 * Counts diagnostics by severity for a given URI.
 *
 * @param collection - The diagnostic collection to count from
 * @param uri - The document URI to count diagnostics for
 * @returns Error and warning counts
 */
export function getFileDiagnosticCounts(
  collection: vscode.DiagnosticCollection,
  uri: vscode.Uri,
): { errors: number; warnings: number } {
  const diagnostics: readonly vscode.Diagnostic[] = collection.get(uri) ?? [];
  let errors = 0;
  let warnings = 0;

  for (const diag of diagnostics) {
    if (diag.severity === vscode.DiagnosticSeverity.Error) {
      errors++;
    } else if (diag.severity === vscode.DiagnosticSeverity.Warning) {
      warnings++;
    }
  }

  return { errors, warnings };
}
