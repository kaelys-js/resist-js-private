/**
 * Resist Formatter — VS Code Extension
 *
 * Multi-language formatter with format-on-save, format-on-type, and format-on-paste
 * for 67+ file types using biome, prettier, and various external tools.
 *
 * @module
 */

import * as vscode from 'vscode';
import { createStatusBar } from './status-bar.js';
import { formatDocument, formatDocumentEdits, isFormattingInProgress } from './formatter.js';
import { checkAndInstallTools, showToolStatus, resetToolPrompt } from './tool-installer.js';
import { getConfig } from '@/config/loader';

// ============================================================================
// Debounce State
// ============================================================================

const debounceTimers = new Map<string, NodeJS.Timeout>();

// ============================================================================
// Activation
// ============================================================================

/**
 * Activates the Resist Formatter extension.
 *
 * Registers formatting providers, document event listeners (save, type, paste),
 * editor commands, and the status bar item.
 *
 * @param context - VS Code extension context for managing subscriptions and state
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Resist Formatter activated');

  // Create status bar
  createStatusBar(context);

  // Check for missing tools on activation
  checkAndInstallTools(context);

  // ========================================================================
  // Format on Save
  // ========================================================================

  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument((event) => {
      const config = vscode.workspace.getConfiguration('resistFormatter');
      if (config.get('enable') && config.get('formatOnSave')) {
        event.waitUntil(formatDocumentEdits(event.document));
      }
    }),
  );

  // ========================================================================
  // Format on Type (Debounced)
  // ========================================================================

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const config = vscode.workspace.getConfiguration('resistFormatter');
      if (!config.get('enable') || !config.get('formatOnType')) {
        return;
      }

      const doc = event.document;
      const uri = doc.uri.toString();

      // Only format if there were actual content changes
      if (event.contentChanges.length === 0) {
        return;
      }

      // Clear existing timer
      const existingTimer = debounceTimers.get(uri);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const debounceMs = config.get<number>('debounceMs') || 1000;
      const timer = setTimeout(async () => {
        debounceTimers.delete(uri);
        // Don't format if already formatting
        if (!isFormattingInProgress()) {
          await formatDocument(doc);
        }
      }, debounceMs);

      debounceTimers.set(uri, timer);
    }),
  );

  // ========================================================================
  // Format on Paste
  // ========================================================================

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const config = vscode.workspace.getConfiguration('resistFormatter');
      if (!config.get('enable') || !config.get('formatOnPaste')) {
        return;
      }

      // Detect paste by checking if a large amount of text was inserted
      for (const change of event.contentChanges) {
        // If text was inserted (not deleted) and it's a substantial paste
        if (change.text.length > 50 && change.rangeLength === 0) {
          // This looks like a paste operation
          formatDocument(event.document);
          break;
        }
      }
    }),
  );

  // ========================================================================
  // Clear Timers on Close
  // ========================================================================

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      debounceTimers.delete(doc.uri.toString());
    }),
  );

  // ========================================================================
  // Commands
  // ========================================================================

  // Format current file
  context.subscriptions.push(
    vscode.commands.registerCommand('resistFormatter.formatFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await formatDocument(editor.document);
      }
    }),
  );

  // Format selection (formats whole document - most formatters don't support range)
  context.subscriptions.push(
    vscode.commands.registerCommand('resistFormatter.formatSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && !editor.selection.isEmpty) {
        await formatDocument(editor.document);
      }
    }),
  );

  // Format all files
  context.subscriptions.push(
    vscode.commands.registerCommand('resistFormatter.formatAll', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      const configResult = getConfig();
      if (!configResult.ok) {
        vscode.window.showErrorMessage(`Failed to load config: ${configResult.error.message}`);
        return;
      }
      const pm: string = configResult.data.tooling.packageManager.manager;
      const pmRun = pm === 'npm' ? 'npm run' : pm;
      vscode.window.showInformationMessage(
        `Format All Files is not yet implemented. Use the CLI: ${pmRun} tool format .`,
      );
    }),
  );

  // Check & install tools
  context.subscriptions.push(
    vscode.commands.registerCommand('resistFormatter.checkTools', async () => {
      await showToolStatus(context);
    }),
  );

  // Reset tool prompt
  context.subscriptions.push(
    vscode.commands.registerCommand('resistFormatter.resetToolPrompt', async () => {
      await resetToolPrompt(context);
    }),
  );

  // ========================================================================
  // Document Formatting Provider
  // ========================================================================

  const selector: vscode.DocumentSelector = { scheme: 'file' };

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(selector, {
      provideDocumentFormattingEdits: async (document) => {
        return formatDocumentEdits(document);
      },
    }),
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentRangeFormattingEditProvider(selector, {
      provideDocumentRangeFormattingEdits: async (document, _range) => {
        // Most formatters don't support range formatting, format whole document
        return formatDocumentEdits(document);
      },
    }),
  );
}

// ============================================================================
// Deactivation
// ============================================================================

/**
 * Deactivates the extension, clearing all active debounce timers.
 */
export function deactivate(): void {
  // Clear all debounce timers
  debounceTimers.forEach((timer) => clearTimeout(timer));
  debounceTimers.clear();
}
