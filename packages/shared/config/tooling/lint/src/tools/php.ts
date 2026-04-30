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
 * @param {string} output - Raw output from php-l (one diagnostic per line)
 * @returns {LintResult[]} Parsed lint results
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
