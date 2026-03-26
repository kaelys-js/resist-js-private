/**
 * External Tool: HTMLHint
 *
 * Lints HTML files using HTMLHint.
 * Outputs JSON format, which is transformed into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform HTMLHint JSON output into LintResult[].
 *
 * HTMLHint JSON output is an array of file objects, each containing
 * a `messages` array with: `{ line, col, type, message, rule: { id } }`
 *
 * @param {string} output - Raw JSON output from HTMLHint
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformHtmlhintOutput('[{"file":"index.html","messages":[{"line":1,"col":1,"type":"error","message":"Doctype must be declared first.","rule":{"id":"doctype-first"}}]}]');
 * // results[0].ruleId === 'htmlhint/doctype-first'
 * ```
 */
export function transformHtmlhintOutput(output: string): LintResult[] {
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
    const fileObj: Record<string, unknown> = item as Record<string, unknown>;
    const filePath: string = (fileObj.file as string) ?? '';
    const messages: unknown[] = (fileObj.messages as unknown[]) ?? [];

    for (const msg of messages) {
      const msgObj: Record<string, unknown> = msg as Record<string, unknown>;
      const line: number = (msgObj.line as number) ?? 1;
      const col: number = (msgObj.col as number) ?? 1;
      const msgType: string = (msgObj.type as string) ?? 'warning';
      const message: string = (msgObj.message as string) ?? '';
      const ruleObj: Record<string, unknown> = (msgObj.rule as Record<string, unknown>) ?? {};
      const ruleId: string = (ruleObj.id as string) ?? 'unknown';

      let severity: 'error' | 'warning' | 'info' = 'warning';
      if (msgType === 'error') {
        severity = 'error';
      } else if (msgType === 'info') {
        severity = 'info';
      }

      results.push(
        createResult(`htmlhint/${ruleId}`, filePath, line, col, severity, message, {
          tip: `See https://htmlhint.com/docs/user-guide/rules/${ruleId}`,
        }),
      );
    }
  }

  return results;
}

/** HTMLHint external tool definition. */
export const htmlhintTool: ExternalTool = {
  args: ['--format', 'json'],
  command: 'htmlhint',
  filePatterns: ['**/*.html', '**/*.htm'],
  isAvailable(): boolean {
    return isCommandAvailable('htmlhint');
  },
  name: 'htmlhint',
  outputFormat: 'json',
  transform: transformHtmlhintOutput,
};
