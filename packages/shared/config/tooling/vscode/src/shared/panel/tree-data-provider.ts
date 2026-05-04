/**
 * Tree Data Provider
 *
 * Implements `vscode.TreeDataProvider` for the sidebar panel.
 * Driven by `ToolStateManager` state and `DiagnosticCollection` contents.
 * Supports 3-level tree: section → file → individual diagnostic.
 *
 * Plan: .claude/plans/phase-86-panel-enhancements.md TASK 4
 *
 * @module
 */

import * as vscode from 'vscode';
import type { ToolStateManager } from '../state';
import { en } from '../../locale/en';
import {
  SectionItem,
  ToolStatusItem,
  FileDiagnosticItem,
  RuleGroupItem,
  DiagnosticDetailItem,
  PlaceholderItem,
  type ToolKey,
} from './tree-items';

// =============================================================================
// Provider
// =============================================================================

/**
 * TreeDataProvider for the Resist sidebar panel.
 *
 * Root level shows 5 collapsible sections (Linting, Formatting, Testing,
 * Benchmarks, E2E Testing). Each section shows its tool state and, for lint,
 * per-file diagnostics that expand into individual diagnostic details.
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

  /** Cached root sections for getParent() and reveal(). */
  private cachedRoots: SectionItem[] = [];

  /** Maps child items to their parent for getParent(). */
  private readonly parentMap = new WeakMap<vscode.TreeItem, vscode.TreeItem>();

  /** Current filter text for narrowing lint results. */
  private filterText = '';

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
      this.cachedRoots = [
        new SectionItem(en.panel.lintingSection, 'lint'),
        new SectionItem(en.panel.formattingSection, 'format'),
        new SectionItem(en.panel.testingSection, 'test'),
        new SectionItem(en.panel.benchmarksSection, 'benchmark'),
        new SectionItem(en.panel.e2eSection, 'e2e'),
      ];
      return this.cachedRoots;
    }

    if (element instanceof SectionItem) {
      const children = this.getSectionChildren(element.toolKey);

      for (const child of children) {
        this.parentMap.set(child, element);
      }

      return children;
    }

    if (element instanceof FileDiagnosticItem) {
      const children = this.getRuleGroupChildren(element);

      for (const child of children) {
        this.parentMap.set(child, element);
      }

      return children;
    }

    if (element instanceof RuleGroupItem) {
      const children = this.getDiagnosticChildren(element);

      for (const child of children) {
        this.parentMap.set(child, element);
      }

      return children;
    }

    return [];
  }

  /**
   * Returns the parent of a tree item for reveal() support.
   *
   * @param element - The child element
   * @returns The parent element, or undefined for root items
   */
  getParent(element: vscode.TreeItem): vscode.TreeItem | undefined {
    return this.parentMap.get(element);
  }

  /**
   * Returns the cached root section items.
   *
   * @returns Array of cached root SectionItems
   */
  getRoots(): SectionItem[] {
    return this.cachedRoots;
  }

  /**
   * Triggers a full tree refresh.
   */
  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Sets the filter text and refreshes the tree.
   *
   * @param text - Filter text to match against file names, rules, and messages
   */
  setFilter(text: string): void {
    this.filterText = text;
    this.refresh();
  }

  /**
   * Clears the active filter and refreshes the tree.
   */
  clearFilter(): void {
    this.filterText = '';
    this.refresh();
  }

  /**
   * Returns the current filter text.
   *
   * @returns The active filter string
   */
  getFilterText(): string {
    return this.filterText;
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

    // Format, test, benchmark, e2e: single placeholder — not yet implemented
    return [new PlaceholderItem(en.panel.notConfigured)];
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
    const filter = this.filterText.toLowerCase();

    for (const [uri, diagnostics] of this.diagnosticCollection) {
      if (diagnostics.length === 0) {
        continue;
      }

      // Apply filter: match filename, message, or rule ID
      const filtered: vscode.Diagnostic[] = [];

      if (filter) {
        for (const diag of diagnostics) {
          const filename = uri.fsPath.toLowerCase();
          const message = diag.message.toLowerCase();
          const { code } = diag;

          let ruleId: string;

          if (typeof code === 'string') {
            ruleId = code.toLowerCase();
          } else if (typeof code === 'number') {
            ruleId = String(code);
          } else if (code && typeof code === 'object' && 'value' in code) {
            ruleId = String(code.value).toLowerCase();
          } else {
            ruleId = '';
          }

          if (filename.includes(filter) || message.includes(filter) || ruleId.includes(filter)) {
            filtered.push(diag);
          }
        }
      } else {
        for (const diag of diagnostics) {
          filtered.push(diag);
        }
      }

      if (filtered.length === 0) {
        continue;
      }

      let errors = 0;
      let warnings = 0;

      for (const diag of filtered) {
        if (diag.severity === vscode.DiagnosticSeverity.Error) {
          errors++;
        } else if (diag.severity === vscode.DiagnosticSeverity.Warning) {
          warnings++;
        }
      }

      if (errors > 0 || warnings > 0) {
        fileItems.push(new FileDiagnosticItem(uri, errors, warnings, filtered));
      }
    }

    if (fileItems.length === 0) {
      if (filter) {
        return [new PlaceholderItem(en.panel.filterNoResults)];
      }
      return [new PlaceholderItem(en.panel.noIssues)];
    }

    return fileItems;
  }

  /**
   * Groups diagnostics by rule ID and returns RuleGroupItems.
   *
   * @param fileItem - The parent file diagnostic item
   * @returns Array of RuleGroupItem children
   */
  private getRuleGroupChildren(fileItem: FileDiagnosticItem): vscode.TreeItem[] {
    const groups = new Map<string, vscode.Diagnostic[]>();

    for (const diag of fileItem.diagnostics) {
      const ruleId = this.extractRuleId(diag);
      const existing = groups.get(ruleId);

      if (existing) {
        existing.push(diag);
      } else {
        groups.set(ruleId, [diag]);
      }
    }

    const items: vscode.TreeItem[] = [];

    for (const [ruleId, diagnostics] of groups) {
      items.push(new RuleGroupItem(ruleId, fileItem.fileUri, diagnostics));
    }
    return items;
  }

  /**
   * Extracts the rule ID string from a diagnostic code.
   *
   * @param diag - The diagnostic to extract from
   * @returns The rule ID string, or '(unknown)' if none
   */
  private extractRuleId(diag: vscode.Diagnostic): string {
    const { code } = diag;

    if (typeof code === 'string') {
      return code;
    }
    if (typeof code === 'number') {
      return String(code);
    }
    if (code && typeof code === 'object' && 'value' in code) {
      return String(code.value);
    }
    return '(unknown)';
  }

  /**
   * Builds individual diagnostic items for a rule group.
   *
   * @param ruleItem - The parent rule group item
   * @returns Array of DiagnosticDetailItem children
   */
  private getDiagnosticChildren(ruleItem: RuleGroupItem): vscode.TreeItem[] {
    return ruleItem.diagnostics.map((diag) => new DiagnosticDetailItem(diag, ruleItem.fileUri));
  }
}
