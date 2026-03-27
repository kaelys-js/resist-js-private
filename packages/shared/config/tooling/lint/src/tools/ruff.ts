/**
 * External Tool: Ruff
 *
 * Lints Python files using Ruff.
 * Outputs JSON format, transformed into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';

/**
 * Transform Ruff JSON output into LintResult[].
 *
 * Ruff with `--output-format json` outputs:
 * `[{ code, message, filename, location: { row, column }, end_location: { row, column } }]`
 *
 * @param {string} output - Raw JSON output from Ruff
 * @returns {LintResult[]} Transformed lint results
  * @param {Type} strings - Description
 */
export function transformRuffOutput(output: string, strings: LintStrings): LintResult[] {
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
    const code: string = (obj.code as string) ?? 'unknown';
    const message: string = (obj.message as string) ?? '';
    const file: string = (obj.filename as string) ?? '';
    const location: Record<string, unknown> = (obj.location as Record<string, unknown>) ?? {};
    const endLocation: Record<string, unknown> =
      (obj.end_location as Record<string, unknown>) ?? {};

    const line: number = (location.row as number) ?? 1;
    const column: number = (location.column as number) ?? 1;

    results.push(
      createResult(`ruff/${code}`, file, line, column, 'warning', message, {
        endColumn: (endLocation.column as number) ?? undefined,
        endLine: (endLocation.row as number) ?? undefined,
        tip: format(strings.tools.toolSeeDocsAt, {
          url: `https://docs.astral.sh/ruff/rules/${code}`,
        }),
      }),
    );
  }

  return results;
}

/** Ruff external tool definition. */
export const ruffTool: ExternalTool = {
  args: ['check', '--output-format', 'json'],
  command: 'ruff',
  filePatterns: ['**/*.py'],
  isAvailable(): boolean {
    return isCommandAvailable('ruff');
  },
  name: 'ruff',
  outputFormat: 'json',
  transform: transformRuffOutput,
};
