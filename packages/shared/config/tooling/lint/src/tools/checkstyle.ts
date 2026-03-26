/**
 * External Tool: Checkstyle
 *
 * Lints Java source files (.java) using Checkstyle with the Google checks configuration.
 * Parses text output format into LintResult[].
 *
 * Output format: `[SEVERITY] filename:line:column: message`
 * where SEVERITY is ERROR or WARN.
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for Checkstyle text output: `[SEVERITY] filename:line:column: message`
 *
 * Captures:
 * 1. Severity (ERROR or WARN)
 * 2. File path
 * 3. Line number
 * 4. Column number
 * 5. Message
 */
const CHECKSTYLE_LINE: RegExp = /^\[(ERROR|WARN)\]\s+(.+?):(\d+):(\d+):\s*(.+)$/;

/**
 * Transform Checkstyle text output into LintResult[].
 *
 * Checkstyle outputs lines in the format:
 * `[ERROR] /path/to/File.java:10:5: Missing Javadoc comment.`
 * `[WARN] /path/to/File.java:20:1: Line is longer than 100 characters.`
 *
 * @param {string} output - Raw text output from Checkstyle
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformCheckstyleOutput('[ERROR] /src/Main.java:10:5: Missing Javadoc comment.');
 * // results[0].ruleId === 'checkstyle/lint'
 * // results[0].severity === 'error'
 * ```
 */
export function transformCheckstyleOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = CHECKSTYLE_LINE.exec(stripped);
    if (!match) {
      continue;
    }

    const level: string = match[1] ?? 'WARN';
    const file: string = match[2] ?? '';
    const lineNum: number = Number.parseInt(match[3] ?? '1', 10);
    const column: number = Number.parseInt(match[4] ?? '1', 10);
    const message: string = match[5] ?? '';

    const severity: 'error' | 'warning' = level === 'ERROR' ? 'error' : 'warning';

    results.push(createResult('checkstyle/lint', file, lineNum, column, severity, message));
  }

  return results;
}

/** Checkstyle external tool definition. */
export const checkstyleTool: ExternalTool = {
  args: ['-c', '/google_checks.xml'],
  command: 'checkstyle',
  filePatterns: ['**/*.java'],
  isAvailable(): boolean {
    return isCommandAvailable('checkstyle');
  },
  name: 'checkstyle',
  outputFormat: 'text',
  transform: transformCheckstyleOutput,
};
