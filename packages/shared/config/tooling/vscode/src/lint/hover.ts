/**
 * Hover Provider
 *
 * Renders supplemental hover content for resist-linter diagnostics.
 * Only shows information VS Code doesn't already display: tips,
 * examples (as fenced code blocks), fix indicators, and doc links.
 *
 * @module
 */

import * as vscode from 'vscode';
import type { DiagnosticWithData, DiagnosticData } from './provider';
import { DIAGNOSTIC_SOURCE } from '../shared/brand';
import { en } from '../locale/en';

/**
 * Provides supplemental hover content for resist-linter diagnostics.
 *
 * Only renders when a diagnostic has extra metadata (tip, example,
 * url, or a real fix). Avoids duplicating the message, rule ID,
 * severity, and source that VS Code already shows.
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

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const diagnostics: readonly vscode.Diagnostic[] =
      this.diagnosticCollection.get(document.uri) ?? [];

    // Find resist diagnostics at this position that have extra data
    const matching: vscode.Diagnostic[] = [];

    for (const diag of diagnostics) {
      if (diag.source !== DIAGNOSTIC_SOURCE) {
        continue;
      }

      if (!diag.range.contains(position)) {
        continue;
      }

      const { data } = diag as DiagnosticWithData;

      if (hasExtraData(data)) {
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
 * Checks whether a diagnostic has extra data worth showing in the hover.
 *
 * @param {DiagnosticData | undefined} data - The diagnostic's extra data
 * @returns {boolean} True if there's a tip, example, url, or real fix
 */
function hasExtraData(data: DiagnosticData | undefined): boolean {
  if (!data) {
    return false;
  }

  if (data.tip || data.example || data.url) {
    return true;
  }

  // Real fix (not a no-op)
  if (data.fix && !(data.fix.range.start === data.fix.range.end && data.fix.text === '')) {
    return true;
  }

  return false;
}

/**
 * Builds compact Markdown content showing only supplemental data.
 *
 * Skips message, rule ID, severity, and source — VS Code already shows those.
 *
 * @param {vscode.Diagnostic} diag - The diagnostic to render
 * @returns {vscode.MarkdownString} Formatted Markdown content
 */
function buildHoverContent(diag: vscode.Diagnostic): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.supportThemeIcons = true;

  const { data } = diag as DiagnosticWithData;
  const sections: string[] = [];

  // Tip
  if (data?.tip) {
    sections.push(`> $(lightbulb) **${en.hover.tipPrefix}:** ${data.tip}`);
  }

  // Example as fenced code block
  if (data?.example) {
    sections.push(`**${en.hover.exampleLabel}:**\n\`\`\`ts\n${data.example}\n\`\`\``);
  }

  // Fix available + docs link on same line
  const inlineItems: string[] = [];

  if (data?.fix && !(data.fix.range.start === data.fix.range.end && data.fix.text === '')) {
    inlineItems.push(`$(tools) *${en.hover.fixAvailable}*`);
  }

  if (data?.url) {
    inlineItems.push(`[$(link-external) ${en.hover.viewDocs}](${data.url})`);
  }

  if (inlineItems.length > 0) {
    sections.push(inlineItems.join(' · '));
  }

  md.appendMarkdown(sections.join('\n\n'));

  return md;
}
