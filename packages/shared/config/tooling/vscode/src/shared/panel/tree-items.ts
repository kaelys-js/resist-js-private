/**
 * Tree Item Classes
 *
 * Typed tree item models for the sidebar panel. Each class extends
 * `vscode.TreeItem` and sets the correct icon, label, and context value
 * for its role in the tree hierarchy.
 *
 * Plan: .claude/plans/keen-noodling-newt.md TASK 3
 *
 * @module
 */

import * as vscode from 'vscode';
import type { ToolState } from '../state';
import { en } from '../../locale/en';
import { format } from '../../locale/schema';
import { COMMANDS } from '../brand';

// =============================================================================
// Types
// =============================================================================

/** Discriminant for tree item kinds. */
export type TreeItemKind =
  | 'section'
  | 'tool-status'
  | 'file-diagnostic'
  | 'diagnostic-detail'
  | 'placeholder';

/** Tool key for panel sections. */
export type ToolKey = 'lint' | 'format' | 'test' | 'benchmark' | 'e2e';

// =============================================================================
// Constants
// =============================================================================

/** Codicon IDs for each section. */
const SECTION_ICONS: Record<ToolKey, string> = {
  lint: 'checklist',
  format: 'symbol-color',
  test: 'beaker',
  benchmark: 'rocket',
  e2e: 'globe',
};

/** Codicon IDs for each tool state. */
const STATE_ICONS: Record<ToolState, string> = {
  ready: 'pass-filled',
  running: 'sync~spin',
  error: 'error',
  disabled: 'circle-slash',
  'not-installed': 'circle-slash',
};

/** Labels for each tool state from locale. */
const STATE_LABELS: Record<ToolState, string> = {
  ready: en.panel.stateReady,
  running: en.panel.stateRunning,
  error: en.panel.stateError,
  disabled: en.panel.stateDisabled,
  'not-installed': en.panel.stateNotInstalled,
};

// =============================================================================
// Section Item
// =============================================================================

/**
 * Collapsible section header in the panel tree.
 *
 * Represents a tool category (Linting, Formatting, Testing).
 */
export class SectionItem extends vscode.TreeItem {
  /** Tool key for matching children in the data provider. */
  public readonly toolKey: ToolKey;

  constructor(label: string, toolKey: ToolKey) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.toolKey = toolKey;
    this.contextValue = 'resist.section';
    this.iconPath = new vscode.ThemeIcon(SECTION_ICONS[toolKey]);
  }
}

// =============================================================================
// Tool Status Item
// =============================================================================

/**
 * Displays the current state of a tool (ready, running, error, etc.).
 *
 * When in error state, clicking triggers a restart command.
 */
export class ToolStatusItem extends vscode.TreeItem {
  constructor(state: ToolState) {
    super(STATE_LABELS[state], vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(STATE_ICONS[state]);

    if (state === 'error') {
      this.contextValue = 'resist.toolError';
      this.command = {
        title: en.panel.restartAction,
        command: COMMANDS.restart,
      };
    } else {
      this.contextValue = 'resist.toolStatus';
    }
  }
}

// =============================================================================
// File Diagnostic Item
// =============================================================================

/**
 * A file with diagnostic issues.
 *
 * Shows filename, error/warning counts. Expandable to show individual
 * diagnostics as children. Clicking opens the file in the editor.
 */
export class FileDiagnosticItem extends vscode.TreeItem {
  /** The file URI for this diagnostic group. */
  public readonly fileUri: vscode.Uri;

  /** Individual diagnostics for this file (used by provider for children). */
  public readonly diagnostics: readonly vscode.Diagnostic[];

  constructor(
    uri: vscode.Uri,
    errors: number,
    warnings: number,
    diagnostics: readonly vscode.Diagnostic[],
  ) {
    const basename: string = uri.fsPath.split('/').pop() ?? uri.fsPath;
    super(basename, vscode.TreeItemCollapsibleState.Collapsed);

    this.fileUri = uri;
    this.diagnostics = diagnostics;
    this.description = format(en.panel.fileIssueCount, { errors, warnings });
    this.resourceUri = uri;
    this.contextValue = 'resist.fileDiagnostic';
    this.command = {
      title: en.panel.openFileAction,
      command: 'vscode.open',
      arguments: [uri],
    };
  }
}

// =============================================================================
// Diagnostic Detail Item
// =============================================================================

/** Max label length before truncation. */
const MAX_LABEL_LENGTH = 80;

/** Codicon IDs for diagnostic severity. */
const SEVERITY_ICONS: Record<number, string> = {
  [0]: 'error', // DiagnosticSeverity.Error
  [1]: 'warning', // DiagnosticSeverity.Warning
  [2]: 'info', // DiagnosticSeverity.Information
  [3]: 'info', // DiagnosticSeverity.Hint
};

/**
 * An individual diagnostic within a file.
 *
 * Shows the diagnostic message, line number, severity icon, and
 * navigates to the exact location on click.
 */
export class DiagnosticDetailItem extends vscode.TreeItem {
  /** The file URI containing this diagnostic. */
  public readonly fileUri: vscode.Uri;

  /** The diagnostic this item represents. */
  public readonly diagnostic: vscode.Diagnostic;

  constructor(diagnostic: vscode.Diagnostic, fileUri: vscode.Uri) {
    const message: string =
      diagnostic.message.length > MAX_LABEL_LENGTH
        ? `${diagnostic.message.slice(0, MAX_LABEL_LENGTH)}…`
        : diagnostic.message;
    super(message, vscode.TreeItemCollapsibleState.None);

    this.fileUri = fileUri;
    this.diagnostic = diagnostic;

    // Extract rule ID from diagnostic code
    const code = diagnostic.code;
    const ruleId: string =
      typeof code === 'string'
        ? code
        : typeof code === 'number'
          ? String(code)
          : code && typeof code === 'object' && 'value' in code
            ? String(code.value)
            : '';

    // Description: position + rule ID when available
    const line = diagnostic.range.start.line + 1;
    const col = diagnostic.range.start.character + 1;
    this.description = ruleId
      ? format(en.panel.diagnosticLineWithRule, { line, col, rule: ruleId })
      : format(en.panel.diagnosticLine, { line, col });

    this.iconPath = new vscode.ThemeIcon(SEVERITY_ICONS[diagnostic.severity] ?? 'info');
    this.contextValue = 'resist.diagnosticDetail';
    this.command = {
      title: en.panel.goToLineAction,
      command: 'vscode.open',
      arguments: [fileUri, { selection: diagnostic.range }],
    };

    // Tooltip: full message + rule ID
    this.tooltip = ruleId ? `${diagnostic.message}\n\nRule: ${ruleId}` : diagnostic.message;
  }
}

// =============================================================================
// Placeholder Item
// =============================================================================

/**
 * Informational placeholder (no issues, not configured, etc.).
 */
export class PlaceholderItem extends vscode.TreeItem {
  constructor(message: string) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('info');
  }
}
