/**
 * External Tool: ChkTeX
 *
 * Validates LaTeX files (.tex, .bib) using ChkTeX.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for chktex colon-delimited output:
 * `filename:line:column:severity:code:message`
 */
const CHKTEX_COLON: RegExp = /^(.+?):(\d+):(\d+):(\w+):(\d+):(.+)$/;

/**
 * Regex for chktex verbose warning output:
 * `Warning N in filename line L: message`
 */
const CHKTEX_WARNING: RegExp = /^Warning\s+(\d+)\s+in\s+(.+?)\s+line\s+(\d+):\s+(.+)$/;

/**
 * Transform ChkTeX text output into LintResult[].
 *
 * ChkTeX can output in two formats:
 * - Colon-delimited: `main.tex:10:5:Warning:1:Command terminated with space`
 * - Verbose: `Warning 1 in main.tex line 10: Command terminated with space`
 *
 * Both formats are handled. The `-q` flag suppresses banner output.
 *
 * @param {string} output - Raw text output from chktex
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformChktexOutput('main.tex:10:5:Warning:1:Command terminated with space');
 * // results[0].ruleId === 'latex/check'
 * ```
 */
export function transformChktexOutput(output: string): LintResult[] {
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

    /* Try colon-delimited format: `filename:line:column:severity:code:message` */
    const matchColon: RegExpMatchArray | null = CHKTEX_COLON.exec(stripped);
    if (matchColon) {
      const file: string = matchColon[1] ?? '';
      const lineNum: number = Number.parseInt(matchColon[2] ?? '1', 10);
      const column: number = Number.parseInt(matchColon[3] ?? '1', 10);
      const severity: string = matchColon[4] ?? 'Warning';
      const message: string = matchColon[6] ?? '';

      results.push(
        createResult(
          'latex/check',
          file,
          lineNum,
          column,
          severity.toLowerCase() === 'error' ? 'error' : 'warning',
          message,
        ),
      );
      continue;
    }

    /* Try verbose format: `Warning N in filename line L: message` */
    const matchWarning: RegExpMatchArray | null = CHKTEX_WARNING.exec(stripped);
    if (matchWarning) {
      const file: string = matchWarning[2] ?? '';
      const lineNum: number = Number.parseInt(matchWarning[3] ?? '1', 10);
      const message: string = matchWarning[4] ?? '';

      results.push(createResult('latex/check', file, lineNum, 1, 'warning', message));
    }
  }

  return results;
}

/** ChkTeX external tool definition for LaTeX linting. */
export const chktexTool: ExternalTool = {
  args: ['-q'],
  command: 'chktex',
  filePatterns: ['**/*.tex', '**/*.bib'],
  isAvailable(): boolean {
    return isCommandAvailable('chktex');
  },
  name: 'chktex',
  outputFormat: 'text',
  transform: transformChktexOutput,
};
