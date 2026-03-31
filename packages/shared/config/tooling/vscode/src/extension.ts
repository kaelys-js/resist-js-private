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
import { lintDocument, type LintOptions } from './lint/provider';
import { ResistCodeActionProvider } from './lint/code-actions';
import { createConfigWatcher } from './lint/watcher';
import { registerLintCommands } from './lint/commands';
import { en } from './locale/en';

// =============================================================================
// State
// =============================================================================

let debouncer: DocumentDebouncer;
let hasWarnedMissingBinary = false;

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
    vscode.languages.createDiagnosticCollection('resist-linter');
  const outputChannel: vscode.OutputChannel = createOutputChannel();
  const statusBarItem: vscode.StatusBarItem = createStatusBar(context);

  debouncer = new DocumentDebouncer((error: unknown) => {
    logError(outputChannel, error instanceof Error ? error.message : String(error));
  });

  context.subscriptions.push(diagnosticCollection);
  context.subscriptions.push(outputChannel);
  context.subscriptions.push({ dispose: () => debouncer.dispose() });

  log(outputChannel, en.output.activated);

  // Check for resist-lint binary
  const folders: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    const binPath: string | undefined = getBinaryPath('resist-lint', folders[0].uri);
    if (!binPath) {
      logError(outputChannel, en.messages.binaryNotFoundLog);
      if (!hasWarnedMissingBinary) {
        vscode.window.showWarningMessage(en.messages.binaryNotFound);
        hasWarnedMissingBinary = true;
      }
      updateStatusBar(statusBarItem, 'disabled');
    }
  }

  // Helper: read current lint options from settings
  const getLintOptions = (): LintOptions => {
    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('resist');
    return {
      stage: config.get<string>('lint.stage', 'lint'),
      categories: config.get<string[]>('lint.categories', []),
      extraArgs: config.get<string[]>('lint.args', []),
    };
  };

  // Helper: lint a document with current settings
  const lintDoc = (doc: vscode.TextDocument): void => {
    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('resist');
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
      new ResistCodeActionProvider(),
      { providedCodeActionKinds: ResistCodeActionProvider.providedCodeActionKinds },
    ),
  );

  // ========================================================================
  // Config File Watcher
  // ========================================================================

  const watcherDisposables: vscode.Disposable[] = createConfigWatcher(lintDoc);
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
        const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('resist');
        if (config.get<boolean>('lint.enable', true) && config.get<boolean>('lint.onOpen', true)) {
          lintDoc(doc);
        }
      });
    }),
  );

  // Lint on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      safeRun(outputChannel, 'onDidSave', () => {
        const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('resist');
        if (config.get<boolean>('lint.enable', true) && config.get<boolean>('lint.onSave', true)) {
          lintDoc(doc);
        }
      });
    }),
  );

  // Lint on type (debounced)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      safeRun(outputChannel, 'onDidChange', () => {
        const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('resist');
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
        if (doc.uri.scheme !== 'file' || doc.isUntitled) {
          return;
        }

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
        if (event.affectsConfiguration('resist.lint')) {
          // Re-lint all open documents with new settings
          for (const doc of vscode.workspace.textDocuments) {
            if (doc.uri.scheme === 'file' && !doc.isUntitled) {
              lintDoc(doc);
            }
          }
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
  });

  // ========================================================================
  // Lint Already-Open Documents
  // ========================================================================

  for (const doc of vscode.workspace.textDocuments) {
    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('resist');
    if (config.get<boolean>('lint.enable', true) && config.get<boolean>('lint.onOpen', true)) {
      if (doc.uri.scheme === 'file' && !doc.isUntitled) {
        lintDoc(doc);
      }
    }
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
  } catch {
    // Best-effort cleanup — extension host is shutting down
  }
}
