/**
 * External Tool: markdownlint-cli2
 *
 * Lints Markdown files (.md, .mdx) using markdownlint-cli2.
 * Parses text output format into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { en } from '@/lint/locale/locales/en.ts';
import { format } from '@/lint/locale/schema.ts';

/** Regex for markdownlint output: `file:line[:col] rule/alias description` */
const MARKDOWNLINT_LINE: RegExp = /^(.+?):(\d+)(?::(\d+))?\s+(MD\d+\/\S+)\s+(.+)$/;

/**
 * Transform markdownlint text output into LintResult[].
 *
 * markdownlint outputs lines like:
 * `README.md:3 MD012/no-multiple-blanks Multiple consecutive blank lines [Expected: 1; Actual: 2]`
 * `README.md:5:1 MD022/blanks-around-headings Headings should be surrounded by blank lines`
 *
 * @param {string} output - Raw text output from markdownlint
 * @returns {LintResult[]} Transformed lint results
 */
export function transformMarkdownlintOutput(output: string): LintResult[] {
  const results: LintResult[] = [];

  for (const line of output.split('\n')) {
    const match: RegExpMatchArray | null = MARKDOWNLINT_LINE.exec(line.trim());
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = match[3] ? Number.parseInt(match[3], 10) : 1;
    const ruleAlias: string = match[4] ?? '';
    const message: string = match[5] ?? '';

    /* Extract rule ID (e.g., MD012 from MD012/no-multiple-blanks) */
    const ruleId: string = `markdownlint/${ruleAlias.split('/')[0]}`;

    results.push(
      createResult(ruleId, file, lineNum, column, 'warning', message, {
        tip: format(en.tools.markdownlintTip, { rule: ruleAlias }),
      }),
    );
  }

  return results;
}

/** markdownlint external tool definition. */
export const markdownlintTool: ExternalTool = {
  args: [],
  command: 'markdownlint-cli2',
  filePatterns: ['**/*.md', '**/*.mdx'],
  isAvailable(): boolean {
    return isCommandAvailable('markdownlint-cli2');
  },
  name: 'markdownlint',
  outputFormat: 'text',
  transform: transformMarkdownlintOutput,
};
