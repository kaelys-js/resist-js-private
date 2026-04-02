/**
 * Code Action Provider (Quick Fixes)
 *
 * Implements vscode.CodeActionProvider to offer auto-fix suggestions from
 * lint results. Uses the fix data stored on each diagnostic by the provider.
 *
 * @module
 */

import * as vscode from 'vscode';
import type { DiagnosticWithData } from './provider';
import { extractMessage } from '../shared/errors';
import { logError } from '../shared/output';
import { en } from '../locale/en';
import { format } from '../locale/schema';
import { DIAGNOSTIC_SOURCE, DISABLE_NEXT_LINE_PREFIX, DISABLE_FILE_PREFIX } from '../shared/brand';

/**
 * Provides quick fix code actions for resist-linter diagnostics.
 *
 * For each diagnostic with a non-empty fix, creates a CodeAction that
 * replaces the byte range with the fix text. Also offers a "Fix all"
 * action when multiple fixable diagnostics exist in the file.
 */
export class ResistCodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];
  private readonly outputChannel: vscode.OutputChannel;

  /**
   * Creates a new ResistCodeActionProvider.
   *
   * @param outputChannel - Output channel for logging errors during code action creation
   */
  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const fixableDiagnostics: vscode.Diagnostic[] = [];
    const resistDiagnostics: vscode.Diagnostic[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== DIAGNOSTIC_SOURCE) {
        continue;
      }

      resistDiagnostics.push(diagnostic);

      const { data } = diagnostic as DiagnosticWithData;

      if (!data?.fix) {
        continue;
      }

      // Skip no-op fixes (start === end && text is empty)
      if (data.fix.range.start === data.fix.range.end && data.fix.text === '') {
        continue;
      }

      // Validate byte offsets before conversion
      const docLength: number = document.getText().length;

      if (
        data.fix.range.start < 0 ||
        data.fix.range.end < 0 ||
        data.fix.range.start > docLength ||
        data.fix.range.end > docLength
      ) {
        continue; // Skip fixes with out-of-bounds offsets
      }

      fixableDiagnostics.push(diagnostic);

      // Create individual fix action
      const title: string = data.tip
        ? format(en.codeActions.fixWithTip, { rule: String(diagnostic.code), tip: data.tip })
        : format(en.codeActions.fix, { rule: String(diagnostic.code) });

      try {
        const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        action.diagnostics = [diagnostic];
        action.isPreferred = true;

        // Create workspace edit from byte offsets
        const edit = new vscode.WorkspaceEdit();
        const startPos: vscode.Position = document.positionAt(data.fix.range.start);
        const endPos: vscode.Position = document.positionAt(data.fix.range.end);
        const fixRange = new vscode.Range(startPos, endPos);
        edit.replace(document.uri, fixRange, data.fix.text);
        action.edit = edit;

        actions.push(action);
      } catch (error: unknown) {
        logError(
          this.outputChannel,
          format(en.codeActions.actionFailed, {
            rule: String(diagnostic.code),
            error: extractMessage(error),
          }),
        );
        continue;
      }
    }

    // "Fix all" action when multiple fixable diagnostics exist
    if (fixableDiagnostics.length > 1) {
      try {
        const fixAllAction = new vscode.CodeAction(
          format(en.codeActions.fixAll, { count: fixableDiagnostics.length }),
          vscode.CodeActionKind.QuickFix,
        );
        fixAllAction.diagnostics = fixableDiagnostics;

        const edit = new vscode.WorkspaceEdit();

        // Sort fixes by byte offset descending to avoid offset shifting
        const fixes: Array<{ start: number; end: number; text: string }> = [];

        for (const diag of fixableDiagnostics) {
          const { data } = diag as DiagnosticWithData;

          if (data?.fix) {
            fixes.push({
              start: data.fix.range.start,
              end: data.fix.range.end,
              text: data.fix.text,
            });
          }
        }
        fixes.sort((a, b) => b.start - a.start);

        for (const fix of fixes) {
          const startPos: vscode.Position = document.positionAt(fix.start);
          const endPos: vscode.Position = document.positionAt(fix.end);
          edit.replace(document.uri, new vscode.Range(startPos, endPos), fix.text);
        }

        fixAllAction.edit = edit;
        actions.push(fixAllAction);
      } catch (error: unknown) {
        logError(
          this.outputChannel,
          format(en.codeActions.fixAllFailed, {
            error: extractMessage(error),
          }),
        );
      }
    }

    // Per-rule disable actions for each resist diagnostic
    for (const diagnostic of resistDiagnostics) {
      const ruleId: string =
        typeof diagnostic.code === 'object' && diagnostic.code !== null
          ? String((diagnostic.code as { value: string | number }).value)
          : String(diagnostic.code ?? 'unknown');

      try {
        // "Disable [rule] for this line"
        const lineTitle: string = format(en.codeActions.disableLine, { rule: ruleId });
        const lineAction = new vscode.CodeAction(lineTitle, vscode.CodeActionKind.QuickFix);
        lineAction.diagnostics = [diagnostic];
        lineAction.isPreferred = false;

        const lineEdit = new vscode.WorkspaceEdit();
        const diagLine: number = diagnostic.range.start.line;
        const lineText: string = document.lineAt(diagLine).text;
        const indent: string = lineText.match(/^(\s*)/)?.[1] ?? '';
        const disableComment = `${indent}// ${DISABLE_NEXT_LINE_PREFIX}: ${ruleId}\n`;
        lineEdit.replace(document.uri, new vscode.Range(diagLine, 0, diagLine, 0), disableComment);
        lineAction.edit = lineEdit;
        actions.push(lineAction);

        // "Disable [rule] for this file"
        const fileTitle: string = format(en.codeActions.disableFile, { rule: ruleId });
        const fileAction = new vscode.CodeAction(fileTitle, vscode.CodeActionKind.QuickFix);
        fileAction.diagnostics = [diagnostic];
        fileAction.isPreferred = false;

        const fileEdit = new vscode.WorkspaceEdit();
        const fileDisableComment = `// ${DISABLE_FILE_PREFIX}: ${ruleId}\n`;
        fileEdit.replace(document.uri, new vscode.Range(0, 0, 0, 0), fileDisableComment);
        fileAction.edit = fileEdit;
        actions.push(fileAction);
      } catch (error: unknown) {
        logError(
          this.outputChannel,
          format(en.codeActions.disableFailed, {
            rule: ruleId,
            error: extractMessage(error),
          }),
        );
      }
    }

    return actions;
  }
}
