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
export type TreeItemKind = 'section' | 'tool-status' | 'file-diagnostic' | 'placeholder';

/** Tool key for panel sections. */
export type ToolKey = 'lint' | 'format' | 'test';

// =============================================================================
// Constants
// =============================================================================

/** Codicon IDs for each section. */
const SECTION_ICONS: Record<ToolKey, string> = {
  lint: 'checklist',
  format: 'symbol-color',
  test: 'beaker',
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
 * Shows filename, error/warning counts, and opens the file on click.
 */
export class FileDiagnosticItem extends vscode.TreeItem {
  constructor(uri: vscode.Uri, errors: number, warnings: number) {
    const basename: string = uri.fsPath.split('/').pop() ?? uri.fsPath;
    super(basename, vscode.TreeItemCollapsibleState.None);

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
