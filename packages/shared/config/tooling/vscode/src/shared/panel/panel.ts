/**
 * Panel Registration
 *
 * Wires the sidebar TreeView panel into the extension lifecycle.
 * Creates the data provider, registers the TreeView, hooks up state
 * and diagnostic change listeners, and registers the refresh command.
 *
 * Plan: .claude/plans/keen-noodling-newt.md TASK 5
 *
 * @module
 */

import * as vscode from 'vscode';
import type { ToolStateManager } from '../state';
import type { LifecycleManager } from '../lifecycle';
import { registerCommand } from '../command-registration';
import { ResistTreeDataProvider } from './tree-data-provider';
import { COMMANDS, PANEL_VIEW_ID } from '../brand';

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

  // Observe all tool state changes → refresh panel
  const stateDisposable = stateManager.onStateChange('*', () => {
    provider.refresh();
  });

  // Observe diagnostic changes → refresh panel (debounced)
  let diagnosticTimer: ReturnType<typeof setTimeout> | undefined;
  const diagnosticDisposable = vscode.languages.onDidChangeDiagnostics(() => {
    if (diagnosticTimer) {
      clearTimeout(diagnosticTimer);
    }
    diagnosticTimer = setTimeout(() => {
      provider.refresh();
    }, 100);
  });

  // Register refresh command (via error-boundary wrapper)
  registerCommand(context, outputChannel, COMMANDS.panelRefresh, async () => {
    provider.refresh();
  });

  // Register all with lifecycle at priority 20
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
