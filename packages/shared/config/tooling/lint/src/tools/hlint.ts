/**
 * External Tool: HLint
 *
 * Lints Haskell files (.hs, .lhs) using HLint.
 * Outputs JSON format, transformed into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform HLint JSON output into LintResult[].
 *
 * HLint with `--json` outputs a JSON array:
 * `[{file, startLine, startColumn, endLine, endColumn, severity, hint, from, to}]`
 *
 * Severity mapping:
 * - 'Error' → 'error'
 * - 'Warning' → 'warning'
 * - 'Suggestion' → 'info'
 *
 * When both `from` and `to` fields exist, a tip is generated:
 * `Replace: "${from}" with "${to}"`
 *
 * @param {string} output - Raw JSON output from HLint
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformHlintOutput('[{"file":"Main.hs","startLine":5,"startColumn":1,"endLine":5,"endColumn":20,"severity":"Warning","hint":"Use map","from":"fmap f xs","to":"map f xs"}]');
 * // results[0].ruleId === 'hlint/hint'
 * // results[0].severity === 'warning'
 * // results[0].tip === 'Replace: "fmap f xs" with "map f xs"'
 * ```
 */
export function transformHlintOutput(output: string): LintResult[] {
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
    const file: string = (obj.file as string) ?? '';
    const startLine: number = (obj.startLine as number) ?? 1;
    const startColumn: number = (obj.startColumn as number) ?? 1;
    const rawSeverity: string = (obj.severity as string) ?? 'Warning';
    const hint: string = (obj.hint as string) ?? '';
    const from: string | undefined = obj.from as string | undefined;
    const to: string | undefined = obj.to as string | undefined;

    let severity: 'error' | 'warning' | 'info' = 'warning';

    if (rawSeverity === 'Error') {
      severity = 'error';
    } else if (rawSeverity === 'Suggestion') {
      severity = 'info';
    }

    let tip: string | undefined;

    if (from && to) {
      tip = `Replace: "${from}" with "${to}"`;
    }

    results.push(
      createResult(`hlint/hint`, file, startLine, startColumn, severity, hint, {
        endColumn: (obj.endColumn as number) ?? undefined,
        endLine: (obj.endLine as number) ?? undefined,
        tip,
      }),
    );
  }

  return results;
}

/** HLint external tool definition. */
export const hlintTool: ExternalTool = {
  args: ['--json'],
  command: 'hlint',
  filePatterns: ['**/*.hs', '**/*.lhs'],
  isAvailable(): boolean {
    return isCommandAvailable('hlint');
  },
  name: 'hlint',
  outputFormat: 'json',
  transform: transformHlintOutput,
};
