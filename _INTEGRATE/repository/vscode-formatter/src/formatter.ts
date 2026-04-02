/**
 * Formatter Integration
 *
 * Wraps the @/cli formatter library for VS Code.
 *
 * @module
 */

import * as vscode from 'vscode';
import { writeFileSync } from 'node:fs';
import { getFormatterForFile, getAllFormatters } from '@/cli/format/registry';
import { format } from '@/cli/format/runner';
import type { FormatterDefinition } from '@/cli/format/types';
import { updateStatusBar } from './status-bar.js';

// ============================================================================
// Re-exports from @/cli
// ============================================================================

export { getFormatterForFile, getAllFormatters };
export type { FormatterDefinition };

// ============================================================================
// VS Code Integration
// ============================================================================

let isFormatting = false;

/**
 * Formats a VS Code document by applying text edits in place.
 *
 * @param document - The VS Code text document to format
 */
export async function formatDocument(document: vscode.TextDocument): Promise<void> {
  const edits = await formatDocumentEdits(document);
  if (edits && edits.length > 0) {
    const edit = new vscode.WorkspaceEdit();
    edit.set(document.uri, edits);
    await vscode.workspace.applyEdit(edit);
  }
}

/**
 * Formats a VS Code document and returns the resulting text edits.
 *
 * Writes the document to disk, runs the appropriate formatter, and returns
 * a full-document replacement edit if the content changed.
 *
 * @param document - The VS Code text document to format
 * @returns Array of text edits, or `null` if no changes were made
 */
export async function formatDocumentEdits(
  document: vscode.TextDocument,
): Promise<vscode.TextEdit[] | null> {
  if (document.uri.scheme !== 'file' || document.isUntitled) {
    return null;
  }

  const filePath = document.uri.fsPath;
  const formatter = getFormatterForFile(filePath);

  if (!formatter) {
    return null; // No formatter for this file type
  }

  isFormatting = true;
  updateStatusBar('formatting');

  try {
    // Save current content to disk (formatters read from disk)
    const originalContent = document.getText();
    writeFileSync(filePath, originalContent);

    const result = format(filePath, formatter, false);

    if (!result.formatted) {
      console.error('Format error:', result.error);
      updateStatusBar('error');
      isFormatting = false;
      return null;
    }

    if (result.content && result.content !== originalContent) {
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(originalContent.length),
      );
      updateStatusBar('ready');
      isFormatting = false;
      return [vscode.TextEdit.replace(fullRange, result.content)];
    }

    updateStatusBar('ready');
    isFormatting = false;
    return null;
  } catch (error) {
    console.error('Format error:', error);
    updateStatusBar('error');
    isFormatting = false;
    return null;
  }
}

/**
 * Returns whether formatting is currently in progress.
 *
 * @returns `true` if a format operation is active
 */
export function isFormattingInProgress(): boolean {
  return isFormatting;
}
