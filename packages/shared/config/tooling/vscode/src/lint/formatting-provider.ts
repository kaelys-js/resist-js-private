/**
 * Format-on-Save Integration
 *
 * Registers as a DocumentFormattingEditProvider so lint auto-fixes
 * can run as part of VS Code's format-on-save pipeline.
 *
 * @module
 */

import * as vscode from 'vscode';
import type { DiagnosticWithData } from './provider';
import { log } from '../shared/output';
import { en } from '../locale/en';
import { format } from '../locale/schema';

/**
 * Document formatting provider that applies lint auto-fixes.
 *
 * When registered, VS Code calls this provider during format-on-save.
 * It collects all auto-fixable diagnostics and returns them as TextEdits.
 */
export class ResistFormattingProvider implements vscode.DocumentFormattingEditProvider {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;
  private readonly channel?: vscode.OutputChannel;

  /**
   * Creates a new ResistFormattingProvider.
   *
   * @param diagnosticCollection - Collection containing fixable diagnostics
   * @param channel - Optional output channel for logging
   */
  constructor(diagnosticCollection: vscode.DiagnosticCollection, channel?: vscode.OutputChannel) {
    this.diagnosticCollection = diagnosticCollection;
    this.channel = channel;
  }

  /**
   * Provides formatting edits by converting lint fixes to TextEdits.
   *
   * @param document - The document to format
   * @returns Array of TextEdits to apply
   */
  provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
    const diagnostics: readonly vscode.Diagnostic[] =
      this.diagnosticCollection.get(document.uri) ?? [];

    const edits: vscode.TextEdit[] = [];

    for (const diag of diagnostics) {
      const data = (diag as DiagnosticWithData).data;
      if (!data?.fix) {
        continue;
      }

      // Skip no-op fixes
      if (data.fix.range.start === data.fix.range.end && data.fix.text === '') {
        continue;
      }

      // Validate bounds
      const docLength: number = document.getText().length;
      if (
        data.fix.range.start < 0 ||
        data.fix.range.end < 0 ||
        data.fix.range.start > docLength ||
        data.fix.range.end > docLength
      ) {
        continue;
      }

      const startPos: vscode.Position = document.positionAt(data.fix.range.start);
      const endPos: vscode.Position = document.positionAt(data.fix.range.end);
      edits.push(vscode.TextEdit.replace(new vscode.Range(startPos, endPos), data.fix.text));
    }

    if (this.channel) {
      if (edits.length > 0) {
        log(this.channel, format(en.formatting.applied, { count: edits.length }));
      } else {
        log(this.channel, en.formatting.noEdits);
      }
    }

    return edits;
  }
}
