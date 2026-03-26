/**
 * External Tool: SQLFluff
 *
 * Lints SQL files using SQLFluff.
 * Outputs JSON format, transformed into LintResult[].
 *
 * @module
 */

import { createResult } from '@/lint/framework/types.ts';
import type { LintResult } from '@/lint/framework/types.ts';
import { isCommandAvailable, type ExternalTool } from '@/lint/framework/tool-orchestrator.ts';

/**
 * Transform SQLFluff JSON output into LintResult[].
 *
 * SQLFluff JSON output with `--format json` produces:
 * `[{ filepath, violations: [{ start_line_no, start_line_pos, code, description }] }]`
 *
 * @param {string} output - Raw JSON output from SQLFluff
 * @returns {LintResult[]} Transformed lint results
 */
export function transformSqlfluffOutput(output: string): LintResult[] {
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
        createResult('sqlfluff/' + code, file, line, column, 'warning', description, {
          tip: `See https://docs.sqlfluff.com/en/stable/rules.html#rule-${code}`,
        }),
      );
    }
  }

  return results;
}

/** SQLFluff external tool definition. */
export const sqlfluffTool: ExternalTool = {
  name: 'sqlfluff',
  command: 'sqlfluff',
  args: ['lint', '--format', 'json'],
  outputFormat: 'json',
  filePatterns: ['**/*.sql'],
  transform: transformSqlfluffOutput,
  async isAvailable(): Promise<boolean> {
    return isCommandAvailable('sqlfluff');
  },
};
