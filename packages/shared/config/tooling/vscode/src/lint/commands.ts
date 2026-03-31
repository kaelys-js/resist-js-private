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
import { safeRunAsync } from '../shared/errors';
import { runToolJson } from '../shared/runner';
import { en } from '../locale/en';
import { format } from '../locale/schema';
import { BINARY_NAME, COMMANDS } from '../shared/brand';

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

  // Lint current file
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.lintFile, () => {
      const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
      if (editor) {
        lintDocumentFn(editor.document);
      }
    }),
  );

  // Lint all files with progress bar
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.lintWorkspace, () =>
      safeRunAsync(outputChannel, COMMANDS.lintWorkspace, async () => {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: en.progress.workspace,
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
      }),
    ),
  );

  // Apply all auto-fixable diagnostics in current file
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.lintFix, () =>
      safeRunAsync(outputChannel, COMMANDS.lintFix, async () => {
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
          vscode.window.showInformationMessage(en.messages.noFixableProblems);
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
          logError(outputChannel, en.messages.fixRejectedLog);
          vscode.window.showErrorMessage(en.messages.fixRejected);
          return;
        }

        log(outputChannel, format(en.messages.fixesApplied, { count: fixes.length }));

        // Re-lint after fixing
        lintDocumentFn(editor.document);
      }),
    ),
  );

  // Clear all diagnostics
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.lintClear, () => {
      diagnosticCollection.clear();
      updateStatusBar(statusBarItem, 'ready');
      log(outputChannel, en.messages.diagnosticsCleared);
    }),
  );

  // Show available rules in output channel
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.listRules, () =>
      safeRunAsync(outputChannel, COMMANDS.listRules, async () => {
        const folders: readonly vscode.WorkspaceFolder[] | undefined =
          vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
          vscode.window.showErrorMessage(en.messages.noWorkspaceFolder);
          return;
        }

        const binPath: string | undefined = getBinaryPath(BINARY_NAME, folders[0].uri);
        if (!binPath) {
          vscode.window.showErrorMessage(en.messages.binaryNotInNodeModules);
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
        outputChannel.appendLine(en.messages.availableRulesHeader);
        if (result.ok) {
          outputChannel.appendLine(
            typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2),
          );
        } else {
          // stderr likely has the text output
          outputChannel.appendLine(result.stderr || result.error);
        }
        outputChannel.show();
      }),
    ),
  );

  // Clear cache, re-lint all open files
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.restart, () => {
      clearCache();
      diagnosticCollection.clear();
      log(outputChannel, en.messages.linterRestarted);

      for (const doc of vscode.workspace.textDocuments) {
        if (doc.uri.scheme === 'file' && !doc.isUntitled) {
          lintDocumentFn(doc);
        }
      }
    }),
  );

  // Show output channel
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.showOutput, () => {
      outputChannel.show();
    }),
  );

  // Lint only staged changes
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.lintStaged, () =>
      safeRunAsync(outputChannel, COMMANDS.lintStaged, async () => {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: en.progress.staged,
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
      }),
    ),
  );

  // Lint only uncommitted changes
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.lintUncommitted, () =>
      safeRunAsync(outputChannel, COMMANDS.lintUncommitted, async () => {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: en.progress.uncommitted,
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
      }),
    ),
  );
}
