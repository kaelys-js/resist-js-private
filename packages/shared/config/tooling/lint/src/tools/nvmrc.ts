/**
 * External Tool: nvmrc
 *
 * Custom validator for .nvmrc files.
 * Checks that the file contains a valid Node.js version pattern
 * (e.g., `v18`, `18.17.0`, `lts/*`, `lts/hydrogen`, `node`, `stable`).
 * Parses text output in `filename:line: message` format into LintResult[].
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import type { LintStrings } from '@/lint/locale/schema.ts';

/**
 * Transform nvmrc validator text output into LintResult[].
 *
 * Expects lines in the format:
 * `filename:line: message`
 *
 * @param {string} output - Raw text output from the nvmrc validator
 * @param {LintStrings} strings - Locale strings
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformNvmrcOutput('.nvmrc:1: Invalid version pattern "latest"');
 * // results[0].ruleId === 'nvmrc/version'
 * ```
 */
export function transformNvmrcOutput(output: string, strings: LintStrings): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /*
   * Match output format:
   * .nvmrc:1: Invalid version pattern "latest"
   * path/to/.nvmrc:1: Empty version string
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

    results.push(
      createResult('nvmrc/version', file, lineNum, 1, 'error', message, {
        example: 'v22',
        tip: strings.tools.nvmrcTip,
      }),
    );
  }

  return results;
}

/** nvmrc custom validator external tool definition. */
export const nvmrcTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: ['**/.nvmrc'],
  isAvailable(): boolean {
    return true;
  },
  name: 'nvmrc',
  outputFormat: 'text',
  transform: transformNvmrcOutput,
};
