/**
 * Tests for Extension Entry Point
 *
 * Plan: docs/plans/2026-04-06-vscode-phase-90.md TASK 7
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

// =========================================================================
// Hoisted mocks — available inside vi.mock factories.
// vi.mock factories have no access to external scope, so ALL mock
// functions used inside them must be created via vi.hoisted().
// =========================================================================

const h = vi.hoisted(() => {
  const cfgValues: Record<string, unknown> = {};
  const binaryState = { exists: true };

  const mocks = {
    stateManager: {
      onStateChange: vi.fn(),
      setState: vi.fn(),
      getState: vi.fn(() => 'ready' as const),
      dispose: vi.fn(),
    },
    configManager: {
      get: vi.fn(<T>(key: string, defaultValue: T): T => (cfgValues[key] ?? defaultValue) as T),
      getSection: vi.fn(),
      refresh: vi.fn(),
      dispose: vi.fn(),
    },
    debouncer: {
      schedule: vi.fn(),
      cancel: vi.fn(),
      dispose: vi.fn(),
    },
    notificationManager: {
      warnOnce: vi.fn(),
      dispose: vi.fn(),
    },
    lifecycle: {
      register: vi.fn(),
      disposeAll: vi.fn(),
    },
    eventRegistry: {
      onOpen: vi.fn(),
      onSave: vi.fn(),
      onChange: vi.fn(),
      onClose: vi.fn(),
      initialize: vi.fn(),
      dispose: vi.fn(),
    },
    fixOnSaveManager: {
      handleSave: vi.fn(),
      dispose: vi.fn(),
    },
    staleDiagnosticCleaner: {
      start: vi.fn(),
      trackEdit: vi.fn(),
      dispose: vi.fn(),
    },
    diagnosticFilter: { dispose: vi.fn() },
    stageIndicator: { dispose: vi.fn() },
    statusBarItem: {
      command: undefined as string | undefined,
      dispose: vi.fn(),
    },
  };

  // Constructor mocks — must use regular functions (not arrows) to support `new`
  const DocumentDebouncerCtor = vi.fn(function () {
    return mocks.debouncer;
  });
  const ToolStateManagerCtor = vi.fn(function () {
    return mocks.stateManager;
  });
  const NotificationManagerCtor = vi.fn(function () {
    return mocks.notificationManager;
  });
  const LifecycleManagerCtor = vi.fn(function () {
    return mocks.lifecycle;
  });
  const DocumentEventRegistryCtor = vi.fn(function () {
    return mocks.eventRegistry;
  });
  const ConfigManagerCtor = vi.fn(function () {
    return mocks.configManager;
  });
  const DiagnosticFilterCtor = vi.fn(function () {
    return mocks.diagnosticFilter;
  });
  const StageIndicatorCtor = vi.fn(function () {
    return mocks.stageIndicator;
  });
  const FixOnSaveManagerCtor = vi.fn(function () {
    return mocks.fixOnSaveManager;
  });
  const StaleDiagnosticCleanerCtor = vi.fn(function () {
    return mocks.staleDiagnosticCleaner;
  });
  // Lint-side constructor mocks (also need regular functions)
  const ResistCodeActionProviderCtor = vi.fn(function () {
    return { providedCodeActionKinds: [1] };
  });
  (ResistCodeActionProviderCtor as unknown as Record<string, unknown>).providedCodeActionKinds = [
    1,
  ];
  const ResistHoverProviderCtor = vi.fn(function () {
    return {};
  });
  const FixDiffPreviewProviderCtor = vi.fn(function () {
    return {};
  });
  const ResistCodeLensProviderCtor = vi.fn(function () {
    return {};
  });
  const ResistFormattingProviderCtor = vi.fn(function () {
    return {};
  });
  /* eslint-enable func-names */

  // Function mocks
  const fn = {
    lintDocument: vi.fn(),
    registerLintCommands: vi.fn(),
    registerPanel: vi.fn(),
    createConfigWatcher: vi.fn(() => [{ dispose: vi.fn() }]),
    createBatchedFileWatcher: vi.fn(() => [{ dispose: vi.fn() }]),
    updateStatusBar: vi.fn(),
    getFileDiagnosticCounts: vi.fn(() => ({ errors: 0, warnings: 0 })),
    isLintableDocument: vi.fn(() => true),
    forEachOpenDocument: vi.fn(),
    withFileProgress: vi.fn(),
    resolveWorkspace: vi.fn(),
    log: vi.fn(),
    logError: vi.fn(),
    safeRun: vi.fn((_ch: unknown, _label: string, cb: () => void) => cb()),
    safeRunAsync: vi.fn((_ch: unknown, _label: string, cb: () => Promise<void>) => cb()),
    createOutputChannel: vi.fn(() => ({ appendLine: vi.fn(), dispose: vi.fn() })),
    createToolStatusBar: vi.fn(() => mocks.statusBarItem),
    extractMessage: vi.fn((e: unknown) => (e instanceof Error ? e.message : String(e))),
    onConfigurationChange: vi.fn(() => ({ dispose: vi.fn() })),
  };

  return {
    mocks,
    cfgValues,
    binaryState,
    fn,
    ctors: {
      DocumentDebouncer: DocumentDebouncerCtor,
      ToolStateManager: ToolStateManagerCtor,
      NotificationManager: NotificationManagerCtor,
      LifecycleManager: LifecycleManagerCtor,
      DocumentEventRegistry: DocumentEventRegistryCtor,
      ConfigManager: ConfigManagerCtor,
      DiagnosticFilter: DiagnosticFilterCtor,
      StageIndicator: StageIndicatorCtor,
      FixOnSaveManager: FixOnSaveManagerCtor,
      StaleDiagnosticCleaner: StaleDiagnosticCleanerCtor,
      ResistCodeActionProvider: ResistCodeActionProviderCtor,
      ResistHoverProvider: ResistHoverProviderCtor,
      FixDiffPreviewProvider: FixDiffPreviewProviderCtor,
      ResistCodeLensProvider: ResistCodeLensProviderCtor,
      ResistFormattingProvider: ResistFormattingProviderCtor,
    },
  };
});

// =========================================================================
// Module mocks
// =========================================================================

vi.mock('./shared/index', () => ({
  DocumentDebouncer: h.ctors.DocumentDebouncer,
  createToolStatusBar: h.fn.createToolStatusBar,
  updateStatusBar: h.fn.updateStatusBar,
  getFileDiagnosticCounts: h.fn.getFileDiagnosticCounts,
  ToolStateManager: h.ctors.ToolStateManager,
  createOutputChannel: h.fn.createOutputChannel,
  log: h.fn.log,
  logError: h.fn.logError,
  extractMessage: h.fn.extractMessage,
  safeRun: h.fn.safeRun,
  safeRunAsync: h.fn.safeRunAsync,
  resolveWorkspace: h.fn.resolveWorkspace,
  isLintableDocument: h.fn.isLintableDocument,
  forEachOpenDocument: h.fn.forEachOpenDocument,
  withFileProgress: h.fn.withFileProgress,
  NotificationManager: h.ctors.NotificationManager,
  LifecycleManager: h.ctors.LifecycleManager,
  DocumentEventRegistry: h.ctors.DocumentEventRegistry,
  createBatchedFileWatcher: h.fn.createBatchedFileWatcher,
  ConfigManager: h.ctors.ConfigManager,
  onConfigurationChange: h.fn.onConfigurationChange,
  BINARY_NAME: 'resist-lint',
  COMMANDS: {
    statusBarMenu: 'resist.lint.statusBarMenu',
    lintFile: 'resist.lint.file',
    lintWorkspace: 'resist.lint.workspace',
  },
  CONFIG_SECTION: 'resist',
  CONFIG_LINT_SECTION: 'resist.lint',
  DIAGNOSTIC_COLLECTION_NAME: 'resist-linter',
  PREVIEW_SCHEME: 'resist-fix-preview',
}));

vi.mock('./lint/index', () => ({
  lintDocument: h.fn.lintDocument,
  ResistCodeActionProvider: h.ctors.ResistCodeActionProvider,
  ResistHoverProvider: h.ctors.ResistHoverProvider,
  FixDiffPreviewProvider: h.ctors.FixDiffPreviewProvider,
  DiagnosticFilter: h.ctors.DiagnosticFilter,
  StageIndicator: h.ctors.StageIndicator,
  FixOnSaveManager: h.ctors.FixOnSaveManager,
  ResistCodeLensProvider: h.ctors.ResistCodeLensProvider,
  StaleDiagnosticCleaner: h.ctors.StaleDiagnosticCleaner,
  ResistFormattingProvider: h.ctors.ResistFormattingProvider,
  createConfigWatcher: h.fn.createConfigWatcher,
  registerLintCommands: h.fn.registerLintCommands,
}));

vi.mock('./locale/en', () => ({
  en: {
    output: { activated: 'activated' },
    messages: {
      binaryNotFoundLog: 'binary not found log',
      binaryNotFound: 'binary not found',
    },
    progress: { activation: 'Linting open files' },
  },
}));

vi.mock('./shared/panel/index', () => ({
  registerPanel: h.fn.registerPanel,
}));

// =========================================================================
// Import under test (AFTER mocks)
// =========================================================================

const { activate, deactivate } = await import('./extension');

// =========================================================================
// Capture layer
// =========================================================================

type StateChangeCallback = (tool: string, from: string, to: string) => void;
type DocHandler = (doc: vscode.TextDocument) => void;

let capturedStateCallback: StateChangeCallback | undefined;
let capturedEventHandlers: Record<string, DocHandler>;
let capturedEditorChangeCallback: ((editor: vscode.TextEditor | undefined) => void) | undefined;

// =========================================================================
// Helpers
// =========================================================================

function createMockContext(): vscode.ExtensionContext {
  return {
    subscriptions: [] as Array<{ dispose: () => void }>,
  } as unknown as vscode.ExtensionContext;
}

function createMockDoc(uri: string, isUntitled = false): vscode.TextDocument {
  return {
    uri: vscode.Uri.file(uri),
    isUntitled,
    languageId: 'typescript',
    getText: () => '',
    lineAt: () => ({ text: '' }),
    lineCount: 1,
    positionAt: () => new vscode.Position(0, 0),
    getWordRangeAtPosition: vi.fn(),
  } as unknown as vscode.TextDocument;
}

function activateAndCapture(context?: vscode.ExtensionContext): vscode.ExtensionContext {
  const ctx = context ?? createMockContext();

  h.mocks.stateManager.onStateChange.mockImplementation(
    (_tool: string, cb: StateChangeCallback) => {
      capturedStateCallback = cb;
    },
  );

  capturedEventHandlers = {};
  h.mocks.eventRegistry.onOpen.mockImplementation((_tool: string, handler: DocHandler) => {
    capturedEventHandlers['open'] = handler;
  });
  h.mocks.eventRegistry.onSave.mockImplementation((_tool: string, handler: DocHandler) => {
    capturedEventHandlers['save'] = handler;
  });
  h.mocks.eventRegistry.onChange.mockImplementation((_tool: string, handler: DocHandler) => {
    capturedEventHandlers['change'] = handler;
  });
  h.mocks.eventRegistry.onClose.mockImplementation((_tool: string, handler: DocHandler) => {
    capturedEventHandlers['close'] = handler;
  });

  vi.mocked(vscode.window.onDidChangeActiveTextEditor).mockImplementation(
    (cb: (editor: vscode.TextEditor | undefined) => void) => {
      capturedEditorChangeCallback = cb;
      return { dispose: vi.fn() };
    },
  );

  activate(ctx);
  return ctx;
}

// =========================================================================
// Tests
// =========================================================================

describe('extension', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    capturedStateCallback = undefined;
    capturedEventHandlers = {};
    capturedEditorChangeCallback = undefined;

    for (const key of Object.keys(h.cfgValues)) {
      delete h.cfgValues[key];
    }

    h.binaryState.exists = true;
    h.fn.resolveWorkspace.mockImplementation(() =>
      h.binaryState.exists ? { binPath: '/usr/bin/resist-lint', root: '/workspace' } : null,
    );

    h.mocks.stateManager.getState.mockReturnValue('ready');
    h.mocks.configManager.get.mockImplementation(
      <T>(key: string, defaultValue: T): T => (h.cfgValues[key] ?? defaultValue) as T,
    );

    // Re-set constructor implementations (cleared by clearAllMocks).
    // Must use regular functions, not arrows, to support `new`.
    h.ctors.DocumentDebouncer.mockImplementation(function () {
      return h.mocks.debouncer;
    });
    h.ctors.ToolStateManager.mockImplementation(function () {
      return h.mocks.stateManager;
    });
    h.ctors.NotificationManager.mockImplementation(function () {
      return h.mocks.notificationManager;
    });
    h.ctors.LifecycleManager.mockImplementation(function () {
      return h.mocks.lifecycle;
    });
    h.ctors.DocumentEventRegistry.mockImplementation(function () {
      return h.mocks.eventRegistry;
    });
    h.ctors.ConfigManager.mockImplementation(function () {
      return h.mocks.configManager;
    });
    h.ctors.DiagnosticFilter.mockImplementation(function () {
      return h.mocks.diagnosticFilter;
    });
    h.ctors.StageIndicator.mockImplementation(function () {
      return h.mocks.stageIndicator;
    });
    h.ctors.FixOnSaveManager.mockImplementation(function () {
      return h.mocks.fixOnSaveManager;
    });
    h.ctors.StaleDiagnosticCleaner.mockImplementation(function () {
      return h.mocks.staleDiagnosticCleaner;
    });
    h.ctors.ResistCodeActionProvider.mockImplementation(function () {
      return { providedCodeActionKinds: [1] };
    });
    (
      h.ctors.ResistCodeActionProvider as unknown as Record<string, unknown>
    ).providedCodeActionKinds = [1];
    h.ctors.ResistHoverProvider.mockImplementation(function () {
      return {};
    });
    h.ctors.FixDiffPreviewProvider.mockImplementation(function () {
      return {};
    });
    h.ctors.ResistCodeLensProvider.mockImplementation(function () {
      return {};
    });
    h.ctors.ResistFormattingProvider.mockImplementation(function () {
      return {};
    });
    h.fn.createToolStatusBar.mockReturnValue(h.mocks.statusBarItem);
    h.fn.createOutputChannel.mockReturnValue({ appendLine: vi.fn(), dispose: vi.fn() });
    h.fn.createConfigWatcher.mockReturnValue([{ dispose: vi.fn() }]);
    h.fn.createBatchedFileWatcher.mockReturnValue([{ dispose: vi.fn() }]);
    h.fn.isLintableDocument.mockReturnValue(true);
    h.fn.getFileDiagnosticCounts.mockReturnValue({ errors: 0, warnings: 0 });
    h.fn.safeRun.mockImplementation((_ch: unknown, _label: string, cb: () => void) => cb());
    h.fn.safeRunAsync.mockImplementation((_ch: unknown, _label: string, cb: () => Promise<void>) =>
      cb(),
    );
    h.fn.onConfigurationChange.mockReturnValue({ dispose: vi.fn() });

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: vscode.Uri.file('/workspace'), name: 'workspace', index: 0 }],
      configurable: true,
    });

    Object.defineProperty(vscode.workspace, 'textDocuments', {
      value: [],
      configurable: true,
    });

    Object.defineProperty(vscode.window, 'activeTextEditor', {
      value: undefined,
      configurable: true,
    });
  });

  // =========================================================================
  // activate() — Infrastructure
  // =========================================================================

  describe('activate() infrastructure', () => {
    it('creates diagnostic collection, output channel, and status bar', () => {
      activateAndCapture();

      expect(vscode.languages.createDiagnosticCollection).toHaveBeenCalledWith('resist-linter');
      expect(h.fn.createOutputChannel).toHaveBeenCalled();
      expect(h.mocks.statusBarItem.command).toBe('resist.lint.statusBarMenu');
    });

    it('registers ToolStateManager with onStateChange callback', () => {
      activateAndCapture();

      expect(h.mocks.stateManager.onStateChange).toHaveBeenCalledWith('lint', expect.any(Function));
      expect(capturedStateCallback).toBeDefined();
    });

    it('logs activation message', () => {
      activateAndCapture();

      expect(h.fn.log).toHaveBeenCalledWith(expect.anything(), 'activated');
    });

    it('registers resources with LifecycleManager', () => {
      activateAndCapture();

      expect(h.mocks.lifecycle.register).toHaveBeenCalled();
      const names = h.mocks.lifecycle.register.mock.calls.map(
        (call: unknown[]) => call[0] as string,
      );
      expect(names).toContain('state-manager');
      expect(names).toContain('debouncer');
      expect(names).toContain('diagnostics');
      expect(names).toContain('output-channel');
    });

    it('registers code action provider', () => {
      activateAndCapture();

      expect(vscode.languages.registerCodeActionsProvider).toHaveBeenCalled();
    });

    it('registers hover provider', () => {
      activateAndCapture();

      expect(vscode.languages.registerHoverProvider).toHaveBeenCalled();
    });

    it('registers diff preview content provider', () => {
      activateAndCapture();

      expect(vscode.workspace.registerTextDocumentContentProvider).toHaveBeenCalledWith(
        'resist-fix-preview',
        expect.anything(),
      );
    });

    it('starts stale diagnostic cleaner', () => {
      activateAndCapture();

      expect(h.mocks.staleDiagnosticCleaner.start).toHaveBeenCalled();
    });

    it('creates config watcher', () => {
      activateAndCapture();

      expect(h.fn.createConfigWatcher).toHaveBeenCalled();
    });

    it('initializes document event registry', () => {
      activateAndCapture();

      expect(h.mocks.eventRegistry.initialize).toHaveBeenCalled();
    });

    it('registers panel', () => {
      activateAndCapture();

      expect(h.fn.registerPanel).toHaveBeenCalled();
    });

    it('registers lint commands', () => {
      activateAndCapture();

      expect(h.fn.registerLintCommands).toHaveBeenCalled();
    });

    it('pushes lifecycle dispose to context.subscriptions', () => {
      const ctx = activateAndCapture();

      expect(ctx.subscriptions.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Binary Detection
  // =========================================================================

  describe('binary detection', () => {
    it('does not disable state when binary is found', () => {
      h.binaryState.exists = true;
      activateAndCapture();

      expect(h.mocks.stateManager.setState).not.toHaveBeenCalledWith('lint', 'disabled');
    });

    it('sets state to disabled when binary is missing', () => {
      h.binaryState.exists = false;
      activateAndCapture();

      expect(h.fn.logError).toHaveBeenCalledWith(expect.anything(), 'binary not found log');
      expect(h.mocks.notificationManager.warnOnce).toHaveBeenCalledWith(
        'missing-binary',
        'binary not found',
      );
      expect(h.mocks.stateManager.setState).toHaveBeenCalledWith('lint', 'disabled');
    });

    it('skips binary check when no workspace folders exist', () => {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: undefined,
        configurable: true,
      });
      activateAndCapture();

      expect(h.fn.resolveWorkspace).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // mapToolState (via stateManager.onStateChange)
  // =========================================================================

  describe('state change observer (mapToolState)', () => {
    it('maps "running" to updateStatusBar("linting")', () => {
      activateAndCapture();
      capturedStateCallback!('lint', 'ready', 'running');

      expect(h.fn.updateStatusBar).toHaveBeenCalledWith(h.mocks.statusBarItem, 'linting');
    });

    it('maps "ready" with active editor to updateStatusBar with counts', () => {
      Object.defineProperty(vscode.window, 'activeTextEditor', {
        value: { document: { uri: vscode.Uri.file('/src/app.ts') } },
        configurable: true,
      });
      activateAndCapture();
      capturedStateCallback!('lint', 'running', 'ready');

      expect(h.fn.getFileDiagnosticCounts).toHaveBeenCalled();
      expect(h.fn.updateStatusBar).toHaveBeenCalledWith(
        h.mocks.statusBarItem,
        'ready',
        expect.anything(),
      );
    });

    it('maps "ready" without active editor to updateStatusBar("ready")', () => {
      activateAndCapture();
      capturedStateCallback!('lint', 'running', 'ready');

      expect(h.fn.updateStatusBar).toHaveBeenCalledWith(h.mocks.statusBarItem, 'ready');
    });

    it('maps "error" to updateStatusBar("error")', () => {
      activateAndCapture();
      capturedStateCallback!('lint', 'ready', 'error');

      expect(h.fn.updateStatusBar).toHaveBeenCalledWith(h.mocks.statusBarItem, 'error');
    });

    it('maps "disabled" to updateStatusBar("disabled")', () => {
      activateAndCapture();
      capturedStateCallback!('lint', 'ready', 'disabled');

      expect(h.fn.updateStatusBar).toHaveBeenCalledWith(h.mocks.statusBarItem, 'disabled');
    });

    it('maps "not-installed" to updateStatusBar("disabled")', () => {
      activateAndCapture();
      capturedStateCallback!('lint', 'ready', 'not-installed');

      expect(h.fn.updateStatusBar).toHaveBeenCalledWith(h.mocks.statusBarItem, 'disabled');
    });
  });

  // =========================================================================
  // lintDoc (tested via event registry callbacks)
  // =========================================================================

  describe('lintDoc', () => {
    it('calls lintDocument when state is ready and lint.enable is true', () => {
      activateAndCapture();
      capturedEventHandlers['open']!(createMockDoc('/src/app.ts'));

      expect(h.fn.safeRunAsync).toHaveBeenCalled();
    });

    it('skips lintDocument when state is disabled', () => {
      h.mocks.stateManager.getState.mockReturnValue('disabled' as unknown as 'ready');
      activateAndCapture();
      capturedEventHandlers['open']!(createMockDoc('/src/app.ts'));

      expect(h.fn.safeRunAsync).not.toHaveBeenCalled();
    });

    it('skips lintDocument when lint.enable is false', () => {
      h.cfgValues['lint.enable'] = false;
      activateAndCapture();
      capturedEventHandlers['open']!(createMockDoc('/src/app.ts'));

      expect(h.fn.safeRunAsync).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Conditional Features
  // =========================================================================

  describe('conditional features', () => {
    it('registers CodeLensProvider when lint.codeLens is true', () => {
      h.cfgValues['lint.codeLens'] = true;
      activateAndCapture();

      expect(vscode.languages.registerCodeLensProvider).toHaveBeenCalled();
    });

    it('skips CodeLensProvider when lint.codeLens is false (default)', () => {
      activateAndCapture();

      expect(vscode.languages.registerCodeLensProvider).not.toHaveBeenCalled();
    });

    it('registers FormattingProvider when lint.formatOnSave is true', () => {
      h.cfgValues['lint.formatOnSave'] = true;
      activateAndCapture();

      expect(vscode.languages.registerDocumentFormattingEditProvider).toHaveBeenCalled();
    });

    it('skips FormattingProvider when lint.formatOnSave is false (default)', () => {
      activateAndCapture();

      expect(vscode.languages.registerDocumentFormattingEditProvider).not.toHaveBeenCalled();
    });

    it('creates batched file watcher when lint.watchFiles is true', () => {
      h.cfgValues['lint.watchFiles'] = true;
      activateAndCapture();

      expect(h.fn.createBatchedFileWatcher).toHaveBeenCalled();
    });

    it('skips batched file watcher when lint.watchFiles is false (default)', () => {
      activateAndCapture();

      expect(h.fn.createBatchedFileWatcher).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Configuration Change — Re-lint
  // =========================================================================

  describe('configuration change relint', () => {
    it('calls forEachOpenDocument on config change callback (line 409)', () => {
      activateAndCapture();

      // onConfigurationChange was called with (section, callback, channel)
      const configChangeCb = h.fn.onConfigurationChange.mock.calls[0]![1] as () => void;
      h.fn.forEachOpenDocument.mockClear();
      configChangeCb();

      expect(h.fn.forEachOpenDocument).toHaveBeenCalledWith(
        h.fn.isLintableDocument,
        expect.any(Function),
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // Event Registry Handlers
  // =========================================================================

  describe('event registry handlers', () => {
    it('registers all four event handlers', () => {
      activateAndCapture();

      expect(h.mocks.eventRegistry.onOpen).toHaveBeenCalledWith('lint', expect.any(Function));
      expect(h.mocks.eventRegistry.onSave).toHaveBeenCalledWith('lint', expect.any(Function));
      expect(h.mocks.eventRegistry.onChange).toHaveBeenCalledWith('lint', expect.any(Function));
      expect(h.mocks.eventRegistry.onClose).toHaveBeenCalledWith('lint', expect.any(Function));
    });

    it('onOpen does not lint when lint.onOpen is false', () => {
      h.cfgValues['lint.onOpen'] = false;
      activateAndCapture();
      capturedEventHandlers['open']!(createMockDoc('/src/app.ts'));

      expect(h.fn.safeRunAsync).not.toHaveBeenCalled();
    });

    it('onSave calls fixOnSaveManager when lint.fixOnSave is true', () => {
      h.cfgValues['lint.fixOnSave'] = true;
      activateAndCapture();
      capturedEventHandlers['save']!(createMockDoc('/src/app.ts'));

      expect(h.fn.safeRunAsync).toHaveBeenCalled();
    });

    it('onSave calls lintDoc when lint.onSave is true', () => {
      activateAndCapture();
      h.fn.safeRunAsync.mockClear();
      capturedEventHandlers['save']!(createMockDoc('/src/app.ts'));

      expect(h.fn.safeRunAsync).toHaveBeenCalled();
    });

    it('onSave does nothing when lint.enable is false', () => {
      h.cfgValues['lint.enable'] = false;
      activateAndCapture();
      h.fn.safeRunAsync.mockClear();
      capturedEventHandlers['save']!(createMockDoc('/src/app.ts'));

      expect(h.fn.safeRunAsync).not.toHaveBeenCalled();
    });

    it('onChange schedules debounced lint when enabled', () => {
      activateAndCapture();
      capturedEventHandlers['change']!(createMockDoc('/src/app.ts'));

      expect(h.mocks.staleDiagnosticCleaner.trackEdit).toHaveBeenCalled();
      expect(h.mocks.debouncer.schedule).toHaveBeenCalled();
    });

    it('onChange does nothing when lint.enable is false', () => {
      h.cfgValues['lint.enable'] = false;
      activateAndCapture();
      capturedEventHandlers['change']!(createMockDoc('/src/app.ts'));

      expect(h.mocks.debouncer.schedule).not.toHaveBeenCalled();
    });

    it('onChange does nothing when lint.onType is false', () => {
      h.cfgValues['lint.onType'] = false;
      activateAndCapture();
      capturedEventHandlers['change']!(createMockDoc('/src/app.ts'));

      expect(h.mocks.debouncer.schedule).not.toHaveBeenCalled();
    });

    it('onClose deletes diagnostics and cancels debouncer', () => {
      activateAndCapture();
      const dc = vi.mocked(vscode.languages.createDiagnosticCollection).mock.results[0]!
        .value as vscode.DiagnosticCollection;
      const doc = createMockDoc('/src/app.ts');
      capturedEventHandlers['close']!(doc);

      expect(dc.delete).toHaveBeenCalledWith(doc.uri);
      expect(h.mocks.debouncer.cancel).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Active Editor Change
  // =========================================================================

  describe('onDidChangeActiveTextEditor', () => {
    it('updates status bar with counts when editor has document', () => {
      activateAndCapture();
      h.fn.updateStatusBar.mockClear();

      capturedEditorChangeCallback!({
        document: { uri: vscode.Uri.file('/src/app.ts') },
      } as unknown as vscode.TextEditor);

      expect(h.fn.getFileDiagnosticCounts).toHaveBeenCalled();
      expect(h.fn.updateStatusBar).toHaveBeenCalledWith(
        h.mocks.statusBarItem,
        'ready',
        expect.anything(),
      );
    });

    it('updates status bar without counts when no editor', () => {
      activateAndCapture();
      h.fn.updateStatusBar.mockClear();
      capturedEditorChangeCallback!(undefined);

      expect(h.fn.updateStatusBar).toHaveBeenCalledWith(h.mocks.statusBarItem, 'ready');
    });
  });

  // =========================================================================
  // Initial Document Linting
  // =========================================================================

  describe('initial document linting', () => {
    it('lints open saved documents with progress when enabled', () => {
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [createMockDoc('/src/app.ts', false)],
        configurable: true,
      });
      activateAndCapture();

      expect(h.fn.withFileProgress).toHaveBeenCalled();
    });

    it('lints untitled documents directly when enabled', () => {
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [createMockDoc('/untitled-1', true)],
        configurable: true,
      });
      activateAndCapture();

      expect(h.fn.safeRunAsync).toHaveBeenCalled();
    });

    it('skips initial linting when lint.enable is false', () => {
      h.cfgValues['lint.enable'] = false;
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [createMockDoc('/src/app.ts', false)],
        configurable: true,
      });
      activateAndCapture();

      expect(h.fn.withFileProgress).not.toHaveBeenCalled();
    });

    it('skips initial linting when lint.onOpen is false', () => {
      h.cfgValues['lint.onOpen'] = false;
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [createMockDoc('/src/app.ts', false)],
        configurable: true,
      });
      activateAndCapture();

      expect(h.fn.withFileProgress).not.toHaveBeenCalled();
    });

    it('progress callback lints document when found by URI (line 458-461)', () => {
      const savedDoc = createMockDoc('/src/found.ts', false);
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [savedDoc],
        configurable: true,
      });
      activateAndCapture();

      // Extract the progress callback passed to withFileProgress
      const progressCb = h.fn.withFileProgress.mock.calls[0]![3] as (
        uri: vscode.Uri,
      ) => Promise<void>;
      h.fn.lintDocument.mockClear();
      progressCb(vscode.Uri.file('/src/found.ts'));

      expect(h.fn.lintDocument).toHaveBeenCalled();
    });

    it('progress callback skips when document not found by URI (line 460)', () => {
      const savedDoc = createMockDoc('/src/other.ts', false);
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [savedDoc],
        configurable: true,
      });
      activateAndCapture();

      const progressCb = h.fn.withFileProgress.mock.calls[0]![3] as (
        uri: vscode.Uri,
      ) => Promise<void>;
      h.fn.lintDocument.mockClear();
      progressCb(vscode.Uri.file('/src/missing.ts'));

      expect(h.fn.lintDocument).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Source File Watcher
  // =========================================================================

  describe('source file watcher', () => {
    it('lints matching open documents when file changes externally', () => {
      h.cfgValues['lint.watchFiles'] = true;
      const doc = createMockDoc('/src/app.ts');
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [doc],
        configurable: true,
      });
      activateAndCapture();

      const watcherCb = (h.fn.createBatchedFileWatcher.mock.calls as unknown[][])[0]![1] as (
        uris: vscode.Uri[],
      ) => void;
      h.fn.safeRunAsync.mockClear();
      watcherCb([vscode.Uri.file('/src/app.ts')]);

      expect(h.fn.safeRunAsync).toHaveBeenCalled();
    });

    it('does not lint documents not found in open editors', () => {
      h.cfgValues['lint.watchFiles'] = true;
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [],
        configurable: true,
      });
      activateAndCapture();

      const watcherCb = (h.fn.createBatchedFileWatcher.mock.calls as unknown[][])[0]![1] as (
        uris: vscode.Uri[],
      ) => void;
      h.fn.safeRunAsync.mockClear();
      watcherCb([vscode.Uri.file('/src/missing.ts')]);

      expect(h.fn.safeRunAsync).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // deactivate()
  // =========================================================================

  describe('deactivate()', () => {
    it('calls lifecycle.disposeAll when lifecycle exists', () => {
      activateAndCapture();
      deactivate();

      expect(h.mocks.lifecycle.disposeAll).toHaveBeenCalled();
    });

    it('does not crash when called before activate', () => {
      expect(() => deactivate()).not.toThrow();
    });
  });
});
