/**
 * External Tool: Taplo
 *
 * Validates TOML files using Taplo.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/** Regex for taplo lint output: `error[rule]: message  --> file:line:col` */
const TAPLO_LINE: RegExp = /^(error|warning)\[([^\]]*)\]:\s+(.+?)(?:\s+-->\s+(.+?):(\d+):(\d+))?$/;

/**
 * Transform Taplo text output into LintResult[].
 *
 * Taplo `lint` outputs lines like:
 * `error[expected_equals]: expected `=`  --> config.toml:3:1`
 *
 * @param {string} output - Raw text output from Taplo
 * @returns {LintResult[]} Transformed lint results
 */
export function transformTaploOutput(output: string): LintResult[] {
  const results: LintResult[] = [];

  for (const line of output.split('\n')) {
    const match: RegExpMatchArray | null = TAPLO_LINE.exec(line.trim());
    if (!match) {
      continue;
    }

    const level: string = match[1] ?? 'error';
    const rule: string = match[2] ?? 'unknown';
    const message: string = match[3] ?? '';
    const file: string = match[4] ?? '';
    const lineNum: number = Number.parseInt(match[5] ?? '1', 10);
    const column: number = Number.parseInt(match[6] ?? '1', 10);

    results.push(
      createResult(
        `taplo/${rule}`,
        file,
        lineNum,
        column,
        level === 'error' ? 'error' : 'warning',
        message,
      ),
    );
  }

  return results;
}

/** Taplo external tool definition. */
export const taploTool: ExternalTool = {
  args: ['lint'],
  command: 'taplo',
  filePatterns: ['**/*.toml'],
  isAvailable(): boolean {
    return isCommandAvailable('taplo');
  },
  name: 'taplo',
  outputFormat: 'text',
  transform: transformTaploOutput,
};
