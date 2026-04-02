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
import { COMMANDS } from './brand';

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
 * Renders a Console Ninja-style tooltip with state, diagnostics,
 * and clickable command links for quick actions.
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

  // Header
  const stateIcons: Record<ExtensionState, string> = {
    ready: '$(pass-filled)',
    linting: '$(sync~spin)',
    error: '$(error)',
    disabled: '$(circle-slash)',
  };
  const stateDescriptions: Record<ExtensionState, string> = {
    ready: 'is **ready**',
    linting: 'is **linting**...',
    error: 'encountered an **error**',
    disabled: 'is **paused**',
  };

  md.appendMarkdown(`${stateIcons[state]} Resist Linter ${stateDescriptions[state]}\n\n`);

  // Diagnostics
  if (counts && (counts.errors > 0 || counts.warnings > 0)) {
    const parts: string[] = [];

    if (counts.errors > 0) {
      parts.push(
        `$(error) ${formatPlural(counts.errors, { one: en.plurals.error, other: en.plurals.errors })}`,
      );
    }
    if (counts.warnings > 0) {
      parts.push(
        `$(warning) ${formatPlural(counts.warnings, { one: en.plurals.warning, other: en.plurals.warnings })}`,
      );
    }
    md.appendMarkdown(`${parts.join(' · ')} in current file\n\n`);
  } else if (state === 'ready') {
    md.appendMarkdown('$(check) No issues in current file\n\n');
  }

  md.appendMarkdown('---\n\n');

  // Quick actions as command links
  if (state === 'disabled') {
    md.appendMarkdown(`[$(debug-start) Resume Linting](command:${COMMANDS.toggleEnable})\n\n`);
  } else {
    md.appendMarkdown(
      `[$(debug-pause) Pause](command:${COMMANDS.toggleEnable}) · ` +
        `[$(debug-restart) Restart](command:${COMMANDS.restart})\n\n`,
    );
  }

  md.appendMarkdown(
    `[$(file-code) Lint File](command:${COMMANDS.lintFile}) · ` +
      `[$(wand) Fix All](command:${COMMANDS.lintFix})\n\n`,
  );

  md.appendMarkdown(
    `[$(output) Output](command:${COMMANDS.showOutput}) · ` +
      `[$(clear-all) Clear](command:${COMMANDS.clearOutput})`,
  );

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
