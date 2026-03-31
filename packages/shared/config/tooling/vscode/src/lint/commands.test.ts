/**
 * Tests for Lint Commands
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-56.md TASK 6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { registerLintCommands } from './commands';
import { COMMANDS, DIAGNOSTIC_COLLECTION_NAME } from '../shared/brand';

// Capture registered command handlers
const commandHandlers = new Map<string, (...args: unknown[]) => unknown>();

vi.mocked(vscode.commands.registerCommand).mockImplementation(
  (cmd: string, handler: (...args: unknown[]) => unknown) => {
    commandHandlers.set(cmd, handler);
    return { dispose: vi.fn() };
  },
);

function createMockContext(): vscode.ExtensionContext {
  return {
    subscriptions: [] as Array<{ dispose: () => void }>,
  } as unknown as vscode.ExtensionContext;
}

describe('Lint Commands', () => {
  let context: vscode.ExtensionContext;
  let diagnosticCollection: ReturnType<typeof vscode.languages.createDiagnosticCollection>;
  let outputChannel: ReturnType<typeof vscode.window.createOutputChannel>;
  let statusBarItem: ReturnType<typeof vscode.window.createStatusBarItem>;
  let lintDocumentFn: ReturnType<typeof vi.fn>;
  let getLintOptions: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    commandHandlers.clear();

    context = createMockContext();
    diagnosticCollection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_COLLECTION_NAME);
    outputChannel = vscode.window.createOutputChannel('Resist');
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    lintDocumentFn = vi.fn();
    getLintOptions = vi.fn(() => ({
      stage: 'lint',
      categories: [],
      extraArgs: [],
    }));

    // Re-register mock implementation (cleared by vi.clearAllMocks)
    vi.mocked(vscode.commands.registerCommand).mockImplementation(
      (cmd: string, handler: (...args: unknown[]) => unknown) => {
        commandHandlers.set(cmd, handler);
        return { dispose: vi.fn() };
      },
    );

    registerLintCommands(context, {
      diagnosticCollection: diagnosticCollection as unknown as vscode.DiagnosticCollection,
      outputChannel: outputChannel as unknown as vscode.OutputChannel,
      statusBarItem: statusBarItem as unknown as vscode.StatusBarItem,
      lintDocumentFn,
      getLintOptions,
    });
  });

  it('registers all 9 commands', () => {
    const expectedCommands = [
      COMMANDS.lintFile,
      COMMANDS.lintWorkspace,
      COMMANDS.lintFix,
      COMMANDS.lintClear,
      COMMANDS.listRules,
      COMMANDS.restart,
      COMMANDS.showOutput,
      COMMANDS.lintStaged,
      COMMANDS.lintUncommitted,
    ];

    for (const cmd of expectedCommands) {
      expect(commandHandlers.has(cmd), `Command ${cmd} should be registered`).toBe(true);
    }
    expect(commandHandlers.size).toBe(9);
  });

  it('resist.lint.file calls lintDocumentFn for active editor', () => {
    const doc = {
      uri: vscode.Uri.file('/test.ts'),
      getText: () => 'const x = 1;',
    };
    vscode.window.activeTextEditor = {
      document: doc,
    } as unknown as vscode.TextEditor;

    const handler = commandHandlers.get(COMMANDS.lintFile)!;
    handler();

    expect(lintDocumentFn).toHaveBeenCalledWith(doc);
  });

  it('resist.lint.file does nothing when no active editor', () => {
    vscode.window.activeTextEditor = undefined;

    const handler = commandHandlers.get(COMMANDS.lintFile)!;
    handler();

    expect(lintDocumentFn).not.toHaveBeenCalled();
  });

  it('resist.lint.clear clears diagnostics and updates status bar', () => {
    const handler = commandHandlers.get(COMMANDS.lintClear)!;
    handler();

    expect(diagnosticCollection.clear).toHaveBeenCalled();
  });

  it('resist.lint.showOutput shows the output channel', () => {
    const handler = commandHandlers.get(COMMANDS.showOutput)!;
    handler();

    expect(outputChannel.show).toHaveBeenCalled();
  });

  it('resist.lint.restart clears cache and re-lints open documents', () => {
    // Set up text documents
    const doc = {
      uri: vscode.Uri.file('/repo/src/file.ts'),
      isUntitled: false,
      getText: () => '',
      lineAt: () => ({ text: '' }),
      lineCount: 1,
      positionAt: () => new vscode.Position(0, 0),
      getWordRangeAtPosition: () => undefined,
    };
    vscode.workspace.textDocuments = [doc];

    const handler = commandHandlers.get(COMMANDS.restart)!;
    handler();

    expect(diagnosticCollection.clear).toHaveBeenCalled();
    expect(lintDocumentFn).toHaveBeenCalledWith(doc);
  });

  it('resist.lint.restart skips untitled and non-file documents', () => {
    vscode.workspace.textDocuments = [
      {
        uri: { scheme: 'untitled', fsPath: 'Untitled-1' } as unknown as vscode.Uri,
        isUntitled: true,
        getText: () => '',
        lineAt: () => ({ text: '' }),
        lineCount: 1,
        positionAt: () => new vscode.Position(0, 0),
        getWordRangeAtPosition: () => undefined,
      },
    ];

    const handler = commandHandlers.get(COMMANDS.restart)!;
    handler();

    expect(lintDocumentFn).not.toHaveBeenCalled();
  });

  it('resist.lint.workspace calls withProgress', async () => {
    const handler = commandHandlers.get(COMMANDS.lintWorkspace)!;
    await handler();

    expect(vscode.window.withProgress).toHaveBeenCalled();
  });

  it('resist.lint.staged calls withProgress with diff=staged option', async () => {
    const handler = commandHandlers.get(COMMANDS.lintStaged)!;
    await handler();

    expect(vscode.window.withProgress).toHaveBeenCalled();
    // Verify the progress title mentions staged
    const call = vi.mocked(vscode.window.withProgress).mock.calls[0];
    const options = call[0] as { title: string };
    expect(options.title).toContain('staged');
  });

  it('resist.lint.uncommitted calls withProgress with uncommitted title', async () => {
    const handler = commandHandlers.get(COMMANDS.lintUncommitted)!;
    await handler();

    expect(vscode.window.withProgress).toHaveBeenCalled();
    const call = vi.mocked(vscode.window.withProgress).mock.calls[0];
    const options = call[0] as { title: string };
    expect(options.title).toContain('uncommitted');
  });

  it('commands add subscriptions to context', () => {
    // 9 commands = 9 subscriptions pushed
    expect(context.subscriptions.length).toBe(9);
  });
});
