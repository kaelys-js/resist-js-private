/**
 * Tests for Panel Registration
 *
 * Plan: .claude/plans/keen-noodling-newt.md TASK 5
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { registerPanel } from './panel';
import { ResistTreeDataProvider } from './tree-data-provider';
import { ToolStateManager } from '../state';
import { LifecycleManager } from '../lifecycle';
import { PANEL_VIEW_ID, COMMANDS } from '../brand';

// =============================================================================
// Helpers
// =============================================================================

let context: vscode.ExtensionContext;
let stateManager: ToolStateManager;
let diagnosticCollection: vscode.DiagnosticCollection;
let lifecycle: LifecycleManager;
let outputChannel: vscode.OutputChannel;

beforeEach(() => {
  vi.clearAllMocks();
  context = {
    subscriptions: [] as Array<{ dispose: () => void }>,
  } as unknown as vscode.ExtensionContext;
  stateManager = new ToolStateManager();
  diagnosticCollection = vscode.languages.createDiagnosticCollection(
    'test',
  ) as unknown as vscode.DiagnosticCollection;
  lifecycle = new LifecycleManager();
  outputChannel = vscode.window.createOutputChannel('test') as unknown as vscode.OutputChannel;
});

// =============================================================================
// Tests
// =============================================================================

describe('registerPanel', () => {
  it('returns a ResistTreeDataProvider', () => {
    const provider = registerPanel(
      context,
      stateManager,
      diagnosticCollection,
      lifecycle,
      outputChannel,
    );
    expect(provider).toBeInstanceOf(ResistTreeDataProvider);
  });

  it('creates TreeView with correct ID', () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    expect(vscode.window.createTreeView).toHaveBeenCalledWith(PANEL_VIEW_ID, {
      treeDataProvider: expect.any(ResistTreeDataProvider),
      showCollapseAll: true,
    });
  });

  it('registers state observer for all tools', () => {
    const spy = vi.spyOn(stateManager, 'onStateChange');
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    expect(spy).toHaveBeenCalledWith('*', expect.any(Function));
  });

  it('registers diagnostic change listener', () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    expect(vscode.languages.onDidChangeDiagnostics).toHaveBeenCalled();
  });

  it('registers refresh command via registerCommand', () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      COMMANDS.panelRefresh,
      expect.any(Function),
    );
  });

  it('registers 5 resources with lifecycle at priority 20', () => {
    const spy = vi.spyOn(lifecycle, 'register');
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);

    const panelCalls = spy.mock.calls.filter(
      (call) => typeof call[0] === 'string' && (call[0] as string).startsWith('panel-'),
    );
    expect(panelCalls).toHaveLength(5);

    for (const call of panelCalls) {
      expect(call[2]).toBe(20);
    }
  });
});
