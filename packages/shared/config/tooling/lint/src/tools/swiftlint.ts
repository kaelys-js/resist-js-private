/**
 * External Tool: SwiftLint
 *
 * Lints Swift source files using SwiftLint.
 * Outputs JSON format (with `--reporter json`), which is transformed
 * into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform SwiftLint JSON output into LintResult[].
 *
 * SwiftLint with `--reporter json` outputs a JSON array of objects:
 * `[{ file, line, character, severity, type, reason, rule_id }]`
 *
 * @param {string} output - Raw JSON output from SwiftLint
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformSwiftlintOutput(JSON.stringify([{
 *   file: '/src/App.swift', line: 10, character: 5,
 *   severity: 'Warning', type: 'Line Length', reason: 'Line should be 120 characters or less',
 *   rule_id: 'line_length',
 * }]));
 * // results[0].ruleId === 'swiftlint/line_length'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformSwiftlintOutput(output: string): LintResult[] {
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
    const line: number = (obj.line as number) ?? 1;
    const column: number = (obj.character as number) ?? 1;
    const severityRaw: string = (obj.severity as string) ?? 'Warning';
    const reason: string = (obj.reason as string) ?? '';
    const ruleId: string = (obj.rule_id as string) ?? 'unknown';

    let severity: 'error' | 'warning' | 'info' = 'warning';
    if (severityRaw.toLowerCase() === 'error') {
      severity = 'error';
    }

    results.push(createResult(`swiftlint/${ruleId}`, file, line, column, severity, reason));
  }

  return results;
}

/** SwiftLint external tool definition. */
export const swiftlintTool: ExternalTool = {
  args: ['lint', '--quiet', '--reporter', 'json'],
  command: 'swiftlint',
  filePatterns: ['**/*.swift'],
  isAvailable(): boolean {
    return isCommandAvailable('swiftlint');
  },
  name: 'swiftlint',
  outputFormat: 'json',
  transform: transformSwiftlintOutput,
};
