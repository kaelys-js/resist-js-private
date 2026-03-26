/**
 * External Tool: dotenv-linter
 *
 * Lints .env files for best practices and common issues.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform dotenv-linter text output into LintResult[].
 *
 * dotenv-linter outputs lines in the format:
 * `file:line rule: message`
 *
 * @param {string} output - Raw text output from dotenv-linter
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformDotenvLinterOutput('.env:3 DuplicatedKey: The FOO key is duplicated');
 * // results[0].ruleId === 'dotenv-linter/DuplicatedKey'
 * ```
 */
export function transformDotenvLinterOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /*
   * Match dotenv-linter output format:
   * .env:3 DuplicatedKey: The FOO key is duplicated
   * .env.production:1 LeadingCharacter: Invalid leading character detected
   */
  const pattern: RegExp = /^(.+?):(\d+)\s+(\w+):\s*(.+)$/;

  for (const line of lines) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = stripped.match(pattern);
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const rule: string = match[3] ?? 'unknown';
    const message: string = match[4] ?? '';

    results.push(
      createResult(`dotenv-linter/${rule}`, file, lineNum, 1, 'warning', message, {
        tip: `See https://dotenv-linter.github.io/#/checks/${rule}`,
      }),
    );
  }

  return results;
}

/** dotenv-linter external tool definition. */
export const dotenvLinterTool: ExternalTool = {
  args: [],
  command: 'dotenv-linter',
  filePatterns: ['**/.env', '**/.env.*'],
  isAvailable(): boolean {
    return isCommandAvailable('dotenv-linter');
  },
  name: 'dotenv-linter',
  outputFormat: 'text',
  transform: transformDotenvLinterOutput,
};
