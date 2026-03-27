/**
 * External Tool: Sentinel Format
 *
 * Checks Sentinel policy file formatting using `sentinel fmt -check`.
 * Non-empty output indicates files that need formatting.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';

/**
 * Transform Sentinel format check output into LintResult[].
 *
 * `sentinel fmt -check` outputs the names of files that need formatting,
 * one per line. Non-empty output means files are not properly formatted.
 * Each non-empty line is treated as a filename.
 *
 * @param {string} output - Raw text output from `sentinel fmt -check`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformSentinelOutput('policy.sentinel\nrestrict.sentinel');
 * // results[0].ruleId === 'sentinel/format'
 * // results.length === 2
 * ```
  * @param {Type} strings - Description
 */
export function transformSentinelOutput(output: string, strings: LintStrings): LintResult[] {
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

    results.push(
      createResult(
        'sentinel/format',
        stripped,
        1,
        1,
        'warning',
        format(strings.tools.formatNotProperlyFormattedWithFix, { tool: 'sentinel fmt' }),
        {
          tip: format(strings.tools.formatRunTool, { tool: 'sentinel fmt' }),
        },
      ),
    );
  }

  return results;
}

/** Sentinel Format external tool definition. */
export const sentinelTool: ExternalTool = {
  args: ['fmt', '-check'],
  command: 'sentinel',
  filePatterns: ['**/*.sentinel'],
  isAvailable(): boolean {
    return isCommandAvailable('sentinel');
  },
  name: 'sentinel',
  outputFormat: 'text',
  transform: transformSentinelOutput,
};
