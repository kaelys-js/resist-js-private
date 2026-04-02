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
import { formatPlural } from '../locale/schema';

// =============================================================================
// Types
// =============================================================================

/** Error and warning counts for the active file. */
export type DiagnosticCounts = { errors: number; warnings: number };

// =============================================================================
// Exported API
// =============================================================================

/**
 * Updates the status bar to reflect the current extension state.
 *
 * @param {vscode.StatusBarItem} item - The status bar item to update
 * @param {ExtensionState} state - Current state (ready, linting, error, disabled)
 * @param {DiagnosticCounts} [counts] - Optional error/warning counts for the active file
 *
 * @example
 * ```typescript
 * updateStatusBar(statusBarItem, 'ready', { errors: 2, warnings: 5 });
 * ```
 */
export function updateStatusBar(
  item: vscode.StatusBarItem,
  state: ExtensionState,
  counts?: DiagnosticCounts,
): void {
  switch (state) {
    case 'linting': {
      item.text = en.statusBar.linting;
      item.backgroundColor = undefined;
      break;
    }
    case 'error': {
      item.text = en.statusBar.error;
      item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      break;
    }
    case 'disabled': {
      item.text = en.statusBar.disabled;
      item.backgroundColor = undefined;
      break;
    }
    case 'ready': {
      if (counts && (counts.errors > 0 || counts.warnings > 0)) {
        const parts: string[] = [];

        if (counts.errors > 0) {
          const errorLabel: string = formatPlural(counts.errors, {
            one: en.plurals.error,
            other: en.plurals.errors,
          });
          parts.push(`$(error) ${errorLabel}`);
        }
        if (counts.warnings > 0) {
          const warningLabel: string = formatPlural(counts.warnings, {
            one: en.plurals.warning,
            other: en.plurals.warnings,
          });
          parts.push(`$(warning) ${warningLabel}`);
        }
        item.text = `${en.statusBar.readyPrefix} ${parts.join(', ')}`;
      } else {
        item.text = en.statusBar.ready;
      }
      item.backgroundColor = undefined;
      break;
    }
  }

  item.tooltip = buildStatusTooltip(state, counts);
}

/**
 * Builds a rich MarkdownString tooltip for the status bar item.
 *
 * Shows current state, error/warning counts, and a click hint.
 *
 * @param {ExtensionState} state - Current extension state
 * @param {DiagnosticCounts} [counts] - Optional diagnostic counts
 * @returns {vscode.MarkdownString} Rich tooltip content
 */
function buildStatusTooltip(
  state: ExtensionState,
  counts?: DiagnosticCounts,
): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.supportThemeIcons = true;

  const stateLabels: Record<ExtensionState, string> = {
    ready: '$(check) Ready',
    linting: '$(sync~spin) Linting...',
    error: '$(error) Error',
    disabled: '$(circle-slash) Disabled',
  };

  md.appendMarkdown(`**Resist Linter** — ${stateLabels[state]}\n\n`);

  if (counts && (counts.errors > 0 || counts.warnings > 0)) {
    if (counts.errors > 0) {
      const label: string = formatPlural(counts.errors, {
        one: en.plurals.error,
        other: en.plurals.errors,
      });
      md.appendMarkdown(`$(error) ${label}\n\n`);
    }
    if (counts.warnings > 0) {
      const label: string = formatPlural(counts.warnings, {
        one: en.plurals.warning,
        other: en.plurals.warnings,
      });
      md.appendMarkdown(`$(warning) ${label}\n\n`);
    }
  } else if (state === 'ready') {
    md.appendMarkdown('No issues in current file\n\n');
  }

  md.appendMarkdown('---\n\n$(menu) Click for actions');

  return md;
}

/**
 * Creates a status bar item for a specific tool.
 *
 * Factory function that creates consistently styled status bar items
 * for different tools (lint, format, etc.).
 *
 * @param {vscode.ExtensionContext} context - Extension context for lifecycle management
 * @param {string} toolName - Tool name for tooltip (e.g. 'Lint', 'Format')
 * @param {number} priority - Status bar priority (higher = further left, default 100)
 * @returns {vscode.StatusBarItem} The created status bar item
 *
 * @example
 * ```typescript
 * const lintStatusBar = createToolStatusBar(context, 'Lint', 100);
 * updateStatusBar(lintStatusBar, 'ready');
 * ```
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
 * @param {vscode.DiagnosticCollection} collection - The diagnostic collection to count from
 * @param {vscode.Uri} uri - The document URI to count diagnostics for
 * @returns {DiagnosticCounts} Error and warning counts
 *
 * @example
 * ```typescript
 * const uri = editor.document.uri;
 * const counts = getFileDiagnosticCounts(diagnosticCollection, uri);
 * updateStatusBar(statusBarItem, 'ready', counts);
 * ```
 */
export function getFileDiagnosticCounts(
  collection: vscode.DiagnosticCollection,
  uri: vscode.Uri,
): DiagnosticCounts {
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
