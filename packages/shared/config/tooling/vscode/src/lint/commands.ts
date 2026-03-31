/**
 * Lint Commands
 *
 * Registers all lint-related commands for the Resist extension.
 *
 * @module
 */

import * as vscode from 'vscode';
import { lintWorkspace, type LintOptions, type DiagnosticWithData } from './provider';
import { clearCache, getBinaryPath } from '../shared/workspace';
import { updateStatusBar } from '../shared/status-bar';
import { log, logCommand, logError } from '../shared/output';
import { runToolJson } from '../shared/runner';

/** Dependencies injected from the extension entry point. */
interface CommandDeps {
  readonly diagnosticCollection: vscode.DiagnosticCollection;
  readonly outputChannel: vscode.OutputChannel;
  readonly statusBarItem: vscode.StatusBarItem;
  readonly lintDocumentFn: (doc: vscode.TextDocument) => void;
  readonly getLintOptions: () => LintOptions;
}

/**
 * Registers all lint commands on the extension context.
 *
 * @param context - Extension context for subscription management
 * @param deps - Injected dependencies from the extension entry point
 */
export function registerLintCommands(context: vscode.ExtensionContext, deps: CommandDeps): void {
  const { diagnosticCollection, outputChannel, statusBarItem, lintDocumentFn, getLintOptions } =
    deps;

  // resist.lint.file — Lint current file
  context.subscriptions.push(
    vscode.commands.registerCommand('resist.lint.file', () => {
      const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
      if (editor) {
        lintDocumentFn(editor.document);
      }
    }),
  );

  // resist.lint.workspace — Lint all files with progress bar
  context.subscriptions.push(
    vscode.commands.registerCommand('resist.lint.workspace', async () => {
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Resist: Linting workspace',
            cancellable: false,
          },
          async (progress) => {
            await lintWorkspace(
              diagnosticCollection,
              outputChannel,
              statusBarItem,
              getLintOptions(),
              progress,
            );
          },
        );
      } catch (err: unknown) {
        const msg: string = err instanceof Error ? err.message : String(err);
        logError(outputChannel, `Workspace lint command failed: ${msg}`);
        vscode.window.showErrorMessage(`Resist: Workspace lint failed — ${msg}`);
      }
    }),
  );

  // resist.lint.fix — Apply all auto-fixable diagnostics in current file
  context.subscriptions.push(
    vscode.commands.registerCommand('resist.lint.fix', async () => {
      try {
        const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }

        const diagnostics: readonly vscode.Diagnostic[] =
          diagnosticCollection.get(editor.document.uri) ?? [];

        // Collect fixable diagnostics
        const fixes: { start: number; end: number; text: string }[] = [];
        for (const diag of diagnostics) {
          const data = (diag as DiagnosticWithData).data;
          if (data?.fix && !(data.fix.range.start === data.fix.range.end && data.fix.text === '')) {
            fixes.push({
              start: data.fix.range.start,
              end: data.fix.range.end,
              text: data.fix.text,
            });
          }
        }

        if (fixes.length === 0) {
          vscode.window.showInformationMessage('No auto-fixable problems found');
          return;
        }

        // Sort descending by offset to avoid shift issues
        fixes.sort((a, b) => b.start - a.start);

        const edit = new vscode.WorkspaceEdit();
        for (const fix of fixes) {
          const startPos: vscode.Position = editor.document.positionAt(fix.start);
          const endPos: vscode.Position = editor.document.positionAt(fix.end);
          edit.replace(editor.document.uri, new vscode.Range(startPos, endPos), fix.text);
        }

        const applied: boolean = await vscode.workspace.applyEdit(edit);
        if (!applied) {
          logError(outputChannel, 'Failed to apply auto-fixes — workspace edit rejected');
          vscode.window.showErrorMessage('Resist: Failed to apply auto-fixes');
          return;
        }

        log(outputChannel, `Applied ${fixes.length} auto-fix(es)`);

        // Re-lint after fixing
        lintDocumentFn(editor.document);
      } catch (err: unknown) {
        const msg: string = err instanceof Error ? err.message : String(err);
        logError(outputChannel, `Fix command failed: ${msg}`);
        vscode.window.showErrorMessage(`Resist: Fix failed — ${msg}`);
      }
    }),
  );

  // resist.lint.clear — Clear all diagnostics
  context.subscriptions.push(
    vscode.commands.registerCommand('resist.lint.clear', () => {
      diagnosticCollection.clear();
      updateStatusBar(statusBarItem, 'ready');
      log(outputChannel, 'Diagnostics cleared');
    }),
  );

  // resist.lint.listRules — Show available rules in output channel
  context.subscriptions.push(
    vscode.commands.registerCommand('resist.lint.listRules', async () => {
      try {
        const folders: readonly vscode.WorkspaceFolder[] | undefined =
          vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
          vscode.window.showErrorMessage('No workspace folder open');
          return;
        }

        const binPath: string | undefined = getBinaryPath('resist-lint', folders[0].uri);
        if (!binPath) {
          vscode.window.showErrorMessage('resist-lint not found in node_modules/.bin');
          return;
        }

        const cwd: string = folders[0].uri.fsPath;
        logCommand(outputChannel, binPath, ['--list-rules']);

        const result = await runToolJson<string>({
          command: binPath,
          args: ['--list-rules'],
          cwd,
        });

        // --list-rules outputs text, not JSON, so show whatever we get
        outputChannel.appendLine('');
        outputChannel.appendLine('=== Available Rules ===');
        if (result.ok) {
          outputChannel.appendLine(
            typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2),
          );
        } else {
          // stderr likely has the text output
          outputChannel.appendLine(result.stderr || result.error);
        }
        outputChannel.show();
      } catch (err: unknown) {
        const msg: string = err instanceof Error ? err.message : String(err);
        logError(outputChannel, `List rules command failed: ${msg}`);
        vscode.window.showErrorMessage(`Resist: Failed to list rules — ${msg}`);
      }
    }),
  );

  // resist.lint.restart — Clear cache, re-lint all open files
  context.subscriptions.push(
    vscode.commands.registerCommand('resist.lint.restart', () => {
      clearCache();
      diagnosticCollection.clear();
      log(outputChannel, 'Linter restarted — cache cleared, re-linting open files');

      for (const doc of vscode.workspace.textDocuments) {
        if (doc.uri.scheme === 'file' && !doc.isUntitled) {
          lintDocumentFn(doc);
        }
      }
    }),
  );

  // resist.lint.showOutput — Show output channel
  context.subscriptions.push(
    vscode.commands.registerCommand('resist.lint.showOutput', () => {
      outputChannel.show();
    }),
  );

  // resist.lint.staged — Lint only staged changes
  context.subscriptions.push(
    vscode.commands.registerCommand('resist.lint.staged', async () => {
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Resist: Linting staged changes',
            cancellable: false,
          },
          async (progress) => {
            const opts: LintOptions = {
              ...getLintOptions(),
              extraArgs: [...(getLintOptions().extraArgs ?? []), '--diff=staged'],
            };
            await lintWorkspace(diagnosticCollection, outputChannel, statusBarItem, opts, progress);
          },
        );
      } catch (err: unknown) {
        const msg: string = err instanceof Error ? err.message : String(err);
        logError(outputChannel, `Lint staged command failed: ${msg}`);
        vscode.window.showErrorMessage(`Resist: Lint staged failed — ${msg}`);
      }
    }),
  );

  // resist.lint.uncommitted — Lint only uncommitted changes
  context.subscriptions.push(
    vscode.commands.registerCommand('resist.lint.uncommitted', async () => {
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Resist: Linting uncommitted changes',
            cancellable: false,
          },
          async (progress) => {
            const opts: LintOptions = {
              ...getLintOptions(),
              extraArgs: [...(getLintOptions().extraArgs ?? []), '--diff=head'],
            };
            await lintWorkspace(diagnosticCollection, outputChannel, statusBarItem, opts, progress);
          },
        );
      } catch (err: unknown) {
        const msg: string = err instanceof Error ? err.message : String(err);
        logError(outputChannel, `Lint uncommitted command failed: ${msg}`);
        vscode.window.showErrorMessage(`Resist: Lint uncommitted failed — ${msg}`);
      }
    }),
  );
}
