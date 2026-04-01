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
import { createStatusBar, updateStatusBar, getFileDiagnosticCounts } from './shared/status-bar';
import { createOutputChannel, log, logError } from './shared/output';
import { safeRun, safeRunAsync } from './shared/errors';
import { getBinaryPath } from './shared/workspace';
import { isWorkspaceDocument, forEachOpenDocument } from './shared/document-filter';
import { NotificationManager } from './shared/notifications';
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
import { registerLintCommands } from './lint/commands';
import { en } from './locale/en';
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

let debouncer: DocumentDebouncer;
let notificationManager: NotificationManager;
let fixOnSaveManager: FixOnSaveManager;
let staleDiagnosticCleaner: StaleDiagnosticCleaner;

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
  const statusBarItem: vscode.StatusBarItem = createStatusBar(context);

  debouncer = new DocumentDebouncer((error: unknown) => {
    logError(outputChannel, error instanceof Error ? error.message : String(error));
  });

  notificationManager = new NotificationManager(outputChannel);

  // Read activation-time config for feature flags
  const activationConfig: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration(CONFIG_SECTION);

  // Feature class instances
  const diagnosticFilter = new DiagnosticFilter(outputChannel);
  const stageIndicator = new StageIndicator(statusBarItem, outputChannel);

  fixOnSaveManager = new FixOnSaveManager(outputChannel);

  const staleDiagnosticTimeoutMs: number = activationConfig.get<number>(
    'lint.staleDiagnosticTimeoutMs',
    300000,
  );
  staleDiagnosticCleaner = new StaleDiagnosticCleaner(staleDiagnosticTimeoutMs, outputChannel);

  context.subscriptions.push(diagnosticCollection);
  context.subscriptions.push(outputChannel);
  context.subscriptions.push({ dispose: () => debouncer.dispose() });
  context.subscriptions.push({ dispose: () => notificationManager.dispose() });
  context.subscriptions.push(diagnosticFilter);
  context.subscriptions.push(stageIndicator);
  context.subscriptions.push({ dispose: () => fixOnSaveManager.dispose() });
  context.subscriptions.push({ dispose: () => staleDiagnosticCleaner.dispose() });

  log(outputChannel, en.output.activated);

  // Check for resist-lint binary
  const folders: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    const binPath: string | undefined = getBinaryPath(BINARY_NAME, folders[0].uri);
    if (!binPath) {
      logError(outputChannel, en.messages.binaryNotFoundLog);
      notificationManager.warnOnce('missing-binary', en.messages.binaryNotFound);
      updateStatusBar(statusBarItem, 'disabled');
    }
  }

  // Helper: read current lint options from settings
  const getLintOptions = (): LintOptions => {
    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(CONFIG_SECTION);
    return {
      stage: config.get<string>('lint.stage', 'lint'),
      categories: config.get<string[]>('lint.categories', []),
      extraArgs: config.get<string[]>('lint.args', []),
    };
  };

  // Helper: lint a document with current settings
  const lintDoc = (doc: vscode.TextDocument): void => {
    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(CONFIG_SECTION);
    if (!config.get<boolean>('lint.enable', true)) {
      return;
    }
    void safeRunAsync(outputChannel, 'lintDocument', () =>
      lintDocument(doc, diagnosticCollection, outputChannel, statusBarItem, getLintOptions()),
    );
  };

  // ========================================================================
  // Code Action Provider (Quick Fixes)
  // ========================================================================

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file' },
      new ResistCodeActionProvider(outputChannel),
      { providedCodeActionKinds: ResistCodeActionProvider.providedCodeActionKinds },
    ),
  );

  // ========================================================================
  // Diff Preview Content Provider
  // ========================================================================

  const diffPreviewProvider = new FixDiffPreviewProvider(diagnosticCollection);
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(PREVIEW_SCHEME, diffPreviewProvider),
  );

  // ========================================================================
  // Code Lens Provider
  // ========================================================================

  if (activationConfig.get<boolean>('lint.codeLens', false)) {
    const codeLensProvider = new ResistCodeLensProvider(diagnosticCollection);
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLensProvider),
    );
    context.subscriptions.push(codeLensProvider);
  }

  // ========================================================================
  // Formatting Provider (lint fixes as format-on-save)
  // ========================================================================

  if (activationConfig.get<boolean>('lint.formatOnSave', false)) {
    const formattingProvider = new ResistFormattingProvider(diagnosticCollection, outputChannel);
    context.subscriptions.push(
      vscode.languages.registerDocumentFormattingEditProvider(
        { scheme: 'file' },
        formattingProvider,
      ),
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
  for (const d of watcherDisposables) {
    context.subscriptions.push(d);
  }

  // ========================================================================
  // Document Event Listeners
  // ========================================================================

  // Lint on open
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      safeRun(outputChannel, 'onDidOpen', () => {
        const config: vscode.WorkspaceConfiguration =
          vscode.workspace.getConfiguration(CONFIG_SECTION);
        if (config.get<boolean>('lint.enable', true) && config.get<boolean>('lint.onOpen', true)) {
          lintDoc(doc);
        }
      });
    }),
  );

  // Lint on save + fix on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      safeRun(outputChannel, 'onDidSave', () => {
        const config: vscode.WorkspaceConfiguration =
          vscode.workspace.getConfiguration(CONFIG_SECTION);
        if (!config.get<boolean>('lint.enable', true)) {
          return;
        }
        // Auto-fix on save when enabled
        if (config.get<boolean>('lint.fixOnSave', false)) {
          void safeRunAsync(outputChannel, 'fixOnSave', async () => {
            await fixOnSaveManager.handleSave(doc, diagnosticCollection);
          });
        }
        if (config.get<boolean>('lint.onSave', true)) {
          lintDoc(doc);
        }
      });
    }),
  );

  // Lint on type (debounced)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      safeRun(outputChannel, 'onDidChange', () => {
        const config: vscode.WorkspaceConfiguration =
          vscode.workspace.getConfiguration(CONFIG_SECTION);
        if (
          !config.get<boolean>('lint.enable', true) ||
          !config.get<boolean>('lint.onType', true)
        ) {
          return;
        }

        if (event.contentChanges.length === 0) {
          return;
        }

        const doc: vscode.TextDocument = event.document;
        if (!isWorkspaceDocument(doc)) {
          return;
        }

        // Track edit for stale diagnostic cleanup
        staleDiagnosticCleaner.trackEdit(doc.uri);

        const debounceMs: number = config.get<number>('lint.debounceMs', 500);
        debouncer.schedule(doc.uri.toString(), () => lintDoc(doc), debounceMs);
      });
    }),
  );

  // Clear diagnostics on close
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      safeRun(outputChannel, 'onDidClose', () => {
        diagnosticCollection.delete(doc.uri);
        debouncer.cancel(doc.uri.toString());
      });
    }),
  );

  // ========================================================================
  // Active Editor Change — Update Status Bar Counts
  // ========================================================================

  context.subscriptions.push(
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
  );

  // ========================================================================
  // Configuration Change — Re-lint if settings changed
  // ========================================================================

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      safeRun(outputChannel, 'onDidChangeConfig', () => {
        if (event.affectsConfiguration(CONFIG_LINT_SECTION)) {
          // Re-lint all open documents with new settings
          forEachOpenDocument(isWorkspaceDocument, lintDoc, outputChannel);
        }
      });
    }),
  );

  // ========================================================================
  // Commands
  // ========================================================================

  registerLintCommands(context, {
    diagnosticCollection,
    outputChannel,
    statusBarItem,
    lintDocumentFn: lintDoc,
    getLintOptions,
    diagnosticFilter,
    stageIndicator,
  });

  // ========================================================================
  // Lint Already-Open Documents
  // ========================================================================

  if (
    activationConfig.get<boolean>('lint.enable', true) &&
    activationConfig.get<boolean>('lint.onOpen', true)
  ) {
    forEachOpenDocument(isWorkspaceDocument, lintDoc, outputChannel);
  }
}

// =============================================================================
// Deactivation
// =============================================================================

/**
 * Deactivates the extension, cleaning up debounce timers.
 * Diagnostic collection and output channel are disposed via context.subscriptions.
 */
export function deactivate(): void {
  try {
    if (debouncer) {
      debouncer.dispose();
    }
    if (notificationManager) {
      notificationManager.dispose();
    }
    if (fixOnSaveManager) {
      fixOnSaveManager.dispose();
    }
    if (staleDiagnosticCleaner) {
      staleDiagnosticCleaner.dispose();
    }
  } catch (error: unknown) {
    console.error('Deactivation error:', error instanceof Error ? error.message : String(error));
  }
}
