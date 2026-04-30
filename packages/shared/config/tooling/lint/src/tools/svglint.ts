/**
 * External Tool: svglint
 *
 * Lints SVG files (.svg) using svglint in CI mode.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for svglint output lines.
 *
 * Matches simple `file: message` format lines like:
 * `icon.svg: Expected attribute "viewBox" on <svg>`
 * `logo.svg: Unexpected element <script>`
 */
const SVGLINT_LINE: RegExp = /^(.+?):\s*(.+)$/;

/**
 * Transform svglint CI text output into LintResult[].
 *
 * svglint with `--ci` outputs diagnostics in a simple format:
 * `file: message`
 *
 * Lines that don't match the expected pattern (headers, summaries,
 * blank lines) are silently skipped.
 *
 * @param {string} output - Raw text output from svglint
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformSvglintOutput('icon.svg: Expected attribute "viewBox" on <svg>');
 * // results[0].ruleId === 'svglint/lint'
 * // results[0].file === 'icon.svg'
 * ```
 */
export function transformSvglintOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = SVGLINT_LINE.exec(stripped);

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const message: string = match[2] ?? '';

    /* Skip summary/header lines that don't look like file paths */
    if (!file.endsWith('.svg')) {
      continue;
    }

    results.push(createResult('svglint/lint', file, 1, 1, 'warning', message));
  }

  return results;
}

/** svglint external tool definition. */
export const svglintTool: ExternalTool = {
  args: ['--ci'],
  command: 'svglint',
  filePatterns: ['**/*.svg'],
  isAvailable(): boolean {
    return isCommandAvailable('svglint');
  },
  name: 'svglint',
  outputFormat: 'text',
  transform: transformSvglintOutput,
};
