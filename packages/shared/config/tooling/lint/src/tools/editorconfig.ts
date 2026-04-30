/**
 * External Tool: editorconfig-checker
 *
 * Validates files against .editorconfig rules using editorconfig-checker.
 * Falls back to the `ec` command if `editorconfig-checker` is not available.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for editorconfig-checker output with line/column: `filename:line:column: message`
 */
const EC_LINE_WITH_COL: RegExp = /^(.+?):(\d+):(\d+):\s+(.+)$/;

/**
 * Regex for editorconfig-checker output without line: `filename: message`
 */
const EC_LINE_SIMPLE: RegExp = /^(.+?):\s+(.+)$/;

/**
 * Transform editorconfig-checker text output into LintResult[].
 *
 * editorconfig-checker outputs lines in two formats:
 * - `src/main.ts:10:5: Wrong indent style`
 * - `src/main.ts: Final newline expected`
 *
 * @param {string} output - Raw text output from editorconfig-checker
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformEditorconfigOutput('src/main.ts:10:5: Wrong indent style');
 * // results[0].ruleId === 'editorconfig/check'
 * ```
 */
export function transformEditorconfigOutput(output: string): LintResult[] {
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

    /* Try format with line and column: `filename:line:column: message` */
    const matchWithCol: RegExpMatchArray | null = EC_LINE_WITH_COL.exec(stripped);

    if (matchWithCol) {
      const file: string = matchWithCol[1] ?? '';
      const lineNum: number = Number.parseInt(matchWithCol[2] ?? '1', 10);
      const column: number = Number.parseInt(matchWithCol[3] ?? '1', 10);
      const message: string = matchWithCol[4] ?? '';

      results.push(createResult('editorconfig/check', file, lineNum, column, 'warning', message));
      continue;
    }

    /* Fallback: simple format `filename: message` */
    const matchSimple: RegExpMatchArray | null = EC_LINE_SIMPLE.exec(stripped);

    if (matchSimple) {
      const file: string = matchSimple[1] ?? '';
      const message: string = matchSimple[2] ?? '';

      results.push(createResult('editorconfig/check', file, 1, 1, 'warning', message));
    }
  }

  return results;
}

/** editorconfig-checker external tool definition. */
export const editorconfigCheckerTool: ExternalTool = {
  args: [],
  command: 'editorconfig-checker',
  filePatterns: ['**/.editorconfig'],
  isAvailable(): boolean {
    return isCommandAvailable('editorconfig-checker') || isCommandAvailable('ec');
  },
  name: 'editorconfig-checker',
  outputFormat: 'text',
  transform: transformEditorconfigOutput,
};
