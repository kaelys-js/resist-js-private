/**
 * External Tool: Hadolint
 *
 * Lints Dockerfiles using Hadolint.
 * Outputs JSON format, which is transformed into LintResult[].
 *
 * @module
 */

import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { isCommandAvailable, type ExternalTool } from '@/lint/framework/tool-orchestrator.ts';

/**
 * Transform Hadolint JSON output into LintResult[].
 *
 * Hadolint JSON output (with `--format json`) is an array of objects:
 * `{ line, code, message, column, file, level }`
 *
 * @param {string} output - Raw JSON output from Hadolint
 * @returns {LintResult[]} Transformed lint results
 */
export function transformHadolintOutput(output: string): LintResult[] {
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
    const file: string = (obj.file as string) ?? 'Dockerfile';
    const line: number = (obj.line as number) ?? 1;
    const column: number = (obj.column as number) ?? 1;
    const level: string = (obj.level as string) ?? 'warning';
    const code: string = (obj.code as string) ?? '';
    const message: string = (obj.message as string) ?? '';

    let severity: 'error' | 'warning' | 'info' = 'warning';
    if (level === 'error') {
      severity = 'error';
    } else if (level === 'info') {
      severity = 'info';
    }

    results.push(
      createResult(`hadolint/${code}`, file, line, column, severity, message, {
        tip: `See https://github.com/hadolint/hadolint/wiki/${code}`,
      }),
    );
  }

  return results;
}

/** Hadolint external tool definition. */
export const hadolintTool: ExternalTool = {
  name: 'hadolint',
  command: 'hadolint',
  args: ['--format', 'json'],
  outputFormat: 'json',
  filePatterns: ['Dockerfile', 'Dockerfile*'],
  transform: transformHadolintOutput,
  isAvailable(): boolean {
    return isCommandAvailable('hadolint');
  },
};
