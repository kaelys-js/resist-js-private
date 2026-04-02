/**
 * Rules Viewer
 *
 * Opens a virtual markdown document showing all lint rules, their
 * severities, descriptions, and settings parsed from CLI output.
 *
 * Plan: .claude/plans/keen-noodling-newt.md TASK 3
 *
 * @module
 */

import * as vscode from 'vscode';
import { runToolText } from '../shared/runner';
import { getBinaryPath } from '../shared/workspace';
import { en } from '../locale/en';
import { format } from '../locale/schema';
import { BINARY_NAME, RULES_SCHEME } from '../shared/brand';

// =============================================================================
// Content Provider
// =============================================================================

/**
 * Content provider for the rules viewer virtual document.
 *
 * Runs `resist-lint --list-rules`, parses the CLI text output,
 * and converts it into a formatted markdown document.
 */
export class RulesViewerProvider implements vscode.TextDocumentContentProvider {
  /**
   * Provides markdown content for the rules viewer virtual document.
   *
   * @param _uri - The virtual document URI (unused — content is workspace-global)
   * @returns Formatted markdown string with all lint rules
   */
  async provideTextDocumentContent(_uri: vscode.Uri): Promise<string> {
    const folders: readonly vscode.WorkspaceFolder[] | undefined =
      vscode.workspace.workspaceFolders;
    const [firstFolder] = folders ?? [];

    if (!firstFolder) {
      return `# ${en.rulesViewer.title}\n\n_${en.messages.noWorkspaceFolder}_\n`;
    }

    const binPath: string | undefined = getBinaryPath(BINARY_NAME, firstFolder.uri);

    if (!binPath) {
      return `# ${en.rulesViewer.title}\n\n_${en.messages.binaryNotInNodeModules}_\n`;
    }

    const { fsPath: cwd } = firstFolder.uri;

    const result = await runToolText({
      command: binPath,
      args: ['--list-rules'],
      cwd,
    });

    if (!result.ok) {
      return `# ${en.rulesViewer.title}\n\n_${format(en.rulesViewer.errorFetching, { error: result.error })}_\n`;
    }

    return parseRulesOutput(result.data);
  }
}

// =============================================================================
// Parser
// =============================================================================

/**
 * Parses CLI `--list-rules` text output into formatted markdown.
 *
 * The CLI output format is:
 * ```
 * Section Header
 *
 *   rule-id (severity) [fixable]
 *     Description text
 *     Patterns: *.ts, *.tsx
 *     Categories: style  Stages: lint
 * ```
 *
 * @example
 * ```typescript
 * const md = parseRulesOutput(cliOutput);
 * ```
 *
 * @param {string} output - Raw CLI text output from `resist-lint --list-rules`
 * @returns {string} Formatted markdown string
 */
export function parseRulesOutput(output: string): string {
  const lines: string[] = output.split('\n');
  const md: string[] = [`# ${en.rulesViewer.title}\n`];

  for (const line of lines) {
    // Skip empty lines
    if (line.trim() === '') {
      continue;
    }

    // Section headers: lines that don't start with whitespace
    if (line.length > 0 && line[0] !== ' ') {
      md.push(`\n## ${line.trim()}\n`);
      continue;
    }

    // Rule line: "  rule-id (severity) [fixable]"
    const ruleMatch: RegExpMatchArray | null = line.match(
      /^\s{2}(\S+)\s+\((\w+)\)(\s+\[fixable\])?$/,
    );

    if (ruleMatch) {
      const ruleId: string = ruleMatch[1] ?? '';
      const severity: string = ruleMatch[2] ?? '';
      const fixable: boolean = Boolean(ruleMatch[3]);
      const badge: string = fixable ? ' 🔧' : '';
      md.push(`\n### \`${ruleId}\` — ${severity}${badge}\n`);
      continue;
    }

    // Indented detail lines (description, patterns, categories, stages)
    const trimmed: string = line.trim();

    if (trimmed.startsWith('Patterns:') || trimmed.startsWith('patterns:')) {
      md.push(`- **Patterns:** ${trimmed.replace(/^[Pp]atterns:\s*/, '')}`);
    } else if (trimmed.startsWith('Categories:') || trimmed.startsWith('categories:')) {
      // "Categories: style  Stages: lint" — split on double space
      const parts: string[] = trimmed.split(/\s{2,}/);

      for (const part of parts) {
        if (part.toLowerCase().startsWith('categories:')) {
          md.push(`- **Categories:** ${part.replace(/^[Cc]ategories:\s*/, '')}`);
        } else if (part.toLowerCase().startsWith('stages:')) {
          md.push(`- **Stages:** ${part.replace(/^[Ss]tages:\s*/, '')}`);
        }
      }
    } else if (trimmed.length > 0) {
      // Description line
      md.push(`\n${trimmed}\n`);
    }
  }

  return md.join('\n');
}

// =============================================================================
// Command Helper
// =============================================================================

/**
 * Opens the rules viewer as a virtual markdown document.
 *
 * @example
 * ```typescript
 * await showRulesViewer();
 * ```
 */
export async function showRulesViewer(): Promise<void> {
  const uri: vscode.Uri = vscode.Uri.parse(`${RULES_SCHEME}:${en.rulesViewer.title}`);
  const doc: vscode.TextDocument = await vscode.workspace.openTextDocument(uri);

  await vscode.window.showTextDocument(doc, { preview: false });
  await vscode.languages.setTextDocumentLanguage(doc, 'markdown');
}
