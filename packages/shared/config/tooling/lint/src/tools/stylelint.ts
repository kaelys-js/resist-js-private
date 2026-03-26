/**
 * External Tool: Stylelint
 *
 * Lints CSS, SCSS, and Less files using Stylelint.
 * Outputs JSON format, which is transformed into LintResult[].
 *
 * @module
 */

import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { isCommandAvailable, type ExternalTool } from '@/lint/framework/tool-orchestrator.ts';

/**
 * Transform Stylelint JSON output into LintResult[].
 *
 * Stylelint JSON output is an array of file results:
 * `[{ source, warnings: [{ line, column, rule, severity, text }] }]`
 *
 * @param {string} output - Raw JSON output from Stylelint
 * @returns {LintResult[]} Transformed lint results
 */
export function transformStylelintOutput(output: string): LintResult[] {
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
    const source: string = (obj.source as string) ?? '';
    const warnings: unknown[] = (obj.warnings as unknown[]) ?? [];

    for (const warn of warnings) {
      const w: Record<string, unknown> = warn as Record<string, unknown>;
      const line: number = (w.line as number) ?? 1;
      const column: number = (w.column as number) ?? 1;
      const rule: string = (w.rule as string) ?? 'unknown';
      const severity: string = (w.severity as string) ?? 'warning';
      const text: string = (w.text as string) ?? '';

      results.push(
        createResult(
          `stylelint/${rule}`,
          source,
          line,
          column,
          severity === 'error' ? 'error' : 'warning',
          text,
        ),
      );
    }
  }

  return results;
}

/** Stylelint external tool definition. */
export const stylelintTool: ExternalTool = {
  name: 'stylelint',
  command: 'stylelint',
  args: ['--formatter', 'json'],
  outputFormat: 'json',
  filePatterns: ['**/*.css', '**/*.scss', '**/*.less'],
  transform: transformStylelintOutput,
  isAvailable(): boolean {
    return isCommandAvailable('stylelint');
  },
};
