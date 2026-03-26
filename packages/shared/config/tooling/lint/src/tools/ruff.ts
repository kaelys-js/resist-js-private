/**
 * External Tool: Ruff
 *
 * Lints Python files using Ruff.
 * Outputs JSON format, transformed into LintResult[].
 *
 * @module
 */

import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { isCommandAvailable, type ExternalTool } from '@/lint/framework/tool-orchestrator.ts';

/**
 * Transform Ruff JSON output into LintResult[].
 *
 * Ruff with `--output-format json` outputs:
 * `[{ code, message, filename, location: { row, column }, end_location: { row, column } }]`
 *
 * @param {string} output - Raw JSON output from Ruff
 * @returns {LintResult[]} Transformed lint results
 */
export function transformRuffOutput(output: string): LintResult[] {
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
        endLine: (endLocation.row as number) ?? undefined,
        endColumn: (endLocation.column as number) ?? undefined,
        tip: `See https://docs.astral.sh/ruff/rules/${code}`,
      }),
    );
  }

  return results;
}

/** Ruff external tool definition. */
export const ruffTool: ExternalTool = {
  name: 'ruff',
  command: 'ruff',
  args: ['check', '--output-format', 'json'],
  outputFormat: 'json',
  filePatterns: ['**/*.py'],
  transform: transformRuffOutput,
  isAvailable(): boolean {
    return isCommandAvailable('ruff');
  },
};
