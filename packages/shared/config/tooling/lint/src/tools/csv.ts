/**
 * External Tool: CSV Validator
 *
 * Custom validator for CSV files (.csv) that checks column consistency.
 * Ensures all rows have the same number of columns as the header row.
 * This is a custom inline validator with no real external tool dependency.
 * The transform function parses a simple `filename:line: message` format.
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/** Regex for CSV validation output: `filename:line: message` */
const CSV_LINE: RegExp = /^(.+?):(\d+):\s*(.+)$/;

/**
 * Transform CSV validation output into LintResult[].
 *
 * Parses a simple text format where each line is:
 * `data.csv:5: expected 3 columns but found 4`
 *
 * Returns empty results for empty or unparseable output.
 *
 * @param {string} output - Raw text output to parse
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformCsvOutput('data.csv:5: expected 3 columns but found 4');
 * // results[0].ruleId === 'csv/column-count'
 * // results[0].line === 5
 * ```
 */
export function transformCsvOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = CSV_LINE.exec(stripped);
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const message: string = match[3] ?? '';

    results.push(createResult('csv/column-count', file, lineNum, 1, 'error', message));
  }

  return results;
}

/** CSV validator external tool definition (custom, no external dependency). */
export const csvTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: ['**/*.csv'],
  isAvailable(): boolean {
    return true;
  },
  name: 'csv',
  outputFormat: 'text',
  transform: transformCsvOutput,
};
