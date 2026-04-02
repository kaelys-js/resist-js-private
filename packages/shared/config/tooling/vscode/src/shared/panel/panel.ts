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
import { DiagnosticDetailItem } from './tree-items';
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

    for (const [_uri, diagnostics] of diagnosticCollection) {
      totalCount += diagnostics.length;
    }

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

    await Promise.all(roots.map((root) => treeView.reveal(root, { select: false, expand: 2 })));
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
  registerCommand(context, outputChannel, COMMANDS.panelClearFilter, () => {
    provider.clearFilter();
    treeView.description = undefined;
  });

  // Menu — dispatch to status bar menu
  registerCommand(context, outputChannel, COMMANDS.panelMenu, async () => {
    await vscode.commands.executeCommand(COMMANDS.statusBarMenu);
  });

  // Show Location — navigate to diagnostic position
  registerCommand(context, outputChannel, COMMANDS.panelShowLocation, async (item: unknown) => {
    if (item instanceof DiagnosticDetailItem) {
      await vscode.commands.executeCommand('vscode.open', item.fileUri, {
        selection: item.diagnostic.range,
      });
    }
  });

  // Show Rule — copy rule name to clipboard
  registerCommand(context, outputChannel, COMMANDS.panelShowRule, async (item: unknown) => {
    if (item instanceof DiagnosticDetailItem) {
      const { code } = item.diagnostic;
      let ruleId = '';

      if (typeof code === 'string') {
        ruleId = code;
      } else if (typeof code === 'number') {
        ruleId = String(code);
      } else if (code && typeof code === 'object' && 'value' in code) {
        ruleId = String(code.value);
      }

      if (ruleId) {
        await vscode.env.clipboard.writeText(ruleId);
        await vscode.window.showInformationMessage(en.panel.ruleCopied);
      }
    }
  });

  // Auto-Fix Issue — apply fix or show "not available" message
  registerCommand(context, outputChannel, COMMANDS.panelAutoFix, async (item: unknown) => {
    if (item instanceof DiagnosticDetailItem) {
      const { data } = item.diagnostic as vscode.Diagnostic & {
        data?: { fix?: { range: { start: number; end: number }; text: string } };
      };
      const fix = data?.fix;

      if (!fix || (fix.range.start === fix.range.end && fix.text === '')) {
        await vscode.window.showInformationMessage(en.panel.autoFixNotAvailable);
        return;
      }

      const doc = await vscode.workspace.openTextDocument(item.fileUri);
      const editor = await vscode.window.showTextDocument(doc);
      const startPos = doc.positionAt(fix.range.start);
      const endPos = doc.positionAt(fix.range.end);
      await editor.edit((editBuilder) => {
        editBuilder.replace(new vscode.Range(startPos, endPos), fix.text);
      });
    }
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
