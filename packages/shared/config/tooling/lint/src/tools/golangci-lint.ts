/**
 * External Tool: golangci-lint
 *
 * Lints Go source files using golangci-lint.
 * Parses line-number text output (`filename:line:column: message (linter-name)`)
 * into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for golangci-lint line-number output format.
 *
 * Matches lines with column:
 * `main.go:10:5: undeclared name: x (typecheck)`
 *
 * Matches lines without column:
 * `main.go:10: error message (linter-name)`
 */
const GOLANGCI_LINE: RegExp = /^(.+?):(\d+):(?:(\d+):)? (.+?) \((\w[\w-]*)\)$/;

/**
 * Transform golangci-lint line-number output into LintResult[].
 *
 * golangci-lint with `--out-format=line-number` outputs diagnostics:
 * `filename:line:column: message (linter-name)`
 * or without column:
 * `filename:line: message (linter-name)`
 *
 * The linter name in parentheses is used as the rule suffix.
 *
 * @param {string} output - Raw text output from golangci-lint
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformGolangciLintOutput('main.go:10:5: undeclared name: x (typecheck)');
 * // results[0].ruleId === 'golangci-lint/typecheck'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformGolangciLintOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const match: RegExpMatchArray | null = GOLANGCI_LINE.exec(line.trim());

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = match[3] ? Number.parseInt(match[3], 10) : 1;
    const message: string = match[4] ?? '';
    const linterName: string = match[5] ?? 'unknown';

    results.push(
      createResult(`golangci-lint/${linterName}`, file, lineNum, column, 'warning', message),
    );
  }

  return results;
}

/** golangci-lint external tool definition. */
export const golangciLintTool: ExternalTool = {
  args: ['run', '--out-format=line-number'],
  command: 'golangci-lint',
  filePatterns: ['**/*.go'],
  isAvailable(): boolean {
    return isCommandAvailable('golangci-lint');
  },
  name: 'golangci-lint',
  outputFormat: 'text',
  transform: transformGolangciLintOutput,
};
