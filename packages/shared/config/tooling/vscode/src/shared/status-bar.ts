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
  item.text = '$(check) Resist';
  item.tooltip = 'Resist Linter — Click to show output';
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
      item.text = '$(sync~spin) Linting...';
      item.backgroundColor = undefined;
      break;
    case 'error':
      item.text = '$(error) Resist';
      item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      break;
    case 'disabled':
      item.text = '$(circle-slash) Resist';
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
        item.text = '$(check) Resist';
      }
      item.backgroundColor = undefined;
      break;
  }
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
