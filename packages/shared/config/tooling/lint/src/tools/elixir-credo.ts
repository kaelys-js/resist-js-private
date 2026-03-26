/**
 * External Tool: Credo (Elixir)
 *
 * Lints Elixir files (.ex, .exs) using Credo via `mix credo`.
 * Outputs JSON format, transformed into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform Credo JSON output into LintResult[].
 *
 * Credo with `--format=json` outputs:
 * `{issues: [{category, check, message, filename, line_no, column, priority}]}`
 *
 * Priority mapping:
 * - priority >= 10 → 'error'
 * - priority < 10 → 'warning'
 *
 * @param {string} output - Raw JSON output from `mix credo`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformCredoOutput('{"issues":[{"category":"readability","check":"Credo.Check.Readability.ModuleDoc","message":"Modules should have a @moduledoc tag.","filename":"lib/app.ex","line_no":1,"column":null,"priority":1}]}');
 * // results[0].ruleId === 'credo/Credo.Check.Readability.ModuleDoc'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformCredoOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return [];
  }

  const root: Record<string, unknown> = parsed as Record<string, unknown>;
  const issues: unknown[] = (root.issues as unknown[]) ?? [];
  const results: LintResult[] = [];

  for (const issue of issues) {
    const obj: Record<string, unknown> = issue as Record<string, unknown>;
    const check: string = (obj.check as string) ?? 'unknown';
    const message: string = (obj.message as string) ?? '';
    const filename: string = (obj.filename as string) ?? '';
    const lineNo: number = (obj.line_no as number) ?? 1;
    const column: number = (obj.column as number) ?? 1;
    const priority: number = (obj.priority as number) ?? 0;

    const severity: 'error' | 'warning' = priority >= 10 ? 'error' : 'warning';

    results.push(createResult(`credo/${check}`, filename, lineNo, column, severity, message));
  }

  return results;
}

/** Credo (Elixir) external tool definition. */
export const credoTool: ExternalTool = {
  args: ['credo', '--format=json'],
  command: 'mix',
  filePatterns: ['**/*.ex', '**/*.exs'],
  isAvailable(): boolean {
    return isCommandAvailable('mix');
  },
  name: 'credo',
  outputFormat: 'json',
  transform: transformCredoOutput,
};
