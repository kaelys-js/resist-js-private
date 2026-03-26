/**
 * External Tool: jsonnetfmt
 *
 * Validates Jsonnet files (.jsonnet, .libsonnet) using `jsonnetfmt --test`.
 * Non-empty output indicates the file needs formatting.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for jsonnetfmt error output with file location.
 *
 * Matches lines like:
 * `config.jsonnet:5:10: error message`
 * `lib.libsonnet:1:1: some issue`
 *
 * Falls back to treating the entire non-empty output as a single diagnostic
 * when no structured lines are found.
 */
const JSONNET_LINE: RegExp = /^(.+?):(\d+):(\d+):\s*(.+)$/;

/**
 * Transform jsonnetfmt test output into LintResult[].
 *
 * `jsonnetfmt --test` exits with non-zero and outputs information
 * when a file needs formatting. Empty output means the file is
 * already correctly formatted. Non-empty output that doesn't
 * match the structured pattern is reported as a single warning.
 *
 * @param {string} output - Raw text output from jsonnetfmt
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformJsonnetOutput('config.jsonnet:5:10: needs formatting');
 * // results[0].ruleId === 'jsonnet/format'
 * // results[0].line === 5
 * ```
 */
export function transformJsonnetOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  let matched: boolean = false;

  for (const line of trimmed.split('\n')) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = JSONNET_LINE.exec(stripped);
    if (!match) {
      continue;
    }

    matched = true;
    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const message: string = match[4] ?? '';

    results.push(createResult('jsonnet/format', file, lineNum, column, 'warning', message));
  }

  /* Non-empty output with no structured lines — report as a single warning */
  if (!matched) {
    results.push(
      createResult('jsonnet/format', '', 1, 1, 'warning', trimmed.split('\n')[0] ?? trimmed),
    );
  }

  return results;
}

/** jsonnetfmt external tool definition. */
export const jsonnetTool: ExternalTool = {
  args: ['--test'],
  command: 'jsonnetfmt',
  filePatterns: ['**/*.jsonnet', '**/*.libsonnet'],
  isAvailable(): boolean {
    return isCommandAvailable('jsonnetfmt');
  },
  name: 'jsonnetfmt',
  outputFormat: 'text',
  transform: transformJsonnetOutput,
};
