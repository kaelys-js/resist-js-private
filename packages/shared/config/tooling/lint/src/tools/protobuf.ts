/**
 * External Tool: Protobuf Lint (buf)
 *
 * Lints Protocol Buffer files (.proto) using `buf lint`.
 * Parses text output in `filename:line:column:message` format into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/** Regex for buf lint output: `filename:line:column:message` */
const BUF_LINE: RegExp = /^(.+?):(\d+):(\d+):(.+)$/;

/**
 * Transform buf lint text output into LintResult[].
 *
 * `buf lint` outputs lines in the format:
 * `filename:line:column:message`
 *
 * Each matching line is converted to a lint result with rule ID `protobuf/lint`.
 *
 * @param {string} output - Raw text output from `buf lint`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformProtobufOutput('api.proto:10:3:Field name "myField" should be lower_snake_case.');
 * // results[0].ruleId === 'protobuf/lint'
 * // results[0].line === 10
 * // results[0].column === 3
 * ```
 */
export function transformProtobufOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  for (const line of lines) {
    const stripped: string = line.trim();

    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = BUF_LINE.exec(stripped);

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const message: string = (match[4] ?? '').trim();

    results.push(createResult('protobuf/lint', file, lineNum, column, 'warning', message));
  }

  return results;
}

/** Protobuf Lint (buf) external tool definition. */
export const protobufTool: ExternalTool = {
  args: ['lint'],
  command: 'buf',
  filePatterns: ['**/*.proto'],
  isAvailable(): boolean {
    return isCommandAvailable('buf');
  },
  name: 'protobuf',
  outputFormat: 'text',
  transform: transformProtobufOutput,
};
