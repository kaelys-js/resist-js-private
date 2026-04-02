/**
 * Lint Commands
 *
 * Registers all lint-related commands for the Resist extension.
 *
 * @module
 */

import * as vscode from 'vscode';
import { lintWorkspace, type LintOptions, type DiagnosticWithData } from './provider';
import { showFixDiffPreview, applyFixes } from './diff-preview';
import { showTimingReport } from './profiling';
import { removeUnusedImports } from './import-sorting';
import type { DiagnosticFilter } from './diagnostic-filter';
import type { StageIndicator } from './stage-indicator';
import type { ConfigManager } from '../shared/config';
import { registerCommand, registerTextEditorCommand } from '../shared/command-registration';
import { clearCache, getBinaryPath } from '../shared/workspace';
import type { ToolStateManager } from '../shared/state';
import { withFileProgress } from '../shared/progress';
import { log, logCommand, logError } from '../shared/output';
import { runToolText } from '../shared/runner';
import { en } from '../locale/en';
import { format } from '../locale/schema';
import { BINARY_NAME, COMMANDS } from '../shared/brand';

/** Dependencies injected from the extension entry point. */
type CommandDeps = {
  readonly diagnosticCollection: vscode.DiagnosticCollection;
  readonly outputChannel: vscode.OutputChannel;
  readonly stateManager: ToolStateManager;
  readonly lintDocumentFn: (doc: vscode.TextDocument) => void;
  readonly getLintOptions: () => LintOptions;
  readonly diagnosticFilter: DiagnosticFilter;
  readonly stageIndicator: StageIndicator;
  readonly configManager: ConfigManager;
};

/**
 * Registers all lint commands on the extension context.
 *
 * @param {vscode.ExtensionContext} context - Extension context for subscription management
 * @param {CommandDeps} deps - Injected dependencies from the extension entry point
 *
 * @example
 * ```typescript
 * registerLintCommands(context, {
 *   diagnosticCollection,
 *   outputChannel,
 *   stateManager,
 *   lintDocumentFn: (doc) => lintDocument(doc, diagnosticCollection, outputChannel, stateManager, options),
 *   getLintOptions: () => ({ stage: 'lint', categories: [], extraArgs: [] }),
 *   diagnosticFilter,
 *   stageIndicator,
 *   configManager,
 * });
 * ```
 */
export function registerLintCommands(context: vscode.ExtensionContext, deps: CommandDeps): void {
  const {
    diagnosticCollection,
    outputChannel,
    stateManager,
    lintDocumentFn,
    getLintOptions,
    diagnosticFilter,
    stageIndicator,
  } = deps;

  // ========================================================================
  // Text Editor Commands (receive active editor automatically)
  // ========================================================================

  // Lint current file
  registerTextEditorCommand(context, outputChannel, COMMANDS.lintFile, (editor) => {
    lintDocumentFn(editor.document);
    return Promise.resolve();
  });

  // Apply all auto-fixable diagnostics in current file
  registerTextEditorCommand(context, outputChannel, COMMANDS.lintFix, async (editor) => {
    const fixedText: string = applyFixes(editor.document, diagnosticCollection);
    const originalText: string = editor.document.getText();

    if (fixedText === originalText) {
      vscode.window.showInformationMessage(en.messages.noFixableProblems);
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      editor.document.positionAt(0),
      editor.document.positionAt(originalText.length),
    );
    edit.replace(editor.document.uri, fullRange, fixedText);

    const applied: boolean = await vscode.workspace.applyEdit(edit);

    if (!applied) {
      logError(outputChannel, en.messages.fixRejectedLog);
      vscode.window.showErrorMessage(en.messages.fixRejected);
      return;
    }

    const diagnostics: readonly vscode.Diagnostic[] =
      diagnosticCollection.get(editor.document.uri) ?? [];
    const fixCount: number = diagnostics.filter((d) => {
      const { data } = d as DiagnosticWithData;

      return data?.fix && !(data.fix.range.start === data.fix.range.end && data.fix.text === '');
    }).length;
    log(outputChannel, format(en.messages.fixesApplied, { count: fixCount }));

    // Re-lint after fixing
    lintDocumentFn(editor.document);
  });

  // Remove unused imports
  registerTextEditorCommand(
    context,
    outputChannel,
    COMMANDS.removeUnusedImports,
    async (editor) => {
      await removeUnusedImports(editor.document, diagnosticCollection, outputChannel);
    },
  );

  // ========================================================================
  // Regular Commands
  // ========================================================================

  // Lint all files with progress bar
  registerCommand(context, outputChannel, COMMANDS.lintWorkspace, async () => {
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
          stateManager,
          getLintOptions(),
          progress,
        );
      },
    );
  });

  // Clear all diagnostics
  registerCommand(context, outputChannel, COMMANDS.lintClear, () => {
    diagnosticCollection.clear();
    stateManager.setState('lint', 'ready');
    log(outputChannel, en.messages.diagnosticsCleared);
    return Promise.resolve();
  });

  // Show available rules in output channel
  registerCommand(context, outputChannel, COMMANDS.listRules, async () => {
    const folders: readonly vscode.WorkspaceFolder[] | undefined =
      vscode.workspace.workspaceFolders;
    const [firstFolder] = folders ?? [];

    if (!firstFolder) {
      vscode.window.showErrorMessage(en.messages.noWorkspaceFolder);
      return;
    }

    const binPath: string | undefined = getBinaryPath(BINARY_NAME, firstFolder.uri);

    if (!binPath) {
      vscode.window.showErrorMessage(en.messages.binaryNotInNodeModules);
      return;
    }

    const { fsPath: cwd } = firstFolder.uri;
    logCommand(outputChannel, binPath, ['--list-rules']);

    const result = await runToolText({
      command: binPath,
      args: ['--list-rules'],
      cwd,
    });

    outputChannel.appendLine('');
    outputChannel.appendLine(en.messages.availableRulesHeader);
    if (result.ok) {
      outputChannel.appendLine(result.data);
    } else {
      outputChannel.appendLine(result.error);
    }
    outputChannel.show();
  });

  // Clear cache, re-lint all open files with progress
  registerCommand(context, outputChannel, COMMANDS.restart, async () => {
    clearCache();
    diagnosticCollection.clear();
    log(outputChannel, en.messages.linterRestarted);

    const openUris: vscode.Uri[] = vscode.workspace.textDocuments
      .filter((doc) => doc.uri.scheme === 'file' && !doc.isUntitled)
      .map((doc) => doc.uri);

    await withFileProgress(outputChannel, en.progress.restart, openUris, (uri) => {
      const doc = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === uri.fsPath);

      if (doc) {
        lintDocumentFn(doc);
      }
      return Promise.resolve();
    });
  });

  // Show output channel
  registerCommand(context, outputChannel, COMMANDS.showOutput, () => {
    outputChannel.show();
    return Promise.resolve();
  });

  // Lint only staged changes
  registerCommand(context, outputChannel, COMMANDS.lintStaged, async () => {
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
        await lintWorkspace(diagnosticCollection, outputChannel, stateManager, opts, progress);
      },
    );
  });

  // Lint only uncommitted changes
  registerCommand(context, outputChannel, COMMANDS.lintUncommitted, async () => {
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
        await lintWorkspace(diagnosticCollection, outputChannel, stateManager, opts, progress);
      },
    );
  });

  // Preview all fixes in a diff view
  registerCommand(context, outputChannel, COMMANDS.previewFixes, async () => {
    await showFixDiffPreview(diagnosticCollection, outputChannel);
  });

  // Show per-rule performance timing
  registerCommand(context, outputChannel, COMMANDS.showTiming, async () => {
    await showTimingReport(outputChannel);
  });

  // Filter diagnostics by category
  registerCommand(context, outputChannel, COMMANDS.filterByCategory, async () => {
    await diagnosticFilter.showFilterQuickPick(diagnosticCollection);
  });

  // Clear diagnostic filter
  registerCommand(context, outputChannel, COMMANDS.clearFilter, () => {
    diagnosticFilter.clearFilter(diagnosticCollection);
    return Promise.resolve();
  });

  // Change active lint stage
  registerCommand(context, outputChannel, COMMANDS.changeStage, async () => {
    await stageIndicator.showQuickPick();
  });

  // Clear output channel
  registerCommand(context, outputChannel, COMMANDS.clearOutput, () => {
    outputChannel.clear();
    log(outputChannel, en.messages.outputCleared);
    return Promise.resolve();
  });

  // Pause / Resume linter
  // State change BEFORE config.update to prevent race condition:
  // config.update fires change event during await, which triggers lintDoc.
  // If setState hasn't run yet, lintDoc sees 'ready' and re-enables linting.
  registerCommand(context, outputChannel, COMMANDS.toggleEnable, async () => {
    const config = vscode.workspace.getConfiguration('resist.lint');
    const currentValue: boolean = config.get<boolean>('enable', true);

    if (currentValue) {
      diagnosticCollection.clear();
      stateManager.setState('lint', 'disabled');
      log(outputChannel, en.messages.linterPaused);
    } else {
      stateManager.setState('lint', 'ready');
      log(outputChannel, en.messages.linterResumed);
    }

    await config.update('enable', !currentValue, vscode.ConfigurationTarget.Workspace);
  });

  // Status bar click menu
  registerCommand(context, outputChannel, COMMANDS.statusBarMenu, async () => {
    const isEnabled: boolean = deps.configManager.get<boolean>('lint.enable', true);
    const toggleLabel: string = isEnabled ? en.statusBarMenu.pause : en.statusBarMenu.resume;

    const items: vscode.QuickPickItem[] = [
      { label: toggleLabel },
      { label: en.statusBarMenu.restart },
      { label: '', kind: vscode.QuickPickItemKind.Separator },
      { label: en.statusBarMenu.lintFile },
      { label: en.statusBarMenu.lintWorkspace },
      { label: en.statusBarMenu.lintStaged },
      { label: en.statusBarMenu.lintUncommitted },
      { label: '', kind: vscode.QuickPickItemKind.Separator },
      { label: en.statusBarMenu.fixAll },
      { label: en.statusBarMenu.previewFixes },
      { label: en.statusBarMenu.removeUnusedImports },
      { label: '', kind: vscode.QuickPickItemKind.Separator },
      { label: en.statusBarMenu.filterByCategory },
      { label: en.statusBarMenu.clearFilter },
      { label: en.statusBarMenu.changeStage },
      { label: '', kind: vscode.QuickPickItemKind.Separator },
      { label: en.statusBarMenu.listRules },
      { label: en.statusBarMenu.showTiming },
      { label: '', kind: vscode.QuickPickItemKind.Separator },
      { label: en.statusBarMenu.showOutput },
      { label: en.statusBarMenu.clearOutput },
    ];

    const picked: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(items, {
      placeHolder: `${en.statusBar.tooltipPrefix} Actions`,
    });

    if (!picked) {
      return;
    }

    const commandMap: Record<string, string> = {
      [en.statusBarMenu.pause]: COMMANDS.toggleEnable,
      [en.statusBarMenu.resume]: COMMANDS.toggleEnable,
      [en.statusBarMenu.restart]: COMMANDS.restart,
      [en.statusBarMenu.lintFile]: COMMANDS.lintFile,
      [en.statusBarMenu.lintWorkspace]: COMMANDS.lintWorkspace,
      [en.statusBarMenu.lintStaged]: COMMANDS.lintStaged,
      [en.statusBarMenu.lintUncommitted]: COMMANDS.lintUncommitted,
      [en.statusBarMenu.fixAll]: COMMANDS.lintFix,
      [en.statusBarMenu.previewFixes]: COMMANDS.previewFixes,
      [en.statusBarMenu.removeUnusedImports]: COMMANDS.removeUnusedImports,
      [en.statusBarMenu.filterByCategory]: COMMANDS.filterByCategory,
      [en.statusBarMenu.clearFilter]: COMMANDS.clearFilter,
      [en.statusBarMenu.changeStage]: COMMANDS.changeStage,
      [en.statusBarMenu.listRules]: COMMANDS.listRules,
      [en.statusBarMenu.showTiming]: COMMANDS.showTiming,
      [en.statusBarMenu.showOutput]: COMMANDS.showOutput,
      [en.statusBarMenu.clearOutput]: COMMANDS.clearOutput,
    };

    const commandId: string | undefined = commandMap[picked.label];

    if (commandId) {
      await vscode.commands.executeCommand(commandId);
    }
  });
}
