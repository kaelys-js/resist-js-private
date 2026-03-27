/**
 * External Tool: ShellCheck
 *
 * Lints shell scripts (.sh, .bash, .zsh) using ShellCheck.
 * Outputs JSON format, which is transformed into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { en } from '@/lint/locale/locales/en.ts';
import { format } from '@/lint/locale/schema.ts';

/**
 * Transform ShellCheck JSON output into LintResult[].
 *
 * ShellCheck JSON output is an array of objects with:
 * `{ file, line, column, endLine, endColumn, level, code, message }`
 *
 * @param {string} output - Raw JSON output from ShellCheck
 * @returns {LintResult[]} Transformed lint results
 */
export function transformShellcheckOutput(output: string): LintResult[] {
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
    const column: number = (obj.column as number) ?? 1;
    const level: string = (obj.level as string) ?? 'warning';
    const code: number = (obj.code as number) ?? 0;
    const message: string = (obj.message as string) ?? '';

    let severity: 'error' | 'warning' | 'info' = 'warning';
    if (level === 'error') {
      severity = 'error';
    } else if (level === 'info') {
      severity = 'info';
    }

    results.push(
      createResult(`shellcheck/SC${String(code)}`, file, line, column, severity, message, {
        endColumn: (obj.endColumn as number) ?? undefined,
        endLine: (obj.endLine as number) ?? undefined,
        tip: format(en.tools.toolSeeDocsAt, {
          url: `https://www.shellcheck.net/wiki/SC${String(code)}`,
        }),
      }),
    );
  }

  return results;
}

/** ShellCheck external tool definition. */
export const shellcheckTool: ExternalTool = {
  args: ['--format=json', '--severity=style'],
  command: 'shellcheck',
  filePatterns: ['**/*.sh', '**/*.bash', '**/*.zsh'],
  isAvailable(): boolean {
    return isCommandAvailable('shellcheck');
  },
  name: 'shellcheck',
  outputFormat: 'json',
  transform: transformShellcheckOutput,
};
