/**
 * External Tool: wat2wasm
 *
 * Validates WebAssembly text format files (.wat, .wast) using wat2wasm.
 * Parses syntax error output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for wat2wasm error output.
 *
 * Matches lines like:
 * `module.wat:10:5: error: unexpected token`
 * `test.wast:3:12: error: expected '(' or module field`
 */
const WAT_ERROR: RegExp = /^(.+?):(\d+):(\d+):\s*error:\s*(.+)$/;

/**
 * Transform wat2wasm output into LintResult[].
 *
 * wat2wasm outputs error diagnostics in the format:
 * `filename:line:column: error: message`
 *
 * If the file compiles successfully, no output is produced and an empty
 * array is returned.
 *
 * @param {string} output - Raw text output from wat2wasm
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformWatOutput("module.wat:10:5: error: unexpected token");
 * // results[0].ruleId === 'wat/syntax'
 * // results[0].severity === 'error'
 * ```
 */
export function transformWatOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const stripped: string = line.trim();

    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = WAT_ERROR.exec(stripped);

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const message: string = match[4] ?? '';

    results.push(createResult('wat/syntax', file, lineNum, column, 'error', message));
  }

  return results;
}

/** wat2wasm external tool definition. */
export const watTool: ExternalTool = {
  args: ['--debug-names', '-o', '/dev/null'],
  command: 'wat2wasm',
  filePatterns: ['**/*.wat', '**/*.wast'],
  isAvailable(): boolean {
    return isCommandAvailable('wat2wasm');
  },
  name: 'wat2wasm',
  outputFormat: 'text',
  transform: transformWatOutput,
};
