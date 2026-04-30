/**
 * External Tool: codeowners-checker
 *
 * Validates CODEOWNERS files for missing paths and unresolved owners.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import type { LintStrings } from '@/lint/locale/schema.ts';

/**
 * Transform codeowners-checker text output into LintResult[].
 *
 * codeowners-checker outputs diagnostic lines in the format:
 * `filename: message`
 *
 * Common issues include paths that do not exist in the repository
 * and entries with missing or unresolvable owners.
 *
 * @param {string} output - Raw text output from codeowners-checker
 * @param {LintStrings} strings - Locale strings for user-facing messages
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformCodeownersCheckerOutput('CODEOWNERS:5: path does not exist: /src/old-module/');
 * // results[0].ruleId === 'codeowners-checker/validate'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformCodeownersCheckerOutput(
  output: string,
  strings: LintStrings,
): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /*
   * Match codeowners-checker output formats:
   *
   * With line number:
   *   CODEOWNERS:5: path does not exist: /src/old-module/
   *   .github/CODEOWNERS:12: owner @ghost not found
   *
   * Without line number:
   *   CODEOWNERS: missing owner for /src/utils/
   *   .github/CODEOWNERS: invalid pattern
   */
  const patternWithLine: RegExp = /^(.+?):(\d+):\s*(.+)$/;
  const patternWithoutLine: RegExp = /^(.+?):\s+(.+)$/;

  for (const line of lines) {
    const stripped: string = line.trim();

    if (stripped.length === 0) {
      continue;
    }

    let file: string = 'CODEOWNERS';
    let lineNum: number = 1;
    let message: string = stripped;

    const matchWithLine: RegExpMatchArray | null = stripped.match(patternWithLine);

    if (matchWithLine) {
      file = matchWithLine[1] ?? 'CODEOWNERS';
      lineNum = Number.parseInt(matchWithLine[2] ?? '1', 10);
      message = matchWithLine[3] ?? '';
    } else {
      const matchWithoutLine: RegExpMatchArray | null = stripped.match(patternWithoutLine);

      if (matchWithoutLine) {
        file = matchWithoutLine[1] ?? 'CODEOWNERS';
        message = matchWithoutLine[2] ?? '';
      } else {
        /* Line does not match any known format — skip */
        continue;
      }
    }

    results.push(
      createResult('codeowners-checker/validate', file, lineNum, 1, 'warning', message, {
        tip: strings.tools.codeownersCheckerTip,
      }),
    );
  }

  return results;
}

/** codeowners-checker external tool definition. */
export const codeownersCheckerTool: ExternalTool = {
  args: ['check'],
  command: 'codeowners-checker',
  filePatterns: [],
  isAvailable(): boolean {
    return isCommandAvailable('codeowners-checker');
  },
  name: 'codeowners-checker',
  outputFormat: 'text',
  transform: transformCodeownersCheckerOutput,
};
