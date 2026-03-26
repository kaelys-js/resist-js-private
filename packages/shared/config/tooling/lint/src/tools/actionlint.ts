/**
 * External Tool: actionlint
 *
 * Validates GitHub Actions workflow files using actionlint.
 * Outputs JSON format (with `-format` flag), transformed into LintResult[].
 *
 * @module
 */

import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { isCommandAvailable, type ExternalTool } from '@/lint/framework/tool-orchestrator.ts';

/**
 * Transform actionlint JSON output into LintResult[].
 *
 * actionlint with `-format '{{json .}}'` outputs a JSON array:
 * `[{ message, filepath, line, column, kind, snippet }]`
 *
 * @param {string} output - Raw JSON output from actionlint
 * @returns {LintResult[]} Transformed lint results
 */
export function transformActionlintOutput(output: string): LintResult[] {
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
    const file: string = (obj.filepath as string) ?? '';
    const line: number = (obj.line as number) ?? 1;
    const column: number = (obj.column as number) ?? 1;
    const message: string = (obj.message as string) ?? '';
    const kind: string = (obj.kind as string) ?? 'syntax-check';

    results.push(
      createResult(`actionlint/${kind}`, file, line, column, 'error', message, {
        source: (obj.snippet as string) ?? undefined,
      }),
    );
  }

  return results;
}

/** actionlint external tool definition. */
export const actionlintTool: ExternalTool = {
  name: 'actionlint',
  command: 'actionlint',
  args: ['-format', '{{json .}}'],
  outputFormat: 'json',
  filePatterns: ['**/.github/workflows/*.yml', '**/.github/workflows/*.yaml'],
  transform: transformActionlintOutput,
  isAvailable(): boolean {
    return isCommandAvailable('actionlint');
  },
};
