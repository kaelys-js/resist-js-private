/**
 * Hover Provider
 *
 * Renders rich Markdown hover popups for resist-linter diagnostics.
 * Shows rule ID, message, tip, example (as fenced code block),
 * fix availability, and documentation link.
 *
 * @module
 */

import * as vscode from 'vscode';
import type { DiagnosticWithData } from './provider';
import { DIAGNOSTIC_SOURCE } from '../shared/brand';
import { en } from '../locale/en';

/**
 * Provides rich hover content for resist-linter diagnostics.
 *
 * Renders diagnostic information as styled Markdown with:
 * - Rule ID as bold header
 * - Diagnostic message
 * - Tip as blockquote
 * - Example as fenced code block
 * - Fix available indicator
 * - Clickable documentation link
 */
export class ResistHoverProvider implements vscode.HoverProvider {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;

  /**
   * Creates a new ResistHoverProvider.
   *
   * @param {vscode.DiagnosticCollection} diagnosticCollection - The diagnostic collection to read from
   */
  constructor(diagnosticCollection: vscode.DiagnosticCollection) {
    this.diagnosticCollection = diagnosticCollection;
  }

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Hover | undefined {
    const diagnostics: readonly vscode.Diagnostic[] =
      this.diagnosticCollection.get(document.uri) ?? [];

    // Find resist diagnostics at this position
    const matching: vscode.Diagnostic[] = [];

    for (const diag of diagnostics) {
      if (diag.source !== DIAGNOSTIC_SOURCE) {
        continue;
      }

      if (diag.range.contains(position)) {
        matching.push(diag);
      }
    }

    if (matching.length === 0) {
      return;
    }

    const parts: vscode.MarkdownString[] = [];

    for (const diag of matching) {
      parts.push(buildHoverContent(diag));
    }

    return new vscode.Hover(parts, matching[0]!.range);
  }
}

/**
 * Builds styled Markdown content for a single diagnostic.
 *
 * @param {vscode.Diagnostic} diag - The diagnostic to render
 * @returns {vscode.MarkdownString} Formatted Markdown content
 */
function buildHoverContent(diag: vscode.Diagnostic): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.supportHtml = true;

  const { data } = diag as DiagnosticWithData;

  // Rule ID header
  const ruleId: string =
    typeof diag.code === 'object' && diag.code !== null
      ? String((diag.code as { value: string | number }).value)
      : String(diag.code ?? '');

  const sevIcon: string =
    diag.severity === vscode.DiagnosticSeverity.Error ? '$(error)' : '$(warning)';

  md.appendMarkdown(`${sevIcon} **${ruleId}**\n\n`);

  // Message — use only the base message (before any appended example)
  const baseMessage: string = diag.message.split('\n\nExample:\n')[0] ?? diag.message;
  md.appendMarkdown(`${baseMessage}\n\n`);

  // Tip
  if (data?.tip) {
    md.appendMarkdown(`> **${en.hover.tipPrefix}:** ${data.tip}\n\n`);
  }

  // Example as fenced code block
  if (data?.example) {
    md.appendMarkdown('```ts\n');
    md.appendMarkdown(data.example);
    md.appendMarkdown('\n```\n\n');
  }

  // Fix available
  if (data?.fix && !(data.fix.range.start === data.fix.range.end && data.fix.text === '')) {
    md.appendMarkdown(`$(lightbulb) *${en.hover.fixAvailable}*\n\n`);
  }

  // Documentation link
  if (data?.url) {
    md.appendMarkdown(`[${en.hover.viewDocs}](${data.url})\n\n`);
  }

  // Source
  md.appendMarkdown(`---\n*${DIAGNOSTIC_SOURCE}*`);

  return md;
}
