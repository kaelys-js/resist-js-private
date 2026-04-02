/**
 * Document Filter/Selector
 *
 * Reusable predicates for filtering VS Code documents by scheme, language,
 * and state. Eliminates repeated `doc.uri.scheme === 'file' && !doc.isUntitled`
 * checks across extension.ts, provider.ts, and commands.ts.
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 1
 *
 * @module
 */

import * as vscode from 'vscode';
import { extractMessage } from './errors';
import { logError } from './output';
import { format } from '../locale/schema';
import { en } from '../locale/en';

/**
 * Checks whether a document is a workspace file (not untitled, file scheme).
 *
 * @param {vscode.TextDocument} doc - The document to check
 * @returns {boolean} true if the document is a workspace file
 *
 * @example
 * ```typescript
 * const editor = vscode.window.activeTextEditor;
 * if (editor && isWorkspaceDocument(editor.document)) {
 *   await lintDocument(editor.document);
 * }
 * ```
 */
export function isWorkspaceDocument(doc: vscode.TextDocument): boolean {
  return doc.uri.scheme === 'file' && !doc.isUntitled;
}

/** Language IDs that resist-lint can process on untitled documents. */
const LINTABLE_LANGUAGES: ReadonlySet<string> = new Set([
  'typescript',
  'typescriptreact',
  'javascript',
  'javascriptreact',
  'svelte',
  'astro',
  'html',
  'vue',
  'markdown',
  'mdx',
]);

/**
 * Checks whether a document can be linted (workspace file OR untitled with supported language).
 *
 * @param {vscode.TextDocument} doc - The document to check
 * @returns {boolean} true if the document can be linted
 *
 * @example
 * ```typescript
 * if (isLintableDocument(doc)) {
 *   await lintDocument(doc, collection, channel, stateManager, options);
 * }
 * ```
 */
export function isLintableDocument(doc: vscode.TextDocument): boolean {
  if (isWorkspaceDocument(doc)) {
    return true;
  }
  return (
    (doc.isUntitled || doc.uri.scheme === 'untitled') && LINTABLE_LANGUAGES.has(doc.languageId)
  );
}

/**
 * Iterates over all open workspace documents, applying a filter and action.
 *
 * Catches per-document errors and continues processing remaining documents.
 * Errors are logged to the output channel — never swallowed.
 *
 * @param {(doc: vscode.TextDocument) => boolean} filter - Predicate to select documents
 * @param {(doc: vscode.TextDocument) => void} action - Callback to execute for each matching document
 * @param {vscode.OutputChannel} [channel] - Optional output channel for error logging
 *
 * @example
 * ```typescript
 * forEachOpenDocument(
 *   isWorkspaceDocument,
 *   (doc) => lintDocument(doc),
 *   outputChannel,
 * );
 * ```
 */
export function forEachOpenDocument(
  filter: (doc: vscode.TextDocument) => boolean,
  action: (doc: vscode.TextDocument) => void,
  channel?: vscode.OutputChannel,
): void {
  for (const doc of vscode.workspace.textDocuments) {
    if (!filter(doc)) {
      continue;
    }
    try {
      action(doc);
    } catch (error: unknown) {
      const message: string = extractMessage(error);

      if (channel) {
        logError(
          channel,
          format(en.documentFilter.iterationError, { file: doc.uri.fsPath, error: message }),
        );
      }
    }
  }
}
