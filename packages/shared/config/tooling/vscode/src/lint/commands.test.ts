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
import { COMMANDS, DIAGNOSTIC_COLLECTION_NAME, BRAND_NAME, CONFIG_SECTION } from '../shared/brand';
import { ConfigManager } from '../shared/config';
import { ToolStateManager } from '../shared/state';
import { en } from '../locale/en';

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
      COMMANDS.filterByCategory,
      COMMANDS.clearFilter,
      COMMANDS.removeUnusedImports,
      COMMANDS.changeStage,
      COMMANDS.clearOutput,
      COMMANDS.toggleEnable,
      COMMANDS.debugToggle,
      COMMANDS.statusBarMenu,
    ];

    for (const cmd of expectedCommands) {
      expect(commandHandlers.has(cmd), `Command ${cmd} should be registered`).toBe(true);
    }
    expect(commandHandlers.size).toBe(18);
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
    // 18 commands = 18 subscriptions pushed
    expect(context.subscriptions.length).toBe(18);
  });

  it('resist.lint.listRules invokes rules viewer', async () => {
    const handler = commandHandlers.get(COMMANDS.listRules)!;
    await handler();

    // No workspace folders in test → showRulesViewer shows error message
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(en.messages.noWorkspaceFolder);
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

  // ===========================================================================
  // toggleEnable — state transitions and log messages
  // ===========================================================================

  it('resist.lint.toggleEnable sets state to disabled and logs pause message when enabled', async () => {
    const mockConfig = {
      get: vi.fn(() => true),
      update: vi.fn(),
    };
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(
      mockConfig as unknown as vscode.WorkspaceConfiguration,
    );

    const handler = commandHandlers.get(COMMANDS.toggleEnable)!;
    await handler();

    expect(stateManager.getState('lint')).toBe('disabled');
    expect(outputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining(en.messages.linterPaused),
    );
  });

  it('resist.lint.toggleEnable sets state to ready and logs resume message when disabled', async () => {
    const mockConfig = {
      get: vi.fn(() => false),
      update: vi.fn(),
    };
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(
      mockConfig as unknown as vscode.WorkspaceConfiguration,
    );

    const handler = commandHandlers.get(COMMANDS.toggleEnable)!;
    await handler();

    expect(stateManager.getState('lint')).toBe('ready');
    expect(outputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining(en.messages.linterResumed),
    );
  });

  // ===========================================================================
  // debugToggle — both directions
  // ===========================================================================

  it('resist.lint.debugToggle disables debug and shows disabled message when currently enabled', async () => {
    const mockConfig = {
      get: vi.fn(() => true),
      update: vi.fn(),
    };
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(
      mockConfig as unknown as vscode.WorkspaceConfiguration,
    );

    const handler = commandHandlers.get(COMMANDS.debugToggle)!;
    await handler();

    expect(mockConfig.update).toHaveBeenCalledWith('debug', false, expect.anything());
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      en.statusBarMenu.debugDisabled,
    );
  });

  it('resist.lint.debugToggle enables debug and shows enabled message when currently disabled', async () => {
    const mockConfig = {
      get: vi.fn(() => false),
      update: vi.fn(),
    };
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(
      mockConfig as unknown as vscode.WorkspaceConfiguration,
    );

    const handler = commandHandlers.get(COMMANDS.debugToggle)!;
    await handler();

    expect(mockConfig.update).toHaveBeenCalledWith('debug', true, expect.anything());
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      en.statusBarMenu.debugEnabled,
    );
  });

  // ===========================================================================
  // lintFix — uncovered branches
  // ===========================================================================

  it('resist.lint.fix shows info message when no changes are found', async () => {
    const originalText = 'const x = 1;';
    const doc = {
      uri: vscode.Uri.file('/test-fix.ts'),
      getText: () => originalText,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    };
    const editor = { document: doc } as unknown as vscode.TextEditor;

    // applyFixes returns unchanged text when there are no fixable diagnostics
    // The diagnosticCollection has no entries, so applyFixes returns original text
    const handler = commandHandlers.get(COMMANDS.lintFix)!;
    await handler(editor);

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      en.messages.noFixableProblems,
    );
  });

  it('resist.lint.fix shows error message when workspace edit is rejected', async () => {
    const originalText = 'const x = 1;';
    const doc = {
      uri: vscode.Uri.file('/test-fix-reject.ts'),
      getText: () => originalText,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    };
    const editor = { document: doc } as unknown as vscode.TextEditor;

    // Set up a diagnostic with a fix so applyFixes returns different text
    const fixDiagnostic = new vscode.Diagnostic(
      new vscode.Range(new vscode.Position(0, 6), new vscode.Position(0, 7)),
      'test fix',
      vscode.DiagnosticSeverity.Warning,
    );
    (
      fixDiagnostic as unknown as {
        data: { fix: { range: { start: number; end: number }; text: string } };
      }
    ).data = {
      fix: { range: { start: 6, end: 7 }, text: 'y' },
    };
    vi.mocked(diagnosticCollection.get).mockReturnValue([fixDiagnostic]);

    // Mock applyEdit to reject
    vi.mocked(vscode.workspace.applyEdit).mockResolvedValueOnce(false);

    const handler = commandHandlers.get(COMMANDS.lintFix)!;
    await handler(editor);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(en.messages.fixRejected);
  });

  it('resist.lint.fix applies fixes and re-lints when edit succeeds', async () => {
    const originalText = 'const x = 1;';
    const doc = {
      uri: vscode.Uri.file('/test-fix-success.ts'),
      getText: () => originalText,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    };
    const editor = { document: doc } as unknown as vscode.TextEditor;

    // Set up a diagnostic with a fix
    const fixDiagnostic = new vscode.Diagnostic(
      new vscode.Range(new vscode.Position(0, 6), new vscode.Position(0, 7)),
      'test fix',
      vscode.DiagnosticSeverity.Warning,
    );
    (
      fixDiagnostic as unknown as {
        data: { fix: { range: { start: number; end: number }; text: string } };
      }
    ).data = {
      fix: { range: { start: 6, end: 7 }, text: 'y' },
    };
    vi.mocked(diagnosticCollection.get).mockReturnValue([fixDiagnostic]);

    // applyEdit succeeds (default mock returns true)
    vi.mocked(vscode.workspace.applyEdit).mockResolvedValueOnce(true);

    const handler = commandHandlers.get(COMMANDS.lintFix)!;
    await handler(editor);

    // Should re-lint the document after applying
    expect(lintDocumentFn).toHaveBeenCalledWith(doc);
  });

  // ===========================================================================
  // restart — file filtering
  // ===========================================================================

  it('resist.lint.restart filters out non-file scheme documents', async () => {
    const fileDoc = {
      uri: vscode.Uri.file('/repo/src/real.ts'),
      isUntitled: false,
      getText: () => '',
      lineAt: () => ({ text: '' }),
      lineCount: 1,
      positionAt: () => new vscode.Position(0, 0),
      getWordRangeAtPosition: vi.fn(),
    };
    const outputDoc = {
      uri: { scheme: 'output', fsPath: '/output/channel' } as unknown as vscode.Uri,
      isUntitled: false,
      getText: () => '',
      lineAt: () => ({ text: '' }),
      lineCount: 1,
      positionAt: () => new vscode.Position(0, 0),
      getWordRangeAtPosition: vi.fn(),
    };
    const untitledDoc = {
      uri: { scheme: 'untitled', fsPath: 'Untitled-1' } as unknown as vscode.Uri,
      isUntitled: true,
      getText: () => '',
      lineAt: () => ({ text: '' }),
      lineCount: 1,
      positionAt: () => new vscode.Position(0, 0),
      getWordRangeAtPosition: vi.fn(),
    };

    Object.defineProperty(vscode.workspace, 'textDocuments', {
      value: [fileDoc, outputDoc, untitledDoc],
      writable: true,
    });

    const handler = commandHandlers.get(COMMANDS.restart)!;
    await handler();

    // Only the file-scheme, non-untitled doc should be linted
    expect(lintDocumentFn).toHaveBeenCalledTimes(1);
    expect(lintDocumentFn).toHaveBeenCalledWith(fileDoc);
  });

  // ===========================================================================
  // statusBarMenu — enabled state, disabled state, cancel
  // ===========================================================================

  it('resist.lint.statusBarMenu includes all expected menu items', async () => {
    const handler = commandHandlers.get(COMMANDS.statusBarMenu)!;
    await handler();

    const [items] = vi.mocked(vscode.window.showQuickPick).mock.calls[0]!;
    const labels = (items as vscode.QuickPickItem[]).map((i) => i.label);
    // First item is always the toggle (pause or resume depending on config state)
    expect([en.statusBarMenu.pause, en.statusBarMenu.resume]).toContain(labels[0]!);
    // Menu contains all expected action labels
    expect(labels).toContain(en.statusBarMenu.restart);
    expect(labels).toContain(en.statusBarMenu.lintFile);
    expect(labels).toContain(en.statusBarMenu.lintWorkspace);
    expect(labels).toContain(en.statusBarMenu.lintStaged);
    expect(labels).toContain(en.statusBarMenu.lintUncommitted);
    expect(labels).toContain(en.statusBarMenu.fixAll);
    expect(labels).toContain(en.statusBarMenu.previewFixes);
    expect(labels).toContain(en.statusBarMenu.removeUnusedImports);
    expect(labels).toContain(en.statusBarMenu.filterByCategory);
    expect(labels).toContain(en.statusBarMenu.clearFilter);
    expect(labels).toContain(en.statusBarMenu.changeStage);
    expect(labels).toContain(en.statusBarMenu.listRules);
    expect(labels).toContain(en.statusBarMenu.debugToggle);
    expect(labels).toContain(en.statusBarMenu.showOutput);
    expect(labels).toContain(en.statusBarMenu.clearOutput);
  });

  it('resist.lint.statusBarMenu does nothing when user cancels', async () => {
    // showQuickPick returns undefined by default (user cancelled)
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce(undefined);

    const handler = commandHandlers.get(COMMANDS.statusBarMenu)!;
    await handler();

    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('resist.lint.statusBarMenu executes toggleEnable when user picks pause', async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
      label: en.statusBarMenu.pause,
    } as vscode.QuickPickItem);

    const handler = commandHandlers.get(COMMANDS.statusBarMenu)!;
    await handler();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(COMMANDS.toggleEnable);
  });

  it('resist.lint.statusBarMenu executes restart when user picks restart', async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
      label: en.statusBarMenu.restart,
    } as vscode.QuickPickItem);

    const handler = commandHandlers.get(COMMANDS.statusBarMenu)!;
    await handler();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(COMMANDS.restart);
  });

  it('resist.lint.statusBarMenu executes lintWorkspace when user picks it', async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
      label: en.statusBarMenu.lintWorkspace,
    } as vscode.QuickPickItem);

    const handler = commandHandlers.get(COMMANDS.statusBarMenu)!;
    await handler();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(COMMANDS.lintWorkspace);
  });

  it('resist.lint.statusBarMenu executes debugToggle when user picks it', async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
      label: en.statusBarMenu.debugToggle,
    } as vscode.QuickPickItem);

    const handler = commandHandlers.get(COMMANDS.statusBarMenu)!;
    await handler();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(COMMANDS.debugToggle);
  });

  it('resist.lint.statusBarMenu executes resume via toggleEnable when user picks resume', async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
      label: en.statusBarMenu.resume,
    } as vscode.QuickPickItem);

    const handler = commandHandlers.get(COMMANDS.statusBarMenu)!;
    await handler();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(COMMANDS.toggleEnable);
  });
});

/**
 * Isolated describe block for statusBarMenu toggle label tests.
 *
 * The main describe block's toggleEnable tests set mockReturnValue on
 * getConfiguration which persists across vi.clearAllMocks (it only clears
 * call history, not implementations). This block uses its own setup to
 * guarantee a clean ConfigManager for each enabled/disabled scenario.
 */
describe('statusBarMenu toggle label', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupWithConfig(enableValue: boolean) {
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const mockConfig = {
      get: vi.fn((_key: string, defaultValue?: unknown) =>
        _key === 'lint.enable' ? enableValue : defaultValue,
      ),
      update: vi.fn(),
      has: vi.fn(() => true),
      inspect: vi.fn(),
    };
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(
      mockConfig as unknown as vscode.WorkspaceConfiguration,
    );

    vi.mocked(vscode.commands.registerCommand).mockImplementation(
      (cmd: string, handler: (...args: unknown[]) => unknown) => {
        handlers.set(cmd, handler);
        return { dispose: vi.fn() };
      },
    );
    vi.mocked(vscode.commands.registerTextEditorCommand).mockImplementation(((
      cmd: string,
      handler: (...args: unknown[]) => unknown,
    ) => {
      handlers.set(cmd, handler);
      return { dispose: vi.fn() };
    }) as typeof vscode.commands.registerTextEditorCommand);

    const ctx = { subscriptions: [] } as unknown as vscode.ExtensionContext;
    const dc = vscode.languages.createDiagnosticCollection(
      DIAGNOSTIC_COLLECTION_NAME,
    ) as unknown as vscode.DiagnosticCollection;
    const oc = vscode.window.createOutputChannel(BRAND_NAME) as vscode.OutputChannel;
    const sm = new ToolStateManager();
    const df = new DiagnosticFilter(oc as unknown as vscode.OutputChannel);
    const si = new StageIndicator(
      vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100,
      ) as unknown as vscode.StatusBarItem,
      oc as unknown as vscode.OutputChannel,
    );
    const cm = new ConfigManager(CONFIG_SECTION);

    registerLintCommands(ctx, {
      diagnosticCollection: dc,
      outputChannel: oc as unknown as vscode.OutputChannel,
      stateManager: sm,
      lintDocumentFn: vi.fn(),
      getLintOptions: vi.fn(() => ({ stage: 'lint', categories: [], extraArgs: [] })),
      diagnosticFilter: df,
      stageIndicator: si,
      configManager: cm,
    });

    return { handlers, configManager: cm };
  }

  it('shows pause label when linter is enabled', async () => {
    const { handlers } = setupWithConfig(true);
    const handler = handlers.get(COMMANDS.statusBarMenu)!;
    await handler();

    const [items] = vi.mocked(vscode.window.showQuickPick).mock.calls[0]!;
    const labels = (items as vscode.QuickPickItem[]).map((i) => i.label);
    expect(labels).toContain(en.statusBarMenu.pause);
    expect(labels).not.toContain(en.statusBarMenu.resume);
  });

  it('shows resume label when linter is disabled', async () => {
    const { handlers } = setupWithConfig(false);
    const handler = handlers.get(COMMANDS.statusBarMenu)!;
    await handler();

    const [items] = vi.mocked(vscode.window.showQuickPick).mock.calls[0]!;
    const labels = (items as vscode.QuickPickItem[]).map((i) => i.label);
    expect(labels).toContain(en.statusBarMenu.resume);
    expect(labels).not.toContain(en.statusBarMenu.pause);
  });
});
