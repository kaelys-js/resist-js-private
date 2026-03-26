/**
 * External Tool: mypy
 *
 * Type-checks Python source files (.py, .pyi) using mypy.
 * Parses text output in the mypy diagnostic format
 * (`filename:line: error/warning/note: message`) into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for mypy diagnostic output.
 *
 * Matches lines like:
 * `src/main.py:10: error: Incompatible types in assignment`
 * `lib/utils.py:25: warning: Unused "type: ignore" comment`
 * `src/types.pyi:3: note: Revealed type is "int"`
 * `src/main.py:10:5: error: Incompatible types in assignment  [assignment]`
 *
 * Supports both `filename:line:` and `filename:line:column:` formats.
 * Optionally captures a trailing `[code]` error code.
 */
const MYPY_LINE: RegExp = /^(.+?):(\d+)(?::(\d+))?:\s*(error|warning|note):\s*(.+)$/;

/**
 * Regex for extracting the optional mypy error code from a message.
 *
 * Matches trailing brackets like `[assignment]`, `[attr-defined]`, etc.
 */
const MYPY_CODE: RegExp = /\s*\[([^\]]+)\]\s*$/;

/**
 * Transform mypy text output into LintResult[].
 *
 * mypy (with `--no-error-summary`) outputs diagnostics in the format:
 * `filename:line: level: message [optional-code]`
 * `filename:line:column: level: message [optional-code]`
 *
 * Severity mapping:
 * - `error` → error
 * - `warning` → warning
 * - `note` → info
 *
 * @param {string} output - Raw text output from mypy
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformMypyOutput('src/main.py:10: error: Incompatible types in assignment  [assignment]');
 * // results[0].ruleId === 'mypy/type-check'
 * // results[0].severity === 'error'
 * ```
 */
export function transformMypyOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = MYPY_LINE.exec(stripped);
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = match[3] ? Number.parseInt(match[3], 10) : 1;
    const level: string = match[4] ?? 'error';
    let message: string = match[5] ?? '';

    /* Extract optional error code from message */
    const codeMatch: RegExpMatchArray | null = MYPY_CODE.exec(message);
    let tip: string | undefined;
    if (codeMatch) {
      const code: string = codeMatch[1] ?? '';
      message = message.replace(MYPY_CODE, '').trim();
      tip = `mypy error code: ${code}`;
    }

    let severity: 'error' | 'warning' | 'info' = 'error';
    if (level === 'warning') {
      severity = 'warning';
    } else if (level === 'note') {
      severity = 'info';
    }

    results.push(
      createResult('mypy/type-check', file, lineNum, column, severity, message, {
        tip,
      }),
    );
  }

  return results;
}

/** mypy external tool definition. */
export const mypyTool: ExternalTool = {
  args: ['--no-error-summary'],
  command: 'mypy',
  filePatterns: ['**/*.py', '**/*.pyi'],
  isAvailable(): boolean {
    return isCommandAvailable('mypy');
  },
  name: 'mypy',
  outputFormat: 'text',
  transform: transformMypyOutput,
};
