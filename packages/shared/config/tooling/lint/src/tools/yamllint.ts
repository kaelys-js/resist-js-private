/**
 * External Tool: yamllint
 *
 * Validates YAML files (.yaml, .yml) using yamllint.
 * Parses text output format into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/** Regex for yamllint parsable output: `file:line:col: [level] message (rule)` */
const YAMLLINT_LINE: RegExp = /^(.+?):(\d+):(\d+): \[(warning|error)\] (.+)$/;

/**
 * Transform yamllint parsable output into LintResult[].
 *
 * yamllint with `-f parsable` outputs lines like:
 * `path/to/file.yml:3:1: [warning] too many blank lines (1 > 0) (empty-lines)`
 *
 * @param {string} output - Raw parsable output from yamllint
 * @returns {LintResult[]} Transformed lint results
 */
export function transformYamllintOutput(output: string): LintResult[] {
  const results: LintResult[] = [];

  for (const line of output.split('\n')) {
    const match: RegExpMatchArray | null = YAMLLINT_LINE.exec(line.trim());

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const level: string = match[4] ?? 'warning';
    const message: string = match[5] ?? '';

    const severity: 'error' | 'warning' = level === 'error' ? 'error' : 'warning';

    results.push(createResult('yamllint/yaml', file, lineNum, column, severity, message));
  }

  return results;
}

/** yamllint external tool definition. */
export const yamllintTool: ExternalTool = {
  args: ['-f', 'parsable'],
  command: 'yamllint',
  filePatterns: ['**/*.yaml', '**/*.yml'],
  isAvailable(): boolean {
    return isCommandAvailable('yamllint');
  },
  name: 'yamllint',
  outputFormat: 'text',
  transform: transformYamllintOutput,
};
