/**
 * External Tool: SQLFluff
 *
 * Lints SQL files using SQLFluff.
 * Outputs JSON format, transformed into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';

/**
 * Transform SQLFluff JSON output into LintResult[].
 *
 * SQLFluff JSON output with `--format json` produces:
 * `[{ filepath, violations: [{ start_line_no, start_line_pos, code, description }] }]`
 *
 * @param {string} output - Raw JSON output from SQLFluff
 * @param {LintStrings} strings - Locale strings
 * @returns {LintResult[]} Transformed lint results
 */
export function transformSqlfluffOutput(output: string, strings: LintStrings): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  let items: unknown[];
  try {
    items = JSON.parse(trimmed) as unknown[];
  } catch {
    return [];
  }

  const results: LintResult[] = [];
  for (const item of items) {
    const obj: Record<string, unknown> = item as Record<string, unknown>;
    const file: string = (obj.filepath as string) ?? '';
    const violations: unknown[] = (obj.violations as unknown[]) ?? [];

    for (const violation of violations) {
      const v: Record<string, unknown> = violation as Record<string, unknown>;
      const line: number = (v.start_line_no as number) ?? 1;
      const column: number = (v.start_line_pos as number) ?? 1;
      const code: string = (v.code as string) ?? 'unknown';
      const description: string = (v.description as string) ?? '';

      results.push(
        createResult(`sqlfluff/${code}`, file, line, column, 'warning', description, {
          tip: format(strings.tools.toolSeeDocsAt, {
            url: `https://docs.sqlfluff.com/en/stable/rules.html#rule-${code}`,
          }),
        }),
      );
    }
  }

  return results;
}

/** SQLFluff external tool definition. */
export const sqlfluffTool: ExternalTool = {
  args: ['lint', '--format', 'json'],
  command: 'sqlfluff',
  filePatterns: ['**/*.sql'],
  isAvailable(): boolean {
    return isCommandAvailable('sqlfluff');
  },
  name: 'sqlfluff',
  outputFormat: 'json',
  transform: transformSqlfluffOutput,
};
