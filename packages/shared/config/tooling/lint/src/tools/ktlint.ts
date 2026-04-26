/**
 * External Tool: ktlint
 *
 * Lints Kotlin source files (.kt, .kts) using ktlint with plain reporter output.
 * Parses text output format into LintResult[].
 *
 * Output format: `filename:line:column: message (rule-name)`
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for ktlint plain reporter output: `filename:line:column: message (rule-name)`
 *
 * Captures:
 * 1. File path
 * 2. Line number
 * 3. Column number
 * 4. Message text
 * 5. Rule name (inside parentheses)
 */
const KTLINT_LINE: RegExp = /^(.+?):(\d+):(\d+):\s*(.+?)\s+\((.+?)\)$/;

/**
 * Transform ktlint plain reporter output into LintResult[].
 *
 * ktlint with `--reporter=plain` outputs lines like:
 * `src/Main.kt:10:1: Unexpected blank line(s) before "}" (no-blank-line-before-rbrace)`
 *
 * @param {string} output - Raw text output from ktlint
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformKtlintOutput('src/Main.kt:10:1: Needless blank line (no-blank-line-before-rbrace)');
 * // results[0].ruleId === 'ktlint/no-blank-line-before-rbrace'
 * // results[0].severity === 'error'
 * ```
 * @returns Description
 */
export function transformKtlintOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  for (const line of lines) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = KTLINT_LINE.exec(stripped);
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const message: string = match[4] ?? '';
    const ruleName: string = match[5] ?? 'unknown';

    results.push(createResult(`ktlint/${ruleName}`, file, lineNum, column, 'error', message));
  }

  return results;
}

/** ktlint external tool definition. */
export const ktlintTool: ExternalTool = {
  args: ['--reporter=plain'],
  command: 'ktlint',
  filePatterns: ['**/*.kt', '**/*.kts'],
  isAvailable(): boolean {
    return isCommandAvailable('ktlint');
  },
  name: 'ktlint',
  outputFormat: 'text',
  transform: transformKtlintOutput,
};
