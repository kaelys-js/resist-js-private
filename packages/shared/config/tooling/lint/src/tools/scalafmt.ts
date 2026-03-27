/**
 * External Tool: scalafmt
 *
 * Checks Scala source files (.scala) for formatting issues using scalafmt.
 * Runs in `--check` mode to report files that are not properly formatted.
 * Parses text output format into LintResult[].
 *
 * Error format: `error: filename:line:column: message`
 * Any non-empty line containing "error" produces a result.
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';

/**
 * Regex for scalafmt error output: `error: filename:line:column: message`
 *
 * Captures:
 * 1. File path
 * 2. Line number
 * 3. Column number
 * 4. Message
 */
const SCALAFMT_ERROR_LINE: RegExp = /^error:\s+(.+?):(\d+):(\d+):\s*(.+)$/;

/**
 * Transform scalafmt `--check` output into LintResult[].
 *
 * scalafmt with `--check` outputs error lines when files are not formatted:
 * `error: src/Main.scala:10:5: missing newline`
 *
 * Any non-empty line mentioning "error" that does not match the structured
 * format is still captured as a generic formatting error.
 *
 * @param {string} output - Raw text output from scalafmt --check
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformScalafmtOutput('error: src/Main.scala:10:5: missing newline');
 * // results[0].ruleId === 'scalafmt/format'
 * // results[0].severity === 'error'
 * ```
  * @param {Type} strings - Description
 */
export function transformScalafmtOutput(output: string, strings: LintStrings): LintResult[] {
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

    /* Only process lines that mention "error" */
    if (!stripped.toLowerCase().includes('error')) {
      continue;
    }

    const match: RegExpMatchArray | null = SCALAFMT_ERROR_LINE.exec(stripped);
    if (match) {
      const file: string = match[1] ?? '';
      const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
      const column: number = Number.parseInt(match[3] ?? '1', 10);
      const message: string = match[4] ?? '';

      results.push(
        createResult('scalafmt/format', file, lineNum, column, 'error', message, {
          tip: format(strings.tools.formatRunTool, { tool: 'scalafmt' }),
        }),
      );
    } else {
      /* Generic error line — capture as a formatting issue */
      results.push(
        createResult('scalafmt/format', 'unknown', 1, 1, 'error', stripped, {
          tip: format(strings.tools.formatRunTool, { tool: 'scalafmt' }),
        }),
      );
    }
  }

  return results;
}

/** scalafmt external tool definition. */
export const scalafmtTool: ExternalTool = {
  args: ['--check'],
  command: 'scalafmt',
  filePatterns: ['**/*.scala'],
  isAvailable(): boolean {
    return isCommandAvailable('scalafmt');
  },
  name: 'scalafmt',
  outputFormat: 'text',
  transform: transformScalafmtOutput,
};
