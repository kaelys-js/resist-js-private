/**
 * External Tool: jsonlint
 *
 * Validates JSON files using jsonlint.
 * Parses text error output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import type { LintStrings } from '@/lint/locale/schema.ts';

/**
 * Transform jsonlint text output into LintResult[].
 *
 * jsonlint outputs errors in the format:
 * ```
 * Error: Parse error on line N:
 * ...context...
 * Expecting 'STRING', 'NUMBER', got 'EOF'
 * ```
 *
 * Also handles the compact format:
 * `file.json: line N, col N, Error - message`
 *
 * @param {string} output - Raw text output from jsonlint
 * @param {LintStrings} strings - Locale strings
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformJsonlintOutput('config.json: line 5, col 10, Error - Expected comma');
 * // results[0].ruleId === 'jsonlint/parse-error'
 * ```
 */
export function transformJsonlintOutput(output: string, strings: LintStrings): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /*
   * Match compact format: file.json: line N, col N, Error - message
   * Used by jsonlint-cli and similar tools.
   */
  const compactPattern: RegExp =
    /^(.+?):\s*line\s+(\d+),\s*col\s+(\d+),\s*(Error|Warning)\s*-\s*(.+)$/;

  /*
   * Match standard jsonlint format: Error: Parse error on line N:
   * The file name is not included in this format.
   */
  const standardPattern: RegExp = /^Error:\s*Parse error on line\s+(\d+):/;

  for (let i: number = 0; i < lines.length; i++) {
    const line: string = lines[i] ?? '';

    /* Try compact format first */
    const compactMatch: RegExpMatchArray | null = line.match(compactPattern);

    if (compactMatch) {
      const file: string = compactMatch[1] ?? '';
      const lineNum: number = Number.parseInt(compactMatch[2] ?? '1', 10);
      const col: number = Number.parseInt(compactMatch[3] ?? '1', 10);
      const level: string = compactMatch[4] ?? 'Error';
      const message: string = compactMatch[5] ?? '';

      results.push(
        createResult(
          'jsonlint/parse-error',
          file,
          lineNum,
          col,
          level === 'Error' ? 'error' : 'warning',
          message,
        ),
      );
      continue;
    }

    /* Try standard format */
    const standardMatch: RegExpMatchArray | null = line.match(standardPattern);

    if (standardMatch) {
      const lineNum: number = Number.parseInt(standardMatch[1] ?? '1', 10);

      /* Grab the next non-empty line as context/message */
      let message: string = strings.errors.jsonParseError;

      for (let j: number = i + 1; j < lines.length; j++) {
        const nextLine: string = (lines[j] ?? '').trim();

        if (nextLine.length > 0) {
          message = nextLine;
          break;
        }
      }

      results.push(createResult('jsonlint/parse-error', '', lineNum, 1, 'error', message));
    }
  }

  return results;
}

/** jsonlint external tool definition. */
export const jsonlintTool: ExternalTool = {
  args: ['--quiet', '--compact'],
  command: 'jsonlint',
  filePatterns: ['**/*.json', '**/*.jsonc'],
  isAvailable(): boolean {
    return isCommandAvailable('jsonlint');
  },
  name: 'jsonlint',
  outputFormat: 'text',
  transform: transformJsonlintOutput,
};
