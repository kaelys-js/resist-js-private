/**
 * Code Lens Provider
 *
 * Shows inline code lenses above lines with lint diagnostics.
 * Displays rule ID and issue count. Click opens documentation URL
 * if available, otherwise shows the output channel.
 *
 * @module
 */

import * as vscode from 'vscode';
import type { DiagnosticWithData } from './provider';
import { en } from '../locale/en';
import { format } from '../locale/schema';
import { DIAGNOSTIC_SOURCE, COMMANDS } from '../shared/brand';

/**
 * Provides code lenses for resist-linter diagnostics.
 *
 * Groups diagnostics by line and rule, showing a lens for each unique
 * rule on each line that has diagnostics.
 */
export class ResistCodeLensProvider implements vscode.CodeLensProvider {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses: vscode.Event<void> = this.onDidChangeEmitter.event;

  private readonly diagnosticCollection: vscode.DiagnosticCollection;

  /**
   * Creates a new ResistCodeLensProvider.
   *
   * @param diagnosticCollection - The diagnostic collection to read from
   */
  constructor(diagnosticCollection: vscode.DiagnosticCollection) {
    this.diagnosticCollection = diagnosticCollection;
  }

  /**
   * Provides code lenses for the given document.
   *
   * @param document - The document to provide lenses for
   * @returns Array of code lenses
   */
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const diagnostics: readonly vscode.Diagnostic[] =
      this.diagnosticCollection.get(document.uri) ?? [];

    if (diagnostics.length === 0) {
      return [];
    }

    // Group by line + ruleId
    const byLineRule = new Map<
      string,
      { line: number; ruleId: string; count: number; url?: string }
    >();

    for (const diag of diagnostics) {
      if (diag.source !== DIAGNOSTIC_SOURCE) {
        continue;
      }

      const line: number = diag.range.start.line;
      const ruleId: string =
        typeof diag.code === 'object' && diag.code !== null
          ? String((diag.code as { value: string | number }).value)
          : String(diag.code ?? 'unknown');
      const key = `${line}:${ruleId}`;

      const existing = byLineRule.get(key);
      if (existing) {
        existing.count++;
      } else {
        const data = (diag as DiagnosticWithData).data;
        byLineRule.set(key, { line, ruleId, count: 1, url: data?.url });
      }
    }

    // Create lenses
    const lenses: vscode.CodeLens[] = [];
    for (const { line, ruleId, count, url } of byLineRule.values()) {
      const range = new vscode.Range(line, 0, line, 0);
      const title: string = format(en.codeLens.issueCount, { rule: ruleId, count });

      const command: vscode.Command = url
        ? { title, command: 'vscode.open', arguments: [vscode.Uri.parse(url)] }
        : { title, command: COMMANDS.showOutput };

      lenses.push(new vscode.CodeLens(range, command));
    }

    return lenses;
  }

  /**
   * Signals that code lenses should be refreshed.
   */
  refresh(): void {
    this.onDidChangeEmitter.fire();
  }

  /**
   * Disposes the provider.
   */
  dispose(): void {
    this.onDidChangeEmitter.dispose();
  }
}
