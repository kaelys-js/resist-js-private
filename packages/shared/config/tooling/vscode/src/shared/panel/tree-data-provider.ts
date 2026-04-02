/**
 * Tree Data Provider
 *
 * Implements `vscode.TreeDataProvider` for the sidebar panel.
 * Driven by `ToolStateManager` state and `DiagnosticCollection` contents.
 *
 * Plan: .claude/plans/keen-noodling-newt.md TASK 4
 *
 * @module
 */

import * as vscode from 'vscode';
import type { ToolStateManager } from '../state';
import { en } from '../../locale/en';
import { SectionItem, ToolStatusItem, FileDiagnosticItem, PlaceholderItem } from './tree-items';
import type { ToolKey } from './tree-items';

// =============================================================================
// Provider
// =============================================================================

/**
 * TreeDataProvider for the Resist sidebar panel.
 *
 * Root level shows 3 collapsible sections (Linting, Formatting, Testing).
 * Each section shows its tool state and, for lint, per-file diagnostics.
 */
export class ResistTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  /** Fires to signal that the tree data has changed. */
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();

  /** Event that VS Code listens to for tree refreshes. */
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  /** State manager for reading tool states. */
  private readonly stateManager: ToolStateManager;

  /** Diagnostic collection for reading per-file issues. */
  private readonly diagnosticCollection: vscode.DiagnosticCollection;

  constructor(stateManager: ToolStateManager, diagnosticCollection: vscode.DiagnosticCollection) {
    this.stateManager = stateManager;
    this.diagnosticCollection = diagnosticCollection;
  }

  /**
   * Returns the tree item for display.
   *
   * @param element - The tree item to display
   * @returns The same element (items extend TreeItem)
   */
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Returns children for a given element, or root sections if no element.
   *
   * @param element - Parent element, or undefined for root
   * @returns Array of child tree items
   */
  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (!element) {
      return [
        new SectionItem(en.panel.lintingSection, 'lint'),
        new SectionItem(en.panel.formattingSection, 'format'),
        new SectionItem(en.panel.testingSection, 'test'),
      ];
    }

    if (element instanceof SectionItem) {
      return this.getSectionChildren(element.toolKey);
    }

    return [];
  }

  /**
   * Triggers a full tree refresh.
   */
  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Disposes the internal EventEmitter.
   */
  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  /**
   * Builds child items for a tool section.
   *
   * @param toolKey - Which tool section to populate
   * @returns Array of child items (status + diagnostics/placeholders)
   */
  private getSectionChildren(toolKey: ToolKey): vscode.TreeItem[] {
    const state = this.stateManager.getState(toolKey);
    const children: vscode.TreeItem[] = [new ToolStatusItem(state)];

    if (toolKey === 'lint') {
      return [...children, ...this.getLintChildren(state)];
    }

    // Format and test: always show "not configured" placeholder
    children.push(new PlaceholderItem(en.panel.notConfigured));
    return children;
  }

  /**
   * Builds diagnostic children for the lint section.
   *
   * @param state - Current lint tool state
   * @returns Diagnostic items or placeholder
   */
  private getLintChildren(state: string): vscode.TreeItem[] {
    if (state === 'error') {
      return [new PlaceholderItem(en.panel.stateError)];
    }

    if (state === 'disabled') {
      return [new PlaceholderItem(en.panel.stateDisabled)];
    }

    if (state === 'not-installed') {
      return [new PlaceholderItem(en.panel.stateNotInstalled)];
    }

    // ready or running: show per-file diagnostics
    const fileItems: vscode.TreeItem[] = [];

    this.diagnosticCollection.forEach(
      (
        uri: vscode.Uri,
        diagnostics: readonly vscode.Diagnostic[],
        _collection: vscode.DiagnosticCollection,
      ) => {
        if (diagnostics.length === 0) {
          return;
        }

        let errors = 0;
        let warnings = 0;

        for (const diag of diagnostics) {
          if (diag.severity === vscode.DiagnosticSeverity.Error) {
            errors++;
          } else if (diag.severity === vscode.DiagnosticSeverity.Warning) {
            warnings++;
          }
        }

        if (errors > 0 || warnings > 0) {
          fileItems.push(new FileDiagnosticItem(uri, errors, warnings));
        }
      },
    );

    if (fileItems.length === 0) {
      return [new PlaceholderItem(en.panel.noIssues)];
    }

    return fileItems;
  }
}
