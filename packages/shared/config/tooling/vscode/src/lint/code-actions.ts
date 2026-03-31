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

/**
 * Provides quick fix code actions for resist-linter diagnostics.
 *
 * For each diagnostic with a non-empty fix, creates a CodeAction that
 * replaces the byte range with the fix text. Also offers a "Fix all"
 * action when multiple fixable diagnostics exist in the file.
 */
export class ResistCodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const fixableDiagnostics: vscode.Diagnostic[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'resist-linter') {
        continue;
      }

      const data = (diagnostic as DiagnosticWithData).data;
      if (!data?.fix) {
        continue;
      }

      // Skip no-op fixes (start === end && text is empty)
      if (data.fix.range.start === data.fix.range.end && data.fix.text === '') {
        continue;
      }

      fixableDiagnostics.push(diagnostic);

      // Create individual fix action
      const title: string = data.tip
        ? `Fix: ${String(diagnostic.code)} \u2014 ${data.tip}`
        : `Fix: ${String(diagnostic.code)}`;

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
    }

    // "Fix all" action when multiple fixable diagnostics exist
    if (fixableDiagnostics.length > 1) {
      const fixAllAction = new vscode.CodeAction(
        `Fix all auto-fixable problems (${fixableDiagnostics.length})`,
        vscode.CodeActionKind.QuickFix,
      );
      fixAllAction.diagnostics = fixableDiagnostics;

      const edit = new vscode.WorkspaceEdit();

      // Sort fixes by byte offset descending to avoid offset shifting
      const fixes: { start: number; end: number; text: string }[] = [];
      for (const diag of fixableDiagnostics) {
        const data = (diag as DiagnosticWithData).data;
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
    }

    return actions;
  }
}
