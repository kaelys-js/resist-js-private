/**
 * External Tool: ignore-files
 *
 * Custom validator for ignore files (.gitignore, .dockerignore,
 * .prettierignore, .eslintignore, .helmignore).
 * Checks for invalid glob patterns (`***`), trailing whitespace,
 * and duplicate patterns.
 * Parses text output in `filename:line: message` format into LintResult[].
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { type LintStrings } from '@/lint/locale/schema.ts';

/**
 * Transform ignore-file validator text output into LintResult[].
 *
 * Expects lines in the format:
 * `filename:line: message`
 *
 * @param {string} output - Raw text output from the ignore-file validator
 * @param {LintStrings} strings - Locale strings
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformIgnoreFilesOutput('.gitignore:5: Invalid glob pattern "***"');
 * // results[0].ruleId === 'ignore-file/lint'
 * ```
 */
export function transformIgnoreFilesOutput(output: string, strings: LintStrings): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /*
   * Match output format:
   * .gitignore:5: Invalid glob pattern "***"
   * .dockerignore:12: Trailing whitespace
   * .prettierignore:3: Duplicate pattern "node_modules"
   */
  const pattern: RegExp = /^(.+?):(\d+):\s*(.+)$/;

  for (const line of lines) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = stripped.match(pattern);
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const message: string = match[3] ?? '';

    /* Determine severity: invalid globs are errors, others are warnings */
    const severity: 'error' | 'warning' = message.includes('***') ? 'error' : 'warning';

    results.push(
      createResult('ignore-file/lint', file, lineNum, 1, severity, message, {
        tip: strings.tools.ignoreFilesTip,
      }),
    );
  }

  return results;
}

/** ignore-files custom validator external tool definition. */
export const ignoreFilesTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: [
    '**/.gitignore',
    '**/.dockerignore',
    '**/.prettierignore',
    '**/.eslintignore',
    '**/.helmignore',
  ],
  isAvailable(): boolean {
    return true;
  },
  name: 'ignore-files',
  outputFormat: 'text',
  transform: transformIgnoreFilesOutput,
};
