/**
 * External Tool: Vyper Compiler
 *
 * Validates Vyper smart contract files (.vy) using the Vyper compiler.
 * Runs a compilation check and parses error output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for Vyper compiler exception output.
 *
 * Matches lines like:
 * `vyper.exceptions.SyntaxException: some message (contracts/Token.vy, line 10, ...)`
 * `vyper.exceptions.TypeMismatch: invalid type (contracts/Vault.vy, line 42, ...)`
 * `vyper.exceptions.StructureException: message (filename.vy, line 5, ...)`
 */
const VYPER_EXCEPTION: RegExp = /^vyper\.exceptions\.(\w+):\s*(.+?)\s*\((.+?),\s*line\s+(\d+)/;

/**
 * Transform Vyper compiler output into LintResult[].
 *
 * The Vyper compiler (`vyper -f bytecode`) performs a compilation check.
 * If compilation fails, error output contains exception lines in the format:
 * `vyper.exceptions.XXXException: message (filename, line N, ...)`
 *
 * If the output contains no error/exception lines, compilation succeeded
 * and an empty array is returned.
 *
 * @param {string} output - Raw text output from Vyper compiler
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformVyperOutput(
 *   "vyper.exceptions.SyntaxException: invalid syntax (contracts/Token.vy, line 10, col 5)"
 * );
 * // results[0].ruleId === 'vyper/compile'
 * // results[0].severity === 'error'
 * ```
 */
export function transformVyperOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = VYPER_EXCEPTION.exec(stripped);
    if (!match) {
      continue;
    }

    const exceptionType: string = match[1] ?? 'CompilerError';
    const message: string = match[2] ?? '';
    const file: string = match[3] ?? '';
    const lineNum: number = Number.parseInt(match[4] ?? '1', 10);

    results.push(
      createResult('vyper/compile', file, lineNum, 1, 'error', `${exceptionType}: ${message}`),
    );
  }

  return results;
}

/** Vyper compiler external tool definition. */
export const vyperTool: ExternalTool = {
  args: ['-f', 'bytecode'],
  command: 'vyper',
  filePatterns: ['**/*.vy'],
  isAvailable(): boolean {
    return isCommandAvailable('vyper');
  },
  name: 'vyper',
  outputFormat: 'text',
  transform: transformVyperOutput,
};
