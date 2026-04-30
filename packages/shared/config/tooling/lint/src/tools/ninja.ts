/**
 * External Tool: Ninja
 *
 * Validates Ninja build files (.ninja) using `ninja -t check`.
 * Parses text output for error lines into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for ninja check error output.
 *
 * Matches lines like:
 * `build.ninja:12: error message here`
 * `rules.ninja:5: multiple rules generate output`
 */
const NINJA_LINE: RegExp = /^(.+?):(\d+):\s*(.+)$/;

/**
 * Transform ninja check text output into LintResult[].
 *
 * `ninja -t check` outputs diagnostic information when build files
 * contain errors. Only lines containing "error" (case-insensitive)
 * or matching the structured `filename:line: message` format are
 * parsed. Empty output or output without errors returns no results.
 *
 * @param {string} output - Raw text output from ninja check
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformNinjaOutput('build.ninja:12: multiple rules generate output');
 * // results[0].ruleId === 'ninja/check'
 * // results[0].line === 12
 * ```
 */
export function transformNinjaOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  /* If output does not contain "error", there are no issues to report */
  if (!trimmed.toLowerCase().includes('error')) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const stripped: string = line.trim();

    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = NINJA_LINE.exec(stripped);

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const message: string = match[3] ?? '';

    results.push(createResult('ninja/check', file, lineNum, 1, 'error', message));
  }

  return results;
}

/** Ninja external tool definition. */
export const ninjaTool: ExternalTool = {
  args: ['-t', 'check'],
  command: 'ninja',
  filePatterns: ['**/*.ninja'],
  isAvailable(): boolean {
    return isCommandAvailable('ninja');
  },
  name: 'ninja',
  outputFormat: 'text',
  transform: transformNinjaOutput,
};
