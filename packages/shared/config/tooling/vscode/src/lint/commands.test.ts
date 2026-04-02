/**
 * Tests for Lint Commands
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-56.md TASK 6
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { registerLintCommands } from './commands';
import { DiagnosticFilter } from './diagnostic-filter';
import { StageIndicator } from './stage-indicator';
import { COMMANDS, DIAGNOSTIC_COLLECTION_NAME, BRAND_NAME, CONFIG_SECTION, BINARY_NAME } from '../shared/brand';
import { ConfigManager } from '../shared/config';
import { ToolStateManager } from '../shared/state';

// Mock runner to capture which function is called
const mockRunToolText = vi.fn();
vi.mock('../shared/runner', () => ({
  runToolText: (...args: unknown[]) => mockRunToolText(...args),
  runToolJson: vi.fn(),
}));

// Mock workspace to provide binary path
vi.mock('../shared/workspace', () => ({
  getBinaryPath: vi.fn(() => '/usr/local/bin/resist-lint'),
  getWorkspaceRoot: vi.fn(() => '/workspace'),
  clearCache: vi.fn(),
}));

// Capture registered command handlers (both regular and text editor commands)
const commandHandlers = new Map<string, (...args: unknown[]) => unknown>();

vi.mocked(vscode.commands.registerCommand).mockImplementation(
  (cmd: string, handler: (...args: unknown[]) => unknown) => {
    commandHandlers.set(cmd, handler);
    return { dispose: vi.fn() };
  },
);

vi.mocked(vscode.commands.registerTextEditorCommand).mockImplementation(((
  cmd: string,
  handler: (...args: unknown[]) => unknown,
) => {
  commandHandlers.set(cmd, handler);
  return { dispose: vi.fn() };
}) as typeof vscode.commands.registerTextEditorCommand);

function createMockContext(): vscode.ExtensionContext {
  return {
    subscriptions: [] as Array<{ dispose: () => void }>,
  } as unknown as vscode.ExtensionContext;
}

describe('Lint Commands', () => {
  let context: vscode.ExtensionContext;
  let diagnosticCollection: ReturnType<typeof vscode.languages.createDiagnosticCollection>;
  let outputChannel: vscode.OutputChannel;
  let stateManager: ToolStateManager;
  let lintDocumentFn: ReturnType<typeof vi.fn<(doc: vscode.TextDocument) => void>>;
  let getLintOptions: ReturnType<
    typeof vi.fn<() => { stage: string; categories: string[]; extraArgs: string[] }>
  >;

  beforeEach(() => {
    vi.clearAllMocks();
    commandHandlers.clear();

    context = createMockContext();
    diagnosticCollection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_COLLECTION_NAME);
    outputChannel = vscode.window.createOutputChannel(BRAND_NAME) as vscode.OutputChannel;
    stateManager = new ToolStateManager();
    lintDocumentFn = vi.fn();
    getLintOptions = vi.fn(() => ({
      stage: 'lint',
      categories: [],
      extraArgs: [],
    }));

    // Re-register mock implementations (cleared by vi.clearAllMocks)
    vi.mocked(vscode.commands.registerCommand).mockImplementation(
      (cmd: string, handler: (...args: unknown[]) => unknown) => {
        commandHandlers.set(cmd, handler);
        return { dispose: vi.fn() };
      },
    );
    vi.mocked(vscode.commands.registerTextEditorCommand).mockImplementation(((
      cmd: string,
      handler: (...args: unknown[]) => unknown,
    ) => {
      commandHandlers.set(cmd, handler);
      return { dispose: vi.fn() };
    }) as typeof vscode.commands.registerTextEditorCommand);

    const diagnosticFilter = new DiagnosticFilter(outputChannel as unknown as vscode.OutputChannel);
    const mockStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    const stageIndicator = new StageIndicator(
      mockStatusBarItem as unknown as vscode.StatusBarItem,
      outputChannel as unknown as vscode.OutputChannel,
    );

    const configMgr = new ConfigManager(CONFIG_SECTION);

    registerLintCommands(context, {
      diagnosticCollection: diagnosticCollection as unknown as vscode.DiagnosticCollection,
      outputChannel: outputChannel as unknown as vscode.OutputChannel,
      stateManager,
      lintDocumentFn,
      getLintOptions,
      diagnosticFilter,
      stageIndicator,
      configManager: configMgr,
    });
  });

  it('registers all 17 commands', () => {
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
      COMMANDS.previewFixes,
      COMMANDS.showTiming,
      COMMANDS.filterByCategory,
      COMMANDS.clearFilter,
      COMMANDS.removeUnusedImports,
      COMMANDS.changeStage,
      COMMANDS.clearOutput,
      COMMANDS.toggleEnable,
    ];

    for (const cmd of expectedCommands) {
      expect(commandHandlers.has(cmd), `Command ${cmd} should be registered`).toBe(true);
    }
    expect(commandHandlers.size).toBe(17);
  });

  it('resist.lint.file calls lintDocumentFn for active editor', () => {
    const doc = {
      uri: vscode.Uri.file('/test.ts'),
      getText: () => 'const x = 1;',
    };
    const editor = { document: doc } as unknown as vscode.TextEditor;

    const handler = commandHandlers.get(COMMANDS.lintFile)!;
    handler(editor);

    expect(lintDocumentFn).toHaveBeenCalledWith(doc);
  });

  it('resist.lint.file is registered as a text editor command', () => {
    // registerTextEditorCommand means VS Code handles the no-editor case
    expect(vscode.commands.registerTextEditorCommand).toHaveBeenCalledWith(
      COMMANDS.lintFile,
      expect.any(Function),
    );
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

  it('resist.lint.restart clears cache and re-lints open documents', async () => {
    // Set up text documents
    const doc = {
      uri: vscode.Uri.file('/repo/src/file.ts'),
      isUntitled: false,
      getText: () => '',
      lineAt: () => ({ text: '' }),
      lineCount: 1,
      positionAt: () => new vscode.Position(0, 0),
      getWordRangeAtPosition: vi.fn(),
    };
    Object.defineProperty(vscode.workspace, 'textDocuments', { value: [doc], writable: true });

    const handler = commandHandlers.get(COMMANDS.restart)!;
    await handler();

    expect(diagnosticCollection.clear).toHaveBeenCalled();
    expect(lintDocumentFn).toHaveBeenCalledWith(doc);
  });

  it('resist.lint.restart skips untitled and non-file documents', async () => {
    Object.defineProperty(vscode.workspace, 'textDocuments', {
      value: [
        {
          uri: { scheme: 'untitled', fsPath: 'Untitled-1' } as unknown as vscode.Uri,
          isUntitled: true,
          getText: () => '',
          lineAt: () => ({ text: '' }),
          lineCount: 1,
          positionAt: () => new vscode.Position(0, 0),
          getWordRangeAtPosition: vi.fn(),
        },
      ],
      writable: true,
    });

    const handler = commandHandlers.get(COMMANDS.restart)!;
    await handler();

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
    const [progressOptions] = vi.mocked(vscode.window.withProgress).mock.calls[0]!;
    const options = progressOptions as { title: string };
    expect(options.title).toContain('staged');
  });

  it('resist.lint.uncommitted calls withProgress with uncommitted title', async () => {
    const handler = commandHandlers.get(COMMANDS.lintUncommitted)!;
    await handler();

    expect(vscode.window.withProgress).toHaveBeenCalled();
    const [uncommittedOptions] = vi.mocked(vscode.window.withProgress).mock.calls[0]!;
    const options = uncommittedOptions as { title: string };
    expect(options.title).toContain('uncommitted');
  });

  it('commands add subscriptions to context', () => {
    // 17 commands = 17 subscriptions pushed
    expect(context.subscriptions.length).toBe(17);
  });

  it('resist.lint.listRules uses runToolText (not runToolJson)', async () => {
    mockRunToolText.mockResolvedValue({
      ok: true,
      data: 'jsdoc/require-param\njsdoc/require-returns\n',
      stderr: '',
      elapsed: 50,
    });

    // Setup workspace folders
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: vscode.Uri.file('/workspace'), name: 'workspace', index: 0 }],
      writable: true,
    });

    const handler = commandHandlers.get(COMMANDS.listRules)!;
    await handler();

    expect(mockRunToolText).toHaveBeenCalledTimes(1);
    const options = mockRunToolText.mock.calls[0]![0];
    expect(options.args).toContain('--list-rules');
    expect(outputChannel.appendLine).toHaveBeenCalled();
  });

  it('resist.lint.listRules shows text output directly', async () => {
    const ruleOutput = 'jsdoc/require-param — error\njsdoc/require-returns — error\n';
    mockRunToolText.mockResolvedValue({
      ok: true,
      data: ruleOutput,
      stderr: '',
      elapsed: 50,
    });

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: vscode.Uri.file('/workspace'), name: 'workspace', index: 0 }],
      writable: true,
    });

    const handler = commandHandlers.get(COMMANDS.listRules)!;
    await handler();

    // Should show the raw text output directly
    const calls = vi.mocked(outputChannel.appendLine).mock.calls.map((c) => c[0]);
    expect(calls.some((c) => typeof c === 'string' && c.includes('jsdoc/require-param'))).toBe(
      true,
    );
  });

  it('resist.lint.clearOutput clears and logs to output channel', () => {
    const handler = commandHandlers.get(COMMANDS.clearOutput)!;
    handler();

    expect(outputChannel.clear).toHaveBeenCalled();
    expect(outputChannel.appendLine).toHaveBeenCalled();
  });

  it('resist.lint.toggleEnable pauses linter when enabled', async () => {
    const mockConfig = {
      get: vi.fn(() => true),
      update: vi.fn(),
    };
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(
      mockConfig as unknown as vscode.WorkspaceConfiguration,
    );

    const handler = commandHandlers.get(COMMANDS.toggleEnable)!;
    await handler();

    expect(mockConfig.update).toHaveBeenCalledWith('enable', false, expect.anything());
    expect(diagnosticCollection.clear).toHaveBeenCalled();
  });

  it('resist.lint.toggleEnable resumes linter when disabled', async () => {
    const mockConfig = {
      get: vi.fn(() => false),
      update: vi.fn(),
    };
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(
      mockConfig as unknown as vscode.WorkspaceConfiguration,
    );

    const handler = commandHandlers.get(COMMANDS.toggleEnable)!;
    await handler();

    expect(mockConfig.update).toHaveBeenCalledWith('enable', true, expect.anything());
    // Should NOT clear diagnostics when resuming
    expect(diagnosticCollection.clear).not.toHaveBeenCalled();
  });
});
