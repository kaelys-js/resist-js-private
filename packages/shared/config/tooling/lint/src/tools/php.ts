/**
 * External Tool: PHP
 *
 * Validates PHP files (.php, .phtml) using `php -l` for syntax checking.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for PHP parse error output.
 *
 * Matches both forms:
 * - `PHP Parse error: ... in filename on line N`
 * - `Parse error: syntax error, ... in filename on line N`
 */
const PHP_ERROR: RegExp = /^(?:PHP )?Parse error:\s*(.+?)\s+in\s+(.+?)\s+on\s+line\s+(\d+)/;

/**
 * Transform PHP syntax check output into LintResult[].
 *
 * `php -l` outputs parse errors on stderr with lines like:
 * `PHP Parse error: syntax error, unexpected '}' in test.php on line 10`
 * `Parse error: syntax error, unexpected end of file in test.php on line 25`
 *
 * Lines containing "No syntax errors detected" are skipped.
 *
 * @param {string} output - Raw output from `php -l`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformPhpOutput("PHP Parse error: syntax error, unexpected '}' in test.php on line 10");
 * // results[0].ruleId === 'php/syntax'
 * // results[0].line === 10
 * ```
 */
export function transformPhpOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = PHP_ERROR.exec(stripped);
    if (!match) {
      continue;
    }

    const message: string = match[1] ?? '';
    const file: string = match[2] ?? '';
    const lineNum: number = Number.parseInt(match[3] ?? '1', 10);

    results.push(createResult('php/syntax', file, lineNum, 1, 'error', message));
  }

  return results;
}

/** PHP external tool definition. */
export const phpTool: ExternalTool = {
  args: ['-l'],
  command: 'php',
  filePatterns: ['**/*.php', '**/*.phtml'],
  isAvailable(): boolean {
    return isCommandAvailable('php');
  },
  name: 'php',
  outputFormat: 'text',
  transform: transformPhpOutput,
};
