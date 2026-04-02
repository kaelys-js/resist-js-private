/**
 * Resist — VS Code Extension Entry Point
 *
 * Unified extension for the Resist workspace. Currently provides real-time
 * linting via the resist-lint CLI. Shared foundation supports future
 * formatter integration.
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-54.md TASK 13
 *
 * @module
 */

import * as vscode from 'vscode';
import { DocumentDebouncer } from './shared/debounce';
import { createToolStatusBar, updateStatusBar, getFileDiagnosticCounts } from './shared/status-bar';
import { ToolStateManager, type ToolState } from './shared/state';
import { createOutputChannel, log, logError } from './shared/output';
import { extractMessage, safeRun, safeRunAsync } from './shared/errors';
import { resolveWorkspace } from './shared/workspace';
import { isWorkspaceDocument, forEachOpenDocument } from './shared/document-filter';
import { withFileProgress } from './shared/progress';
import { NotificationManager } from './shared/notifications';
import { LifecycleManager } from './shared/lifecycle';
import { DocumentEventRegistry } from './shared/events';
import { lintDocument, type LintOptions } from './lint/provider';
import { ResistCodeActionProvider } from './lint/code-actions';
import { FixDiffPreviewProvider } from './lint/diff-preview';
import { DiagnosticFilter } from './lint/diagnostic-filter';
import { StageIndicator } from './lint/stage-indicator';
import { FixOnSaveManager } from './lint/fix-on-save';
import { ResistCodeLensProvider } from './lint/code-lens';
import { StaleDiagnosticCleaner } from './lint/stale-cleanup';
import { ResistFormattingProvider } from './lint/formatting-provider';
import { createConfigWatcher } from './lint/watcher';
import { createBatchedFileWatcher } from './shared/file-watcher';
import { registerLintCommands } from './lint/commands';
import { en } from './locale/en';
import { ConfigManager, onConfigurationChange } from './shared/config';
import {
  BINARY_NAME,
  CONFIG_SECTION,
  CONFIG_LINT_SECTION,
  DIAGNOSTIC_COLLECTION_NAME,
  PREVIEW_SCHEME,
} from './shared/brand';

// =============================================================================
// State
// =============================================================================

let lifecycle: LifecycleManager;
let outputChannelRef: vscode.OutputChannel;

// =============================================================================
// Activation
// =============================================================================

/**
 * Activates the Resist extension.
 *
 * Creates the diagnostic collection, output channel, and status bar.
 * Registers lint event listeners, code action provider, config watcher,
 * and commands. Lints all already-open documents on activation.
 *
 * @param context - VS Code extension context for managing subscriptions
 */
export function activate(context: vscode.ExtensionContext): void {
  // Create infrastructure
  const diagnosticCollection: vscode.DiagnosticCollection =
    vscode.languages.createDiagnosticCollection(DIAGNOSTIC_COLLECTION_NAME);
  const outputChannel: vscode.OutputChannel = createOutputChannel();
  const statusBarItem: vscode.StatusBarItem = createToolStatusBar(context, 'Lint', 100);
  statusBarItem.command = COMMANDS.showOutput;

  // Store refs for deactivation
  outputChannelRef = outputChannel;
  lifecycle = new LifecycleManager();

  // State manager with observer that updates status bar
  const stateManager = new ToolStateManager(outputChannel);

  /** Maps ToolState to ExtensionState for status bar display. */
  const mapToolState = (state: ToolState): 'linting' | 'ready' | 'error' | 'disabled' => {
    switch (state) {
      case 'running':
        return 'linting';
      case 'ready':
        return 'ready';
      case 'error':
        return 'error';
      case 'disabled':
      case 'not-installed':
        return 'disabled';
    }
  };

  stateManager.onStateChange('lint', (_tool, _from, to) => {
    const mapped = mapToolState(to);
    if (mapped === 'ready') {
      const activeUri: vscode.Uri | undefined = vscode.window.activeTextEditor?.document.uri;
      if (activeUri) {
        const counts = getFileDiagnosticCounts(diagnosticCollection, activeUri);
        updateStatusBar(statusBarItem, 'ready', counts);
      } else {
        updateStatusBar(statusBarItem, 'ready');
      }
    } else {
      updateStatusBar(statusBarItem, mapped);
    }
  });

  const debouncer = new DocumentDebouncer((error: unknown) => {
    logError(outputChannel, extractMessage(error));
  });

  const notificationManager = new NotificationManager(outputChannel);

  // Typed config manager with auto-refresh on settings change
  const configManager = new ConfigManager(CONFIG_SECTION, outputChannel);

  // Feature class instances
  const diagnosticFilter = new DiagnosticFilter(outputChannel);
  const stageIndicator = new StageIndicator(statusBarItem, outputChannel);

  const fixOnSaveManager = new FixOnSaveManager(outputChannel);

  const staleDiagnosticTimeoutMs: number = configManager.get<number>(
    'lint.staleDiagnosticTimeoutMs',
    300000,
  );
  const staleDiagnosticCleaner = new StaleDiagnosticCleaner(
    staleDiagnosticTimeoutMs,
    outputChannel,
  );

  // Register resources with lifecycle (higher priority = disposed first)
  lifecycle.register('state-manager', { dispose: () => stateManager.dispose() }, 15);
  lifecycle.register('debouncer', { dispose: () => debouncer.dispose() }, 15);
  lifecycle.register('notifications', { dispose: () => notificationManager.dispose() }, 15);
  lifecycle.register('config-manager', { dispose: () => configManager.dispose() }, 15);
  lifecycle.register('diagnostic-filter', diagnosticFilter, 15);
  lifecycle.register('stage-indicator', stageIndicator, 15);
  lifecycle.register('fix-on-save', { dispose: () => fixOnSaveManager.dispose() }, 15);
  lifecycle.register('stale-cleaner', { dispose: () => staleDiagnosticCleaner.dispose() }, 10);
  lifecycle.register('diagnostics', diagnosticCollection, 5);
  lifecycle.register('output-channel', outputChannel, 0); // Last — so cleanup errors can be logged

  log(outputChannel, en.output.activated);

  // Check for resist-lint binary
  const folders: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    const workspace = resolveWorkspace(BINARY_NAME, folders[0].uri);
    if (!workspace?.binPath) {
      logError(outputChannel, en.messages.binaryNotFoundLog);
      notificationManager.warnOnce('missing-binary', en.messages.binaryNotFound);
      stateManager.setState('lint', 'disabled');
    }
  }

  // Helper: read current lint options from settings
  const getLintOptions = (): LintOptions => ({
    stage: configManager.get<string>('lint.stage', 'lint'),
    categories: configManager.get<string[]>('lint.categories', []),
    extraArgs: configManager.get<string[]>('lint.args', []),
  });

  // Helper: lint a document with current settings
  const lintDoc = (doc: vscode.TextDocument): void => {
    if (!configManager.get<boolean>('lint.enable', true)) {
      return;
    }
    void safeRunAsync(outputChannel, 'lintDocument', () =>
      lintDocument(doc, diagnosticCollection, outputChannel, stateManager, getLintOptions()),
    );
  };

  // ========================================================================
  // Code Action Provider (Quick Fixes)
  // ========================================================================

  lifecycle.register(
    'code-actions',
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file' },
      new ResistCodeActionProvider(outputChannel),
      { providedCodeActionKinds: ResistCodeActionProvider.providedCodeActionKinds },
    ),
    20,
  );

  // ========================================================================
  // Diff Preview Content Provider
  // ========================================================================

  const diffPreviewProvider = new FixDiffPreviewProvider(diagnosticCollection);
  lifecycle.register(
    'diff-preview',
    vscode.workspace.registerTextDocumentContentProvider(PREVIEW_SCHEME, diffPreviewProvider),
    20,
  );

  // ========================================================================
  // Code Lens Provider
  // ========================================================================

  if (configManager.get<boolean>('lint.codeLens', false)) {
    const codeLensProvider = new ResistCodeLensProvider(diagnosticCollection);
    lifecycle.register(
      'code-lens-provider',
      vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLensProvider),
      20,
    );
    lifecycle.register('code-lens', codeLensProvider, 20);
  }

  // ========================================================================
  // Formatting Provider (lint fixes as format-on-save)
  // ========================================================================

  if (configManager.get<boolean>('lint.formatOnSave', false)) {
    const formattingProvider = new ResistFormattingProvider(diagnosticCollection, outputChannel);
    lifecycle.register(
      'formatting-provider',
      vscode.languages.registerDocumentFormattingEditProvider(
        { scheme: 'file' },
        formattingProvider,
      ),
      20,
    );
  }

  // ========================================================================
  // Stale Diagnostic Cleanup
  // ========================================================================

  staleDiagnosticCleaner.start(diagnosticCollection);

  // ========================================================================
  // Config File Watcher
  // ========================================================================

  const watcherDisposables: vscode.Disposable[] = createConfigWatcher(lintDoc, outputChannel);
  for (let i = 0; i < watcherDisposables.length; i++) {
    lifecycle.register(`config-watcher-${i}`, watcherDisposables[i], 25);
  }

  // ========================================================================
  // Source File Watcher (external changes: git, terminal edits)
  // ========================================================================

  if (configManager.get<boolean>('lint.watchFiles', false)) {
    const sourcePatterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
    const sourceWatcherDisposables = createBatchedFileWatcher(
      sourcePatterns,
      (uris) => {
        for (const uri of uris) {
          const doc = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === uri.fsPath);
          if (doc) {
            lintDoc(doc);
          }
        }
      },
      outputChannel,
      { batchWindowMs: 1000 },
    );
    for (let i = 0; i < sourceWatcherDisposables.length; i++) {
      lifecycle.register(`source-watcher-${i}`, sourceWatcherDisposables[i], 25);
    }
  }

  // ========================================================================
  // Document Event Registry
  // ========================================================================

  const eventRegistry = new DocumentEventRegistry(outputChannel);

  eventRegistry.onOpen('lint', (doc) => {
    if (
      configManager.get<boolean>('lint.enable', true) &&
      configManager.get<boolean>('lint.onOpen', true)
    ) {
      lintDoc(doc);
    }
  });

  eventRegistry.onSave('lint', (doc) => {
    if (!configManager.get<boolean>('lint.enable', true)) {
      return;
    }
    if (configManager.get<boolean>('lint.fixOnSave', false)) {
      void safeRunAsync(outputChannel, 'fixOnSave', async () => {
        await fixOnSaveManager.handleSave(doc, diagnosticCollection);
      });
    }
    if (configManager.get<boolean>('lint.onSave', true)) {
      lintDoc(doc);
    }
  });

  eventRegistry.onChange('lint', (doc) => {
    if (
      !configManager.get<boolean>('lint.enable', true) ||
      !configManager.get<boolean>('lint.onType', true)
    ) {
      return;
    }
    staleDiagnosticCleaner.trackEdit(doc.uri);
    const debounceMs: number = configManager.get<number>('lint.debounceMs', 500);
    debouncer.schedule(doc.uri.toString(), () => lintDoc(doc), debounceMs);
  });

  eventRegistry.onClose('lint', (doc) => {
    diagnosticCollection.delete(doc.uri);
    debouncer.cancel(doc.uri.toString());
  });

  eventRegistry.initialize();
  lifecycle.register('event-registry', eventRegistry, 30);

  // ========================================================================
  // Active Editor Change — Update Status Bar Counts
  // ========================================================================

  lifecycle.register(
    'on-did-change-editor',
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      safeRun(outputChannel, 'onDidChangeEditor', () => {
        if (editor) {
          const counts = getFileDiagnosticCounts(diagnosticCollection, editor.document.uri);
          updateStatusBar(statusBarItem, 'ready', counts);
        } else {
          updateStatusBar(statusBarItem, 'ready');
        }
      });
    }),
    30,
  );

  // ========================================================================
  // Configuration Change — Re-lint if settings changed
  // ========================================================================

  lifecycle.register(
    'on-did-change-config',
    onConfigurationChange(
      CONFIG_LINT_SECTION,
      () => forEachOpenDocument(isWorkspaceDocument, lintDoc, outputChannel),
      outputChannel,
    ),
    30,
  );

  // ========================================================================
  // Commands
  // ========================================================================

  registerLintCommands(context, {
    diagnosticCollection,
    outputChannel,
    stateManager,
    lintDocumentFn: lintDoc,
    getLintOptions,
    diagnosticFilter,
    stageIndicator,
    configManager,
  });

  // ========================================================================
  // Lifecycle → VS Code Integration
  // ========================================================================

  context.subscriptions.push({ dispose: () => lifecycle.disposeAll(outputChannel) });

  // ========================================================================
  // Lint Already-Open Documents
  // ========================================================================

  if (
    configManager.get<boolean>('lint.enable', true) &&
    configManager.get<boolean>('lint.onOpen', true)
  ) {
    const openUris: vscode.Uri[] = vscode.workspace.textDocuments
      .filter((doc) => isWorkspaceDocument(doc))
      .map((doc) => doc.uri);

    void withFileProgress(outputChannel, en.progress.activation, openUris, async (uri) => {
      const doc = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === uri.fsPath);
      if (doc) {
        lintDoc(doc);
      }
    });
  }
}

// =============================================================================
// Deactivation
// =============================================================================

/**
 * Deactivates the extension.
 *
 * LifecycleManager handles priority-ordered disposal with per-resource
 * error boundaries. Output channel is disposed last so cleanup errors
 * can be logged.
 */
export function deactivate(): void {
  if (lifecycle) {
    lifecycle.disposeAll(outputChannelRef);
  }
}
