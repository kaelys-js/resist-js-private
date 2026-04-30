/**
 * External Tool: HCL Format
 *
 * Checks HCL file formatting using `hclfmt -check`.
 * Non-empty output indicates files that need formatting.
 * Parses output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';

/**
 * Transform hclfmt check output into LintResult[].
 *
 * `hclfmt -check` outputs the names of files that need formatting,
 * one per line. Non-empty output means files are not properly formatted.
 * Each non-empty line is treated as a filename.
 *
 * @param {string} output - Raw text output from `hclfmt -check`
 * @param {LintStrings} strings - Locale strings
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformHclOutput('config.hcl\nvariables.hcl');
 * // results[0].ruleId === 'hcl/format'
 * // results.length === 2
 * ```
 */
export function transformHclOutput(output: string, strings: LintStrings): LintResult[] {
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
        'hcl/format',
        stripped,
        1,
        1,
        'warning',
        format(strings.tools.formatNotProperlyFormattedWithFix, { tool: 'hclfmt' }),
        {
          tip: format(strings.tools.formatRunTool, { tool: 'hclfmt' }),
        },
      ),
    );
  }

  return results;
}

/** HCL Format external tool definition. */
export const hclTool: ExternalTool = {
  args: ['-check'],
  command: 'hclfmt',
  filePatterns: ['**/*.hcl'],
  isAvailable(): boolean {
    return isCommandAvailable('hclfmt');
  },
  name: 'hcl',
  outputFormat: 'text',
  transform: transformHclOutput,
};
