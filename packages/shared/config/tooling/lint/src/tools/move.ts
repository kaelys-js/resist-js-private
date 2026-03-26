/**
 * External Tool: Move Compiler
 *
 * Validates Move smart contract files (.move) using the Move compiler.
 * Parses build error output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for Move compiler error output.
 *
 * Matches lines like:
 * `error[E0401]: unbound module 'Coin' --> sources/Token.move:5:10`
 * `error[E1001]: some message --> sources/Module.move:12:3`
 */
const MOVE_ERROR: RegExp = /^error\[([A-Z]\d+)\]:\s*(.+?)\s*-->\s*(.+?):(\d+):(\d+)/;

/**
 * Transform Move compiler build output into LintResult[].
 *
 * The Move compiler (`move build`) outputs error diagnostics in the format:
 * `error[EXXXX]: message --> filename:line:column`
 *
 * Only lines containing errors are parsed. If the output contains no errors,
 * an empty array is returned (successful compilation).
 *
 * @param {string} output - Raw text output from Move compiler
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformMoveOutput("error[E0401]: unbound module 'Coin' --> sources/Token.move:5:10");
 * // results[0].ruleId === 'move/build'
 * // results[0].severity === 'error'
 * ```
 */
export function transformMoveOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  /* If no errors are present, the build succeeded */
  if (!trimmed.includes('error')) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = MOVE_ERROR.exec(stripped);
    if (!match) {
      continue;
    }

    const errorCode: string = match[1] ?? 'E0000';
    const message: string = match[2] ?? '';
    const file: string = match[3] ?? '';
    const lineNum: number = Number.parseInt(match[4] ?? '1', 10);
    const column: number = Number.parseInt(match[5] ?? '1', 10);

    results.push(
      createResult('move/build', file, lineNum, column, 'error', `${errorCode}: ${message}`),
    );
  }

  return results;
}

/** Move compiler external tool definition. */
export const moveTool: ExternalTool = {
  args: ['build'],
  command: 'move',
  filePatterns: ['**/*.move'],
  isAvailable(): boolean {
    return isCommandAvailable('move');
  },
  name: 'move',
  outputFormat: 'text',
  transform: transformMoveOutput,
};
