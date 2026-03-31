/**
 * Diff Preview for Fixes
 *
 * Shows a side-by-side diff of the current file vs. a version with all
 * auto-fixes applied. Users can review changes before committing to "Fix All".
 *
 * @module
 */

import * as vscode from 'vscode';
import type { DiagnosticWithData } from './provider';
import { log } from '../shared/output';
import { en } from '../locale/en';
import { format } from '../locale/schema';

/** URI scheme for virtual fix preview documents. */
const PREVIEW_SCHEME = 'resist-fix-preview';

/**
 * Content provider for virtual documents showing fixed file content.
 *
 * Reads the original document text, applies all auto-fixes, and returns
 * the resulting content for display in a diff editor.
 */
export class FixDiffPreviewProvider implements vscode.TextDocumentContentProvider {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;

  /**
   * Creates a new FixDiffPreviewProvider.
   *
   * @param diagnosticCollection - Collection to read fixable diagnostics from
   */
  constructor(diagnosticCollection: vscode.DiagnosticCollection) {
    this.diagnosticCollection = diagnosticCollection;
  }

  /**
   * Provides content for a virtual preview document.
   *
   * @param uri - The virtual document URI (encodes the original file path)
   * @returns The file content with all fixes applied
   */
  provideTextDocumentContent(uri: vscode.Uri): string {
    // Decode the original file path from the URI
    const originalPath: string = uri.path;
    const originalUri: vscode.Uri = vscode.Uri.file(originalPath);

    // Find the original document
    const doc: vscode.TextDocument | undefined = vscode.workspace.textDocuments.find(
      (d) => d.uri.fsPath === originalUri.fsPath,
    );

    if (!doc) {
      return '';
    }

    return applyFixes(doc, this.diagnosticCollection);
  }
}

/**
 * Applies all auto-fixes to a document's text and returns the result.
 *
 * @param doc - The document to apply fixes to
 * @param collection - The diagnostic collection containing fixes
 * @returns The fixed text content
 */
export function applyFixes(
  doc: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
): string {
  const diagnostics: readonly vscode.Diagnostic[] = collection.get(doc.uri) ?? [];

  // Collect all fixes
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
    return doc.getText();
  }

  // Sort by offset descending to avoid shifting
  fixes.sort((a, b) => b.start - a.start);

  let text: string = doc.getText();
  for (const fix of fixes) {
    text = text.slice(0, fix.start) + fix.text + text.slice(fix.end);
  }

  return text;
}

/**
 * Opens a diff preview showing fixes for the active document.
 *
 * @param diagnosticCollection - Collection containing fix data
 * @param channel - Optional output channel for logging
 */
export async function showFixDiffPreview(
  diagnosticCollection: vscode.DiagnosticCollection,
  channel?: vscode.OutputChannel,
): Promise<void> {
  const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const doc: vscode.TextDocument = editor.document;
  const diagnostics: readonly vscode.Diagnostic[] = diagnosticCollection.get(doc.uri) ?? [];

  // Check if there are any fixable diagnostics
  const hasFixable: boolean = diagnostics.some((diag) => {
    const data = (diag as DiagnosticWithData).data;
    return data?.fix && !(data.fix.range.start === data.fix.range.end && data.fix.text === '');
  });

  if (!hasFixable) {
    vscode.window.showInformationMessage(en.diffPreview.noFixes);
    if (channel) {
      log(channel, en.diffPreview.noFixes);
    }
    return;
  }

  const previewUri: vscode.Uri = vscode.Uri.parse(`${PREVIEW_SCHEME}:${doc.uri.fsPath}`);

  const title: string = format(en.diffPreview.title, {
    file: doc.uri.fsPath.split('/').pop() ?? 'unknown',
  });

  await vscode.commands.executeCommand('vscode.diff', doc.uri, previewUri, title);
}
