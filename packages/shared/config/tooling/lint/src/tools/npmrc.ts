/**
 * External Tool: npmrc
 *
 * Custom validator for .npmrc files.
 * Checks that each non-empty, non-comment line follows valid `key=value` syntax.
 * Parses text output in `filename:line: message` format into LintResult[].
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import type { LintStrings } from '@/lint/locale/schema.ts';

/**
 * Transform npmrc validator text output into LintResult[].
 *
 * Expects lines in the format:
 * `filename:line: message`
 *
 * @param {string} output - Raw text output from the npmrc validator
 * @param {LintStrings} strings - Locale strings
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformNpmrcOutput('.npmrc:3: Invalid syntax — expected key=value');
 * // results[0].ruleId === 'npmrc/syntax'
 * ```
 */
export function transformNpmrcOutput(output: string, strings: LintStrings): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /*
   * Match output format:
   * .npmrc:3: Invalid syntax — expected key=value
   * path/to/.npmrc:10: Empty value for key "registry"
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
      createResult('npmrc/syntax', file, lineNum, 1, 'error', message, {
        example: 'registry=https://registry.npmjs.org/',
        tip: strings.tools.npmrcTip,
      }),
    );
  }

  return results;
}

/** npmrc custom validator external tool definition. */
export const npmrcTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: ['**/.npmrc'],
  isAvailable(): boolean {
    return true;
  },
  name: 'npmrc',
  outputFormat: 'text',
  transform: transformNpmrcOutput,
};
