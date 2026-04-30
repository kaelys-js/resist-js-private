/**
 * External Tool: nim check
 *
 * Checks Nim source files for errors using `nim check`.
 * Parses Nim's diagnostic output format (`filename(line, column) Level: message`)
 * into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for nim check diagnostic output format.
 *
 * Matches lines like:
 * `src/main.nim(10, 5) Error: undeclared identifier: 'x'`
 * `src/lib.nim(3, 1) Warning: unused import [UnusedImport]`
 * `src/foo.nim(7, 12) Hint: expression is never used [XDeclaredButNotUsed]`
 */
const NIM_LINE: RegExp = /^(.+?)\((\d+),\s*(\d+)\)\s+(Error|Warning|Hint):\s+(.+)$/;

/**
 * Transform `nim check` text output into LintResult[].
 *
 * `nim check` outputs diagnostics in the format:
 * `filename(line, column) Error/Warning/Hint: message`
 *
 * All diagnostics are mapped to the `nim/check` rule ID.
 *
 * @param {string} output - Raw text output from `nim check`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformNimOutput("src/main.nim(10, 5) Error: undeclared identifier: 'x'");
 * // results[0].ruleId === 'nim/check'
 * // results[0].severity === 'error'
 * ```
 */
export function transformNimOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const match: RegExpMatchArray | null = NIM_LINE.exec(line.trim());

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const level: string = match[4] ?? 'Error';
    const message: string = match[5] ?? '';

    let severity: 'error' | 'warning' | 'info' = 'error';

    if (level === 'Warning') {
      severity = 'warning';
    } else if (level === 'Hint') {
      severity = 'info';
    }

    results.push(createResult('nim/check', file, lineNum, column, severity, message));
  }

  return results;
}

/** nim external tool definition. */
export const nimTool: ExternalTool = {
  args: ['check'],
  command: 'nim',
  filePatterns: ['**/*.nim'],
  isAvailable(): boolean {
    return isCommandAvailable('nim');
  },
  name: 'nim',
  outputFormat: 'text',
  transform: transformNimOutput,
};
