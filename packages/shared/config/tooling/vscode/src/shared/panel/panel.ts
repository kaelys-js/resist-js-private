/**
 * Panel Registration
 *
 * Wires the sidebar TreeView panel into the extension lifecycle.
 * Creates the data provider, registers the TreeView, hooks up state
 * and diagnostic change listeners, and registers commands for refresh,
 * expand-all, filter, clear-filter, and menu.
 *
 * Plan: .claude/plans/phase-86-panel-enhancements.md TASK 5
 *
 * @module
 */

import * as vscode from 'vscode';
import type { ToolStateManager } from '../state';
import type { LifecycleManager } from '../lifecycle';
import { registerCommand } from '../command-registration';
import { ResistTreeDataProvider } from './tree-data-provider';
import { COMMANDS, PANEL_VIEW_ID } from '../brand';
import { en } from '../../locale/en';
import { format } from '../../locale/schema';

// =============================================================================
// Registration
// =============================================================================

/**
 * Registers the sidebar panel TreeView and all supporting infrastructure.
 *
 * @param {vscode.ExtensionContext} context - Extension context for subscriptions
 * @param {ToolStateManager} stateManager - Tool state manager for observing state changes
 * @param {vscode.DiagnosticCollection} diagnosticCollection - Diagnostic collection for reading file issues
 * @param {LifecycleManager} lifecycle - Lifecycle manager for priority-ordered disposal
 * @param {vscode.OutputChannel} outputChannel - Output channel for error logging
 * @returns {ResistTreeDataProvider} The tree data provider instance
 *
 * @example
 * ```typescript
 * const provider = registerPanel(context, stateManager, diagnostics, lifecycle, outputChannel);
 * ```
 */
export function registerPanel(
  context: vscode.ExtensionContext,
  stateManager: ToolStateManager,
  diagnosticCollection: vscode.DiagnosticCollection,
  lifecycle: LifecycleManager,
  outputChannel: vscode.OutputChannel,
): ResistTreeDataProvider {
  const provider = new ResistTreeDataProvider(stateManager, diagnosticCollection);

  // Create the TreeView
  const treeView = vscode.window.createTreeView(PANEL_VIEW_ID, {
    treeDataProvider: provider,
    showCollapseAll: true,
  });

  // =========================================================================
  // Badge helper
  // =========================================================================

  /** Updates the TreeView badge with the total lint issue count. */
  function updateBadge(): void {
    let totalCount = 0;
    diagnosticCollection.forEach((_uri: vscode.Uri, diagnostics: readonly vscode.Diagnostic[]) => {
      totalCount += diagnostics.length;
    });

    if (totalCount > 0) {
      treeView.badge = {
        value: totalCount,
        tooltip: format(en.panel.badgeTooltip, { count: totalCount }),
      };
    } else {
      treeView.badge = undefined;
    }
  }

  // =========================================================================
  // Observers
  // =========================================================================

  // Observe all tool state changes → refresh panel + badge
  const stateDisposable = stateManager.onStateChange('*', () => {
    provider.refresh();
    updateBadge();
  });

  // Observe diagnostic changes → refresh panel + badge (debounced)
  let diagnosticTimer: ReturnType<typeof setTimeout> | undefined;
  const diagnosticDisposable = vscode.languages.onDidChangeDiagnostics(() => {
    if (diagnosticTimer) {
      clearTimeout(diagnosticTimer);
    }
    diagnosticTimer = setTimeout(() => {
      provider.refresh();
      updateBadge();
    }, 100);
  });

  // =========================================================================
  // Commands
  // =========================================================================

  // Expand All — reveal each root section with expand depth 2
  registerCommand(context, outputChannel, COMMANDS.panelExpandAll, async () => {
    const roots = provider.getRoots();
    for (const root of roots) {
      await treeView.reveal(root, { select: false, expand: 2 });
    }
  });

  // Filter — show input box, apply filter to provider
  registerCommand(context, outputChannel, COMMANDS.panelFilter, async () => {
    const input = await vscode.window.showInputBox({
      placeHolder: en.panel.filterPlaceholder,
      value: provider.getFilterText(),
    });
    if (input !== undefined) {
      provider.setFilter(input);
      treeView.description = input ? format(en.panel.filterActive, { text: input }) : undefined;
    }
  });

  // Clear Filter
  registerCommand(context, outputChannel, COMMANDS.panelClearFilter, async () => {
    provider.clearFilter();
    treeView.description = undefined;
  });

  // Menu — dispatch to status bar menu
  registerCommand(context, outputChannel, COMMANDS.panelMenu, async () => {
    await vscode.commands.executeCommand(COMMANDS.statusBarMenu);
  });

  // =========================================================================
  // Lifecycle
  // =========================================================================

  lifecycle.register('panel-tree-view', treeView, 20);
  lifecycle.register('panel-provider', provider, 20);
  lifecycle.register('panel-state-observer', stateDisposable, 20);
  lifecycle.register('panel-diagnostic-listener', diagnosticDisposable, 20);
  lifecycle.register(
    'panel-debounce-timer',
    {
      dispose: () => {
        if (diagnosticTimer) {
          clearTimeout(diagnosticTimer);
        }
      },
    },
    20,
  );

  return provider;
}
