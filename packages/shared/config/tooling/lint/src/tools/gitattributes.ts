/**
 * External Tool: gitattributes
 *
 * Custom validator for .gitattributes files.
 * Checks for valid attribute names and detects conflicting
 * text/binary attribute combinations (e.g., `text binary`).
 * Parses text output in `filename:line: message` format into LintResult[].
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform gitattributes validator text output into LintResult[].
 *
 * Expects lines in the format:
 * `filename:line: message`
 *
 * @param {string} output - Raw text output from the gitattributes validator
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformGitattributesOutput('.gitattributes:2: Conflicting attributes — "text" and "binary" cannot both be set');
 * // results[0].ruleId === 'gitattributes/syntax'
 * ```
 */
export function transformGitattributesOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /*
   * Match output format:
   * .gitattributes:2: Conflicting attributes — "text" and "binary" cannot both be set
   * .gitattributes:5: Invalid attribute name "foo bar"
   */
  const pattern: RegExp = /^(.+?):(\d+):\s*(.+)$/;

  for (const line of lines) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = stripped.match(pattern);
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const message: string = match[3] ?? '';

    /* Conflicting attributes are errors; invalid names are warnings */
    const severity: 'error' | 'warning' = message.toLowerCase().includes('conflict')
      ? 'error'
      : 'warning';

    results.push(
      createResult('gitattributes/syntax', file, lineNum, 1, severity, message, {
        example: '*.ts text eol=lf diff=typescript',
        tip: 'Ensure each line has a valid pattern followed by valid, non-conflicting attributes',
      }),
    );
  }

  return results;
}

/** gitattributes custom validator external tool definition. */
export const gitattributesTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: ['**/.gitattributes'],
  isAvailable(): boolean {
    return true;
  },
  name: 'gitattributes',
  outputFormat: 'text',
  transform: transformGitattributesOutput,
};
