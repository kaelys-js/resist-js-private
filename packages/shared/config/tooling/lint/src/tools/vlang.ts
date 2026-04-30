/**
 * External Tool: V (vlang)
 *
 * Checks V source files for errors using `v -check`.
 * Parses GCC-like text output (`filename:line:column: error: message`)
 * into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for V compiler diagnostic output format.
 *
 * Matches lines like:
 * `src/main.v:10:5: error: undefined identifier 'x'`
 * `src/lib.v:3:1: error: expected ';'`
 */
const VLANG_LINE: RegExp = /^(.+?):(\d+):(\d+): (error|warning): (.+)$/;

/**
 * Transform `v -check` text output into LintResult[].
 *
 * `v -check` outputs GCC-like diagnostics:
 * `filename:line:column: error: message`
 *
 * All diagnostics are mapped to the `vlang/check` rule ID.
 *
 * @param {string} output - Raw text output from `v -check`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformVlangOutput("src/main.v:10:5: error: undefined identifier 'x'");
 * // results[0].ruleId === 'vlang/check'
 * // results[0].severity === 'error'
 * ```
 */
export function transformVlangOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const match: RegExpMatchArray | null = VLANG_LINE.exec(line.trim());

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const level: string = match[4] ?? 'error';
    const message: string = match[5] ?? '';

    const severity: 'error' | 'warning' = level === 'warning' ? 'warning' : 'error';

    results.push(createResult('vlang/check', file, lineNum, column, severity, message));
  }

  return results;
}

/** vlang external tool definition. */
export const vlangTool: ExternalTool = {
  args: ['-check'],
  command: 'v',
  filePatterns: ['**/*.v'],
  isAvailable(): boolean {
    return isCommandAvailable('v');
  },
  name: 'vlang',
  outputFormat: 'text',
  transform: transformVlangOutput,
};
