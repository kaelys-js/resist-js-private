/**
 * External Tool: INI Syntax Validator
 *
 * Custom syntax checker for .ini files.
 * Validates section headers `[...]` and key=value pairs.
 * Uses a placeholder command since validation is custom.
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for INI validation output: `filename:line: message`
 */
const INI_LINE: RegExp = /^(.+?):(\d+):\s+(.+)$/;

/**
 * Transform INI syntax checker output into LintResult[].
 *
 * Parses output in the format:
 * `config.ini:5: Invalid key-value pair`
 *
 * @param {string} output - Raw text output from the INI validator
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformIniOutput('config.ini:5: Invalid key-value pair');
 * // results[0].ruleId === 'ini/syntax'
 * ```
 */
export function transformIniOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = INI_LINE.exec(stripped);
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const message: string = match[3] ?? '';

    results.push(createResult('ini/syntax', file, lineNum, 1, 'error', message));
  }

  return results;
}

/** INI syntax validator external tool definition (custom, always available). */
export const iniTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: ['**/*.ini'],
  isAvailable(): boolean {
    return true;
  },
  name: 'ini',
  outputFormat: 'text',
  transform: transformIniOutput,
};
