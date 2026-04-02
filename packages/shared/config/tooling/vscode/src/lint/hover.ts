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
      parts.push(buildHoverContent(diag, document));
    }

    const [first] = matching;

    if (!first) {
      return;
    }

    return new vscode.Hover(parts, first.range);
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

  if (data.tip || data.example || data.description || data.url) {
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
 * @param {vscode.TextDocument} document - The document for extracting fix diff text
 * @returns {vscode.MarkdownString} Formatted Markdown content
 *
 * @example
 * ```typescript
 * const diag = diagnosticCollection.get(document.uri)?.[0];
 * if (diag) {
 *   const content = buildHoverContent(diag, document);
 *   const hover = new vscode.Hover([content], diag.range);
 * }
 * ```
 */
export function buildHoverContent(
  diag: vscode.Diagnostic,
  document: vscode.TextDocument,
): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.supportThemeIcons = true;

  const { data } = diag as DiagnosticWithData;
  const sections: string[] = [];

  // Rule ID (when code is available)
  const { code } = diag;
  const ruleId: string =
    typeof code === 'string'
      ? code
      : code && typeof code === 'object' && 'value' in code
        ? String(code.value)
        : '';

  if (ruleId) {
    sections.push(`**Rule:** \`${ruleId}\``);
  }

  // Rule description
  if (data?.description) {
    sections.push(`**${en.hover.descriptionLabel}:** ${data.description}`);
  }

  // Tip
  if (data?.tip) {
    sections.push(`$(lightbulb) **${en.hover.tipPrefix}:** ${data.tip}`);
  }

  // Example as fenced code block, cleaned of @example prefix + JSDoc markers
  if (data?.example) {
    const cleaned: string = cleanExample(data.example);

    sections.push(
      `$(code) **${en.hover.exampleLabel}:**\n\n\`\`\`\`typescript\n${cleaned}\n\`\`\`\``,
    );
  }

  // Fix diff preview
  if (data?.fix && !(data.fix.range.start === data.fix.range.end && data.fix.text === '')) {
    const diffBlock: string = buildFixDiff(data.fix, document);
    sections.push(`$(tools) **${en.hover.fixPreview}:**\n\n${diffBlock}`);
  }

  // Documentation link
  if (data?.url) {
    sections.push(`[$(link-external) ${en.hover.viewDocs}](${data.url})`);
  }

  md.appendMarkdown(sections.join('\n\n---\n\n'));

  return md;
}

/**
 * Builds a diff-style code block showing before/after for a fix.
 *
 * @param fix - The fix data with range and replacement text
 * @param document - The document to extract original text from
 * @returns A fenced diff code block string
 */
function buildFixDiff(
  fix: { range: { start: number; end: number }; text: string },
  document: vscode.TextDocument,
): string {
  const fullText: string = document.getText();
  const original: string = fullText.slice(fix.range.start, fix.range.end);
  const replacement: string = fix.text;

  const lines: string[] = [];

  // Deletion only
  if (replacement === '' && original !== '') {
    for (const line of original.split('\n')) {
      lines.push(`- ${line}`);
    }
    return `\`\`\`diff\n${lines.join('\n')}\n\`\`\``;
  }

  // Insertion only
  if (original === '' && replacement !== '') {
    for (const line of replacement.split('\n')) {
      lines.push(`+ ${line}`);
    }
    return `\`\`\`diff\n${lines.join('\n')}\n\`\`\``;
  }

  // Replacement: show removed then added
  for (const line of original.split('\n')) {
    lines.push(`- ${line}`);
  }
  for (const line of replacement.split('\n')) {
    lines.push(`+ ${line}`);
  }
  return `\`\`\`diff\n${lines.join('\n')}\n\`\`\``;
}

// =============================================================================
// Example Cleaning
// =============================================================================

/**
 * Strips `@example` prefix, JSDoc comment markers (`* `), and inner
 * fenced code block delimiters from a lint rule example string.
 *
 * @param {string} raw - Raw example string from lint diagnostic data
 * @returns {string} Cleaned example suitable for rendering in a code block
 *
 * @example
 * ```typescript
 * cleanExample('@example\n * ```typescript\n * const x = 1;\n * ```');
 * // → 'const x = 1;'
 * ```
 */
export function cleanExample(raw: string): string {
  return raw
    .replace(/^@example[\t ]*\n?/, '')
    .replaceAll(/^[\t ]*\*[\t ]*```\w*[\t ]*\n?/gm, '')
    .replaceAll(/^[\t ]*\*[\t ]*```[\t ]*$/gm, '')
    .replaceAll(/^[\t ]*\*[\t ]?/gm, '')
    .trim();
}
