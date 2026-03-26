/**
 * External Tool: zig ast-check
 *
 * Checks Zig source files for syntax errors using `zig ast-check`.
 * Parses GCC-style text output (`filename:line:column: error: message`)
 * into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for zig ast-check diagnostic output format.
 *
 * Matches lines like:
 * `src/main.zig:10:5: error: expected expression`
 * `src/lib.zig:3:1: error: invalid token`
 */
const ZIG_LINE: RegExp = /^(.+?):(\d+):(\d+): (error|note): (.+)$/;

/**
 * Transform `zig ast-check` text output into LintResult[].
 *
 * `zig ast-check` outputs GCC-style diagnostics:
 * `filename:line:column: error: message`
 *
 * All diagnostics are mapped to the `zig/syntax` rule ID since
 * `ast-check` only performs syntax validation.
 *
 * @param {string} output - Raw text output from `zig ast-check`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformZigOutput('src/main.zig:10:5: error: expected expression');
 * // results[0].ruleId === 'zig/syntax'
 * // results[0].severity === 'error'
 * ```
 */
export function transformZigOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const match: RegExpMatchArray | null = ZIG_LINE.exec(line.trim());
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const level: string = match[4] ?? 'error';
    const message: string = match[5] ?? '';

    const severity: 'error' | 'info' = level === 'note' ? 'info' : 'error';

    results.push(createResult('zig/syntax', file, lineNum, column, severity, message));
  }

  return results;
}

/** zig external tool definition. */
export const zigTool: ExternalTool = {
  args: ['ast-check'],
  command: 'zig',
  filePatterns: ['**/*.zig'],
  isAvailable(): boolean {
    return isCommandAvailable('zig');
  },
  name: 'zig',
  outputFormat: 'text',
  transform: transformZigOutput,
};
