/**
 * External Tool: Dhall
 *
 * Validates Dhall configuration files (.dhall) using `dhall lint --check`.
 * Non-empty output indicates the file needs formatting or has lint issues.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for dhall error output with file location.
 *
 * Matches lines like:
 * `config.dhall:5:10: error message`
 * `default.dhall:1:1: some issue`
 *
 * Falls back to treating the entire non-empty output as a single diagnostic
 * when no structured lines are found.
 */
const DHALL_LINE: RegExp = /^(.+?):(\d+):(\d+):\s*(.+)$/;

/**
 * Transform dhall lint check output into LintResult[].
 *
 * `dhall lint --check` outputs diagnostic information when a file
 * needs formatting or has lint issues. Empty output means the file
 * is clean. Non-empty output that doesn't match the structured
 * pattern is reported as a single warning.
 *
 * @param {string} output - Raw text output from dhall lint
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformDhallOutput('config.dhall:5:10: needs formatting');
 * // results[0].ruleId === 'dhall/lint'
 * // results[0].line === 5
 * ```
 */
export function transformDhallOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  let matched: boolean = false;

  for (const line of trimmed.split('\n')) {
    const stripped: string = line.trim();

    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = DHALL_LINE.exec(stripped);

    if (!match) {
      continue;
    }

    matched = true;
    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const message: string = match[4] ?? '';

    results.push(createResult('dhall/lint', file, lineNum, column, 'warning', message));
  }

  /* Non-empty output with no structured lines — report as a single warning */
  if (!matched) {
    results.push(
      createResult('dhall/lint', '', 1, 1, 'warning', trimmed.split('\n')[0] ?? trimmed),
    );
  }

  return results;
}

/** Dhall external tool definition. */
export const dhallTool: ExternalTool = {
  args: ['lint', '--check'],
  command: 'dhall',
  filePatterns: ['**/*.dhall'],
  isAvailable(): boolean {
    return isCommandAvailable('dhall');
  },
  name: 'dhall',
  outputFormat: 'text',
  transform: transformDhallOutput,
};
