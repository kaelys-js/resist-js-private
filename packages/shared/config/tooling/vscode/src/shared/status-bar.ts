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
 * Tooltip color palette — semantic colors for state and diagnostics.
 *
 * VS Code MarkdownString constraints:
 * - `style` attribute ONLY works on `<span>` elements (stripped from td/div/table)
 * - Only 3 CSS properties: color, background-color, border-radius (px values)
 * - Strict format: no spaces around `:`, trailing `;`, order: color → bg → radius
 * - Full-width section backgrounds are impossible (spans are inline)
 */

const TC = {
  brand: '#4ec9b0',
  ready: '#89d185',
  readyBg: '#1e3a1e',
  linting: '#dcdcaa',
  lintingBg: '#3a3520',
  error: '#f14c4c',
  errorBg: '#3d2020',
  warning: '#cca700',
  warningBg: '#3d3520',
  disabled: '#858585',
  disabledBg: '#2d2d2d',
  btnBg: '#404854',
} as const;

/** Colored text span. */
function cs(color: string, text: string): string {
  return `<span style="color:${color};">${text}</span>`;
}

/**
 * Rounded badge — icon and text inside styled span.
 * Vertical spacing comes from `<td height>` on the parent cell, not from
 * inline image shims (which break codicon baseline alignment).
 */
function badge(icon: string, fg: string, bg: string, text: string): string {
  return (
    `<span style="color:${fg};background-color:${bg};border-radius:4px;">` +
    `\u00a0\u00a0${icon} ${text}\u00a0\u00a0</span>`
  );
}

/**
 * Button-styled command link — icon and label inside styled span.
 * Vertical spacing comes from `<td height>` on the parent cell.
 */
function cmd(icon: string, label: string, command: string, tooltip: string): string {
  return (
    `<span style="background-color:${TC.btnBg};border-radius:4px;">` +
    `\u00a0\u00a0$(${icon}) <a href="command:${command}" title="${tooltip}">${label}</a>\u00a0\u00a0</span>`
  );
}

/**
 * Builds a rich MarkdownString tooltip for the status bar item.
 *
 * Layout:
 * - Header: brand name (left) + state badge with icon (right)
 * - Separator
 * - Content: diagnostic counts or "no issues"
 * - Separator
 * - Footer: 3x2 action grid with rounded button labels
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
  md.supportHtml = true;

  // ── State data ──────────────────────────────────────────────────────
  const stateIcons: Record<ExtensionState, string> = {
    ready: '$(pass-filled)',
    linting: '$(sync~spin)',
    error: '$(error)',
    disabled: '$(circle-slash)',
  };
  const stateFg: Record<ExtensionState, string> = {
    ready: TC.ready,
    linting: TC.linting,
    error: TC.error,
    disabled: TC.disabled,
  };
  const stateBg: Record<ExtensionState, string> = {
    ready: TC.readyBg,
    linting: TC.lintingBg,
    error: TC.errorBg,
    disabled: TC.disabledBg,
  };
  const stateLabels: Record<ExtensionState, string> = {
    ready: 'Ready',
    linting: 'Linting\u2026',
    error: 'Error',
    disabled: 'Paused',
  };

  // ── Header — brand left, state badge right ──────────────────────────
  const stateBadge: string = badge(
    stateIcons[state],
    stateFg[state],
    stateBg[state],
    stateLabels[state],
  );

  md.appendMarkdown(
    `<table width="100%"><tr>` +
      `<td>\u00a0\u00a0${cs(TC.brand, '<b>Resist</b>')}</td>` +
      `<td align="right">${stateBadge}\u00a0\u00a0</td>` +
      `</tr></table>\n\n`,
  );

  md.appendMarkdown('---\n\n');

  // ── Content — diagnostics or "no issues" ────────────────────────────
  if (counts && (counts.errors > 0 || counts.warnings > 0)) {
    const parts: string[] = [];

    if (counts.errors > 0) {
      const label: string = formatPlural(counts.errors, {
        one: en.plurals.error,
        other: en.plurals.errors,
      });
      parts.push(badge('$(error)', TC.error, TC.errorBg, label));
    }
    if (counts.warnings > 0) {
      const label: string = formatPlural(counts.warnings, {
        one: en.plurals.warning,
        other: en.plurals.warnings,
      });
      parts.push(badge('$(warning)', TC.warning, TC.warningBg, label));
    }
    md.appendMarkdown(`${parts.join('\u2003')}\n\n`);
  } else if (state === 'ready') {
    md.appendMarkdown(`$(check) ${cs(TC.ready, 'No issues in current file')}\n\n`);
  } else if (state === 'linting') {
    md.appendMarkdown(`$(sync~spin) ${cs(TC.linting, 'Analyzing\u2026')}\n\n`);
  } else if (state === 'error') {
    md.appendMarkdown(`$(error) ${cs(TC.error, 'Linter encountered an error')}\n\n`);
  } else if (state === 'disabled') {
    md.appendMarkdown(`$(circle-slash) ${cs(TC.disabled, 'Linting is paused')}\n\n`);
  }

  md.appendMarkdown('---\n\n');

  // ── Footer — action grid ────────────────────────────────────────────
  const toggleCmd: string =
    state === 'disabled'
      ? cmd('debug-start', 'Resume', COMMANDS.toggleEnable, 'Resume linting')
      : cmd('debug-pause', 'Pause', COMMANDS.toggleEnable, 'Pause linting');

  md.appendMarkdown(
    `\u00a0${toggleCmd}\u00a0\u00a0` +
      `${cmd('debug-restart', 'Restart', COMMANDS.restart, 'Clear cache and re-lint')}\u00a0\u00a0` +
      `${cmd('output', 'Output', COMMANDS.showOutput, 'Show output channel')}\u00a0` +
      `<br>` +
      `\u00a0${cmd('file-code', 'Lint File', COMMANDS.lintFile, 'Lint current file')}\u00a0\u00a0` +
      `${cmd('wand', 'Fix All', COMMANDS.lintFix, 'Fix all auto-fixable problems')}\u00a0\u00a0` +
      `${cmd('files', 'Lint Workspace', COMMANDS.lintWorkspace, 'Lint entire workspace')}\u00a0`,
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
