/**
 * Tests for Panel Registration
 *
 * Plan: .claude/plans/phase-86-panel-enhancements.md TASK 5
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { registerPanel } from './panel';
import { ResistTreeDataProvider } from './tree-data-provider';
import { DiagnosticDetailItem } from './tree-items';
import { ToolStateManager } from '../state';
import { LifecycleManager } from '../lifecycle';
import { PANEL_VIEW_ID, COMMANDS } from '../brand';
import { en } from '../../locale/en';

// =============================================================================
// Helpers
// =============================================================================

let context: vscode.ExtensionContext;
let stateManager: ToolStateManager;
let diagnosticCollection: vscode.DiagnosticCollection;
let lifecycle: LifecycleManager;
let outputChannel: vscode.OutputChannel;

/**
 * Retrieves the registered handler for a given command ID from the
 * vscode.commands.registerCommand mock calls.
 */
function getCommandHandler(commandId: string): (...args: unknown[]) => Promise<void> {
  const calls = (vscode.commands.registerCommand as ReturnType<typeof vi.fn>).mock.calls;
  const match = calls.find((c) => c[0] === commandId);

  if (!match) {
    throw new Error(`Command ${commandId} not registered`);
  }
  // The handler is the second argument — it's the wrapper from registerCommand
  // which calls safeRunAsync → handler(...args)
  return match[1] as (...args: unknown[]) => Promise<void>;
}

/**
 * Retrieves the mock TreeView object returned by vscode.window.createTreeView.
 */
function getTreeView(): ReturnType<typeof vscode.window.createTreeView> {
  return (vscode.window.createTreeView as ReturnType<typeof vi.fn>).mock.results[0]!
    .value as ReturnType<typeof vscode.window.createTreeView>;
}

/**
 * Creates a DiagnosticDetailItem for command handler tests.
 */
function makeDiagnosticDetailItem(
  code?: string | number | { value: string; target: vscode.Uri },
  data?: unknown,
): DiagnosticDetailItem {
  const diag = new vscode.Diagnostic(new vscode.Range(1, 0, 1, 5), 'test error');
  diag.code = code;
  if (data !== undefined) {
    (diag as vscode.Diagnostic & { data: unknown }).data = data;
  }
  return new DiagnosticDetailItem(diag, vscode.Uri.file('/test/file.ts'));
}

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

afterEach(() => {
  vi.useRealTimers();
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

  it('registers expandAll command', () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      COMMANDS.panelExpandAll,
      expect.any(Function),
    );
  });

  it('registers filter command', () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      COMMANDS.panelFilter,
      expect.any(Function),
    );
  });

  it('registers clearFilter command', () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      COMMANDS.panelClearFilter,
      expect.any(Function),
    );
  });

  it('registers menu command', () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      COMMANDS.panelMenu,
      expect.any(Function),
    );
  });

  it('registers showLocation command', () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      COMMANDS.panelShowLocation,
      expect.any(Function),
    );
  });

  it('registers showRule command', () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      COMMANDS.panelShowRule,
      expect.any(Function),
    );
  });

  it('registers autoFix command', () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      COMMANDS.panelAutoFix,
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

// =============================================================================
// Badge Updates
// =============================================================================

describe('badge updates', () => {
  it('sets badge with count and tooltip when diagnostics exist', () => {
    const uri = vscode.Uri.file('/foo/bar.ts');
    diagnosticCollection.set(uri, [
      new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), 'err1'),
      new vscode.Diagnostic(new vscode.Range(1, 0, 1, 1), 'err2'),
    ]);

    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);

    // Trigger state change to fire updateBadge
    stateManager.setState('lint', 'ready');

    const treeView = getTreeView();
    expect(treeView.badge).toBeDefined();
    expect(treeView.badge!.value).toBe(2);
    expect(treeView.badge!.tooltip).toContain('2');
  });

  it('sets badge to undefined when zero diagnostics', () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);

    // Trigger state change to fire updateBadge with empty collection
    stateManager.setState('lint', 'ready');

    const treeView = getTreeView();
    expect(treeView.badge).toBeUndefined();
  });
});

// =============================================================================
// Observers
// =============================================================================

describe('observers', () => {
  it('state change fires provider.refresh() and updates badge', () => {
    const provider = registerPanel(
      context,
      stateManager,
      diagnosticCollection,
      lifecycle,
      outputChannel,
    );
    const refreshSpy = vi.spyOn(provider, 'refresh');

    stateManager.setState('lint', 'ready');

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('diagnostic change fires debounced refresh + badge', () => {
    vi.useFakeTimers();

    const provider = registerPanel(
      context,
      stateManager,
      diagnosticCollection,
      lifecycle,
      outputChannel,
    );
    const refreshSpy = vi.spyOn(provider, 'refresh');

    // Capture the onDidChangeDiagnostics callback
    const diagCallback = (vscode.languages.onDidChangeDiagnostics as ReturnType<typeof vi.fn>).mock
      .calls[0]![0] as () => void;

    diagCallback();

    // Should not have fired yet (debounced)
    expect(refreshSpy).not.toHaveBeenCalled();

    // Advance past debounce period (100ms)
    vi.advanceTimersByTime(100);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('multiple rapid diagnostic changes result in a single refresh', () => {
    vi.useFakeTimers();

    const provider = registerPanel(
      context,
      stateManager,
      diagnosticCollection,
      lifecycle,
      outputChannel,
    );
    const refreshSpy = vi.spyOn(provider, 'refresh');

    const diagCallback = (vscode.languages.onDidChangeDiagnostics as ReturnType<typeof vi.fn>).mock
      .calls[0]![0] as () => void;

    // Fire 5 rapid changes
    diagCallback();
    vi.advanceTimersByTime(30);
    diagCallback();
    vi.advanceTimersByTime(30);
    diagCallback();
    vi.advanceTimersByTime(30);
    diagCallback();
    vi.advanceTimersByTime(30);
    diagCallback();

    // Not enough time has passed for any to fire
    expect(refreshSpy).not.toHaveBeenCalled();

    // Advance past the final debounce
    vi.advanceTimersByTime(100);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Commands
// =============================================================================

describe('panelExpandAll command', () => {
  it('reveals each root with expand depth 2', async () => {
    const provider = registerPanel(
      context,
      stateManager,
      diagnosticCollection,
      lifecycle,
      outputChannel,
    );
    const roots = provider.getRoots();
    const treeView = getTreeView();
    const handler = getCommandHandler(COMMANDS.panelExpandAll);

    await handler();

    expect(treeView.reveal).toHaveBeenCalledTimes(roots.length);
    for (const root of roots) {
      expect(treeView.reveal).toHaveBeenCalledWith(root, { select: false, expand: 2 });
    }
  });
});

describe('panelFilter command', () => {
  it('applies filter when input is returned', async () => {
    const provider = registerPanel(
      context,
      stateManager,
      diagnosticCollection,
      lifecycle,
      outputChannel,
    );
    const setFilterSpy = vi.spyOn(provider, 'setFilter');
    const treeView = getTreeView();

    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValueOnce('my-rule');

    const handler = getCommandHandler(COMMANDS.panelFilter);
    await handler();

    expect(setFilterSpy).toHaveBeenCalledWith('my-rule');
    expect(treeView.description).toContain('my-rule');
  });

  it('does not change filter when input is cancelled (undefined)', async () => {
    const provider = registerPanel(
      context,
      stateManager,
      diagnosticCollection,
      lifecycle,
      outputChannel,
    );
    const setFilterSpy = vi.spyOn(provider, 'setFilter');

    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    const handler = getCommandHandler(COMMANDS.panelFilter);
    await handler();

    expect(setFilterSpy).not.toHaveBeenCalled();
  });

  it('clears description when filter is empty string', async () => {
    const provider = registerPanel(
      context,
      stateManager,
      diagnosticCollection,
      lifecycle,
      outputChannel,
    );
    const setFilterSpy = vi.spyOn(provider, 'setFilter');
    const treeView = getTreeView();
    treeView.description = 'old filter';

    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValueOnce('');

    const handler = getCommandHandler(COMMANDS.panelFilter);
    await handler();

    expect(setFilterSpy).toHaveBeenCalledWith('');
    expect(treeView.description).toBeUndefined();
  });
});

describe('panelClearFilter command', () => {
  it('clears filter and description', async () => {
    const provider = registerPanel(
      context,
      stateManager,
      diagnosticCollection,
      lifecycle,
      outputChannel,
    );
    const clearFilterSpy = vi.spyOn(provider, 'clearFilter');
    const treeView = getTreeView();
    treeView.description = 'some filter';

    const handler = getCommandHandler(COMMANDS.panelClearFilter);
    await handler();

    expect(clearFilterSpy).toHaveBeenCalled();
    expect(treeView.description).toBeUndefined();
  });
});

describe('panelMenu command', () => {
  it('dispatches to statusBarMenu command', async () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);

    const handler = getCommandHandler(COMMANDS.panelMenu);
    await handler();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(COMMANDS.statusBarMenu);
  });
});

describe('panelShowLocation command', () => {
  it('opens file at diagnostic range for DiagnosticDetailItem', async () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    const item = makeDiagnosticDetailItem('no-unused-vars');

    const handler = getCommandHandler(COMMANDS.panelShowLocation);
    await handler(item);

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('vscode.open', item.fileUri, {
      selection: item.diagnostic.range,
    });
  });

  it('does nothing for non-DiagnosticDetailItem', async () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);

    const handler = getCommandHandler(COMMANDS.panelShowLocation);
    await handler({ someRandomObject: true });

    // Should not have called executeCommand (beyond the registerCommand calls)
    expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith(
      'vscode.open',
      expect.anything(),
      expect.anything(),
    );
  });
});

describe('panelShowRule command', () => {
  it('copies string code to clipboard and shows info', async () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    const item = makeDiagnosticDetailItem('no-unused-vars');

    const handler = getCommandHandler(COMMANDS.panelShowRule);
    await handler(item);

    expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('no-unused-vars');
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(en.panel.ruleCopied);
  });

  it('copies number code as string to clipboard', async () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    const item = makeDiagnosticDetailItem(42);

    const handler = getCommandHandler(COMMANDS.panelShowRule);
    await handler(item);

    expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('42');
  });

  it('copies object code.value to clipboard', async () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    const item = makeDiagnosticDetailItem({
      value: 'some-rule',
      target: vscode.Uri.parse('https://example.com'),
    });

    const handler = getCommandHandler(COMMANDS.panelShowRule);
    await handler(item);

    expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('some-rule');
  });

  it('does nothing for non-DiagnosticDetailItem', async () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);

    const handler = getCommandHandler(COMMANDS.panelShowRule);
    await handler({ notAnItem: true });

    expect(vscode.env.clipboard.writeText).not.toHaveBeenCalled();
  });
});

describe('panelAutoFix command', () => {
  it('applies fix when valid fix data exists', async () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);

    const editReplaceSpy = vi.fn();
    const editSpy = vi.fn(async (callback: (builder: unknown) => void) => {
      callback({ replace: editReplaceSpy });
    });

    (vscode.workspace.openTextDocument as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      uri: vscode.Uri.file('/test/file.ts'),
      positionAt: (offset: number) => new vscode.Position(offset, 0),
    });
    (vscode.window.showTextDocument as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      edit: editSpy,
    });

    const fixData = { fix: { range: { start: 0, end: 5 }, text: 'fixed' } };
    const item = makeDiagnosticDetailItem('some-rule', fixData);

    const handler = getCommandHandler(COMMANDS.panelAutoFix);
    await handler(item);

    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(item.fileUri);
    expect(editSpy).toHaveBeenCalled();
    expect(editReplaceSpy).toHaveBeenCalled();
  });

  it('shows info message when no fix data present', async () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    const item = makeDiagnosticDetailItem('some-rule');

    const handler = getCommandHandler(COMMANDS.panelAutoFix);
    await handler(item);

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(en.panel.autoFixNotAvailable);
  });

  it('shows info message for empty no-op fix (start === end, empty text)', async () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);
    const fixData = { fix: { range: { start: 5, end: 5 }, text: '' } };
    const item = makeDiagnosticDetailItem('some-rule', fixData);

    const handler = getCommandHandler(COMMANDS.panelAutoFix);
    await handler(item);

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(en.panel.autoFixNotAvailable);
  });

  it('does nothing for non-DiagnosticDetailItem', async () => {
    registerPanel(context, stateManager, diagnosticCollection, lifecycle, outputChannel);

    const handler = getCommandHandler(COMMANDS.panelAutoFix);
    await handler({ notAnItem: true });

    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
  });
});
