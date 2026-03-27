/**
 * External Tool: ls-lint
 *
 * Enforces file naming conventions using ls-lint.
 * Parses text output into LintResult[].
 * This is a workspace-level tool (not per-file).
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';

/**
 * Transform ls-lint text output into LintResult[].
 *
 * ls-lint outputs lines indicating naming violations, typically in formats like:
 * ```
 * src/MyComponent.tsx does not match the pattern
 * src/badName.ts failed for rule: kebab-case
 * ```
 *
 * Each non-empty line that is not a summary or header is treated as a violation.
 *
 * @param {string} output - Raw text output from ls-lint
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformLsLintOutput('src/MyComponent.tsx does not match the pattern\n');
 * // results[0].ruleId === 'ls-lint/naming'
 * ```
  * @param {Type} strings - Description
 */
export function transformLsLintOutput(output: string, strings: LintStrings): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /*
   * ls-lint error lines typically contain file paths and naming violations.
   * Common patterns:
   *   path/to/file.ext does not match the pattern
   *   path/to/file.ext failed for rule: <rule>
   *
   * We extract the file path from the beginning of each line.
   */
  const violationPattern: RegExp =
    /^(.+?)\s+(?:does not match|failed for|didn't match|is not valid)/i;

  for (const line of lines) {
    const lineStr: string = line.trim();
    if (lineStr.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = lineStr.match(violationPattern);
    if (match) {
      const file: string = match[1] ?? '';

      results.push(
        createResult('ls-lint/naming', file, 1, 1, 'warning', lineStr, {
          tip: strings.tools.lsLintTip,
        }),
      );
      continue;
    }

    /*
     * Fallback: treat any non-empty line that looks like a file path as a violation.
     * Skip lines that are clearly summary/header lines.
     */
    if (lineStr.includes('/') || lineStr.includes('.')) {
      const summaryIndicators: string[] = ['ls-lint', 'error', 'warning', 'total', 'passed'];
      const isSummary: boolean = summaryIndicators.some((indicator: string): boolean =>
        lineStr.toLowerCase().startsWith(indicator),
      );

      if (!isSummary) {
        results.push(
          createResult(
            'ls-lint/naming',
            lineStr,
            1,
            1,
            'warning',
            format(strings.tools.lsLintMessage, { violation: lineStr }),
            {
              tip: strings.tools.lsLintTip,
            },
          ),
        );
      }
    }
  }

  return results;
}

/** ls-lint external tool definition. */
export const lsLintTool: ExternalTool = {
  args: [],
  command: 'ls-lint',
  filePatterns: [],
  isAvailable(): boolean {
    return isCommandAvailable('ls-lint');
  },
  name: 'ls-lint',
  outputFormat: 'text',
  transform: transformLsLintOutput,
};
