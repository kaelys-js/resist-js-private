/**
 * Import Sorting Integration
 *
 * Provides a command to remove unused imports detected by lint diagnostics.
 * Scans diagnostics for import-related rules and applies their fixes as a batch.
 *
 * @module
 */

import * as vscode from 'vscode';
import type { DiagnosticWithData } from './provider';
import { log } from '../shared/output';
import { en } from '../locale/en';
import { format } from '../locale/schema';
import { DIAGNOSTIC_SOURCE } from '../shared/brand';

/** Rule IDs that indicate unused/unnecessary imports. */
const IMPORT_RULE_PATTERNS: string[] = ['import', 'unused-import', 'no-unused-import'];

/**
 * Checks if a diagnostic is related to unused imports.
 *
 * @param diag - The diagnostic to check
 * @returns True if the diagnostic is about an unused import
 */
export function isImportDiagnostic(diag: vscode.Diagnostic): boolean {
  if (diag.source !== DIAGNOSTIC_SOURCE) {
    return false;
  }

  const ruleId: string =
    typeof diag.code === 'object' && diag.code !== null
      ? String((diag.code as { value: string | number }).value)
      : String(diag.code ?? '');

  const lowerRule: string = ruleId.toLowerCase();
  return IMPORT_RULE_PATTERNS.some((pattern) => lowerRule.includes(pattern));
}

/**
 * Collects fixable import-related diagnostics from a diagnostic collection.
 *
 * @param diagnostics - Array of diagnostics to filter
 * @returns Array of fixable import diagnostics
 */
export function collectImportDiagnostics(
  diagnostics: readonly vscode.Diagnostic[],
): vscode.Diagnostic[] {
  return diagnostics.filter((diag) => {
    if (!isImportDiagnostic(diag)) {
      return false;
    }
    const data = (diag as DiagnosticWithData).data;
    return data?.fix && !(data.fix.range.start === data.fix.range.end && data.fix.text === '');
  });
}

/**
 * Removes unused imports by applying fixes from import-related diagnostics.
 *
 * @param document - The document to fix
 * @param diagnosticCollection - Collection containing diagnostics
 * @param channel - Optional output channel for logging
 * @returns True if fixes were applied
 */
export async function removeUnusedImports(
  document: vscode.TextDocument,
  diagnosticCollection: vscode.DiagnosticCollection,
  channel?: vscode.OutputChannel,
): Promise<boolean> {
  const diagnostics: readonly vscode.Diagnostic[] = diagnosticCollection.get(document.uri) ?? [];

  const importDiags: vscode.Diagnostic[] = collectImportDiagnostics(diagnostics);

  if (importDiags.length === 0) {
    vscode.window.showInformationMessage(en.imports.noUnused);
    if (channel) {
      log(channel, en.imports.noUnused);
    }
    return false;
  }

  // Collect fixes
  const fixes: { start: number; end: number; text: string }[] = [];
  for (const diag of importDiags) {
    const data = (diag as DiagnosticWithData).data;
    if (data?.fix) {
      fixes.push({
        start: data.fix.range.start,
        end: data.fix.range.end,
        text: data.fix.text,
      });
    }
  }

  // Sort descending by offset
  fixes.sort((a, b) => b.start - a.start);

  const edit = new vscode.WorkspaceEdit();
  for (const fix of fixes) {
    const startPos: vscode.Position = document.positionAt(fix.start);
    const endPos: vscode.Position = document.positionAt(fix.end);
    edit.replace(document.uri, new vscode.Range(startPos, endPos), fix.text);
  }

  const applied: boolean = await vscode.workspace.applyEdit(edit);
  if (applied && channel) {
    log(channel, format(en.imports.removedCount, { count: fixes.length }));
  }

  return applied;
}
