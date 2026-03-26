/**
 * External Tool: R lintr (via Rscript)
 *
 * Lints R source files (.r, .R) using the lintr package via Rscript.
 * Parses text output in the lintr diagnostic format
 * (`filename:line:column: style/warning/error: message`) into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for lintr output lines.
 *
 * Matches lines like:
 * `script.R:10:5: style: Variable name should be snake_case.`
 * `analysis.r:25:1: warning: Avoid using 1:n in function calls.`
 * `utils.R:3:12: error: unexpected end of input`
 */
const LINTR_LINE: RegExp = /^(.+?):(\d+):(\d+):\s*(style|warning|error):\s*(.+)$/;

/**
 * Transform lintr text output into LintResult[].
 *
 * lintr (via `Rscript -e "lintr::lint(commandArgs(TRUE))"`) outputs
 * diagnostics in the format:
 * `filename:line:column: level: message`
 *
 * Severity mapping:
 * - `error` → error
 * - `warning` → warning
 * - `style` → info
 *
 * @param {string} output - Raw text output from Rscript lintr
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformRscriptOutput('script.R:10:5: style: Variable name should be snake_case.');
 * // results[0].ruleId === 'rscript/lint'
 * // results[0].severity === 'info'
 * ```
 */
export function transformRscriptOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = LINTR_LINE.exec(stripped);
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const level: string = match[4] ?? 'warning';
    const message: string = match[5] ?? '';

    let severity: 'error' | 'warning' | 'info' = 'warning';
    if (level === 'error') {
      severity = 'error';
    } else if (level === 'style') {
      severity = 'info';
    }

    results.push(createResult('rscript/lint', file, lineNum, column, severity, message));
  }

  return results;
}

/** R lintr (Rscript) external tool definition. */
export const rscriptTool: ExternalTool = {
  args: ['-e', 'lintr::lint(commandArgs(TRUE))'],
  command: 'Rscript',
  filePatterns: ['**/*.r', '**/*.R'],
  isAvailable(): boolean {
    return isCommandAvailable('Rscript');
  },
  name: 'rscript',
  outputFormat: 'text',
  transform: transformRscriptOutput,
};
