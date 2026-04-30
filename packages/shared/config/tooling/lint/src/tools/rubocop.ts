/**
 * External Tool: RuboCop
 *
 * Lints Ruby files (.rb, .rake, .gemspec) using RuboCop.
 * Outputs JSON format, transformed into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform RuboCop JSON output into LintResult[].
 *
 * RuboCop with `--format json` outputs:
 * `{files: [{path, offenses: [{severity, message, cop_name, location: {start_line, start_column}}]}]}`
 *
 * Severity mapping:
 * - 'convention' | 'warning' → 'warning'
 * - 'error' | 'fatal' → 'error'
 *
 * @param {string} output - Raw JSON output from RuboCop
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformRubocopOutput('{"files":[{"path":"app.rb","offenses":[{"severity":"convention","message":"Line is too long.","cop_name":"Layout/LineLength","location":{"start_line":5,"start_column":1}}]}]}');
 * // results[0].ruleId === 'rubocop/Layout/LineLength'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformRubocopOutput(output: string): LintResult[] {
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
  const files: unknown[] = (root.files as unknown[]) ?? [];
  const results: LintResult[] = [];

  for (const fileEntry of files) {
    const fileObj: Record<string, unknown> = fileEntry as Record<string, unknown>;
    const filePath: string = (fileObj.path as string) ?? '';
    const offenses: unknown[] = (fileObj.offenses as unknown[]) ?? [];

    for (const offense of offenses) {
      const obj: Record<string, unknown> = offense as Record<string, unknown>;
      const rawSeverity: string = (obj.severity as string) ?? 'warning';
      const message: string = (obj.message as string) ?? '';
      const copName: string = (obj.cop_name as string) ?? 'unknown';
      const location: Record<string, unknown> = (obj.location as Record<string, unknown>) ?? {};

      const line: number = (location.start_line as number) ?? 1;
      const column: number = (location.start_column as number) ?? 1;

      let severity: 'error' | 'warning' | 'info' = 'warning';

      if (rawSeverity === 'error' || rawSeverity === 'fatal') {
        severity = 'error';
      }

      results.push(createResult(`rubocop/${copName}`, filePath, line, column, severity, message));
    }
  }

  return results;
}

/** RuboCop external tool definition. */
export const rubocopTool: ExternalTool = {
  args: ['--format', 'json'],
  command: 'rubocop',
  filePatterns: ['**/*.rb', '**/*.rake', '**/*.gemspec'],
  isAvailable(): boolean {
    return isCommandAvailable('rubocop');
  },
  name: 'rubocop',
  outputFormat: 'json',
  transform: transformRubocopOutput,
};
