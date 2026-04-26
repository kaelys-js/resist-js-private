/**
 * External Tool: just
 *
 * Validates justfiles using `just --check --justfile`.
 * Checks formatting and parses error output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import type { LintStrings } from '@/lint/locale/schema.ts';

/**
 * Regex for just error output: `error: ... at line N`
 */
const JUST_ERROR_LINE: RegExp = /^error:\s*(.+?)\s+at\s+line\s+(\d+)/i;

/**
 * Transform just `--check` error output into LintResult[].
 *
 * `just --check --justfile <file>` exits with a non-zero code and writes
 * error messages to stderr when the justfile has formatting issues.
 * Lines matching `error: <message> at line N` are extracted.
 * Non-empty output that doesn't match a specific pattern is still reported
 * as a generic formatting issue.
 *
 * @param {string} output - Raw error output from `just --check`
 * @param {LintStrings} strings - Locale strings
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformJustOutput('error: unexpected token at line 5');
 * // results[0].ruleId === 'justfile/format'
 * ```
 */
export function transformJustOutput(output: string, strings: LintStrings): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');
  let hasMatch: boolean = false;

  for (const line of lines) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = JUST_ERROR_LINE.exec(stripped);
    if (match) {
      const message: string = match[1] ?? strings.tools.justfileFormattingIssue;
      const lineNum: number = Number.parseInt(match[2] ?? '1', 10);

      results.push(createResult('justfile/format', '', lineNum, 1, 'error', message));
      hasMatch = true;
    }
  }

  /* If there was non-empty output but no regex matches, report a generic issue */
  if (!hasMatch) {
    results.push(
      createResult('justfile/format', '', 1, 1, 'warning', strings.tools.justfileFormatting),
    );
  }

  return results;
}

/** just external tool definition for justfile format checking. */
export const justTool: ExternalTool = {
  args: ['--check', '--justfile'],
  command: 'just',
  filePatterns: ['**/justfile', '**/Justfile'],
  isAvailable(): boolean {
    return isCommandAvailable('just');
  },
  name: 'just',
  outputFormat: 'text',
  transform: transformJustOutput,
};
