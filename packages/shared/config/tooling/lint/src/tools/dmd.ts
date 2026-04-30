/**
 * External Tool: DMD (D Compiler)
 *
 * Lints D source files (.d) using `dmd -c -o-`.
 * Parses text output in the DMD diagnostic format
 * (`filename(line): Error/Warning: message`) into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for DMD compiler diagnostic output.
 *
 * Matches lines like:
 * `src/main.d(10): Error: undefined identifier 'foo'`
 * `src/utils.d(25): Warning: statement is not reachable`
 * `src/lib.d(3): Deprecation: usage of 'bar' is deprecated`
 */
const DMD_LINE: RegExp = /^(.+?)\((\d+)\):\s*(Error|Warning|Deprecation):\s*(.+)$/;

/**
 * Transform DMD compiler text output into LintResult[].
 *
 * DMD (`dmd -c -o-`) outputs diagnostics in the format:
 * `filename(line): Error: message`
 * `filename(line): Warning: message`
 * `filename(line): Deprecation: message`
 *
 * Severity mapping:
 * - `Error` → error
 * - `Warning` → warning
 * - `Deprecation` → info
 *
 * @param {string} output - Raw text output from dmd
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformDmdOutput("src/main.d(10): Error: undefined identifier 'foo'");
 * // results[0].ruleId === 'dmd/compile'
 * // results[0].severity === 'error'
 * ```
 */
export function transformDmdOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = DMD_LINE.exec(stripped);

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const level: string = match[3] ?? 'Error';
    const message: string = match[4] ?? '';

    let severity: 'error' | 'warning' | 'info' = 'warning';

    if (level === 'Error') {
      severity = 'error';
    } else if (level === 'Deprecation') {
      severity = 'info';
    }

    results.push(createResult('dmd/compile', file, lineNum, 1, severity, message));
  }

  return results;
}

/** DMD (D compiler) external tool definition. */
export const dmdTool: ExternalTool = {
  args: ['-c', '-o-'],
  command: 'dmd',
  filePatterns: ['**/*.d'],
  isAvailable(): boolean {
    return isCommandAvailable('dmd');
  },
  name: 'dmd',
  outputFormat: 'text',
  transform: transformDmdOutput,
};
