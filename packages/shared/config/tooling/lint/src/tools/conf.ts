/**
 * External Tool: Configuration File Syntax Validator
 *
 * Custom syntax checker for .conf and .cfg files.
 * Delegates to INI-style validation logic for section headers and key=value pairs.
 * Uses a placeholder command since validation is custom.
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for conf validation output: `filename:line: message`
 */
const CONF_LINE: RegExp = /^(.+?):(\d+):\s+(.+)$/;

/**
 * Transform conf/cfg syntax checker output into LintResult[].
 *
 * Parses output in the format:
 * `app.conf:12: Invalid key-value pair`
 *
 * Same parsing pattern as ini.ts since .conf/.cfg files follow similar syntax.
 *
 * @param {string} output - Raw text output from the conf validator
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformConfOutput('app.conf:12: Invalid key-value pair');
 * // results[0].ruleId === 'conf/syntax'
 * ```
 */
export function transformConfOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = CONF_LINE.exec(stripped);

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const message: string = match[3] ?? '';

    results.push(createResult('conf/syntax', file, lineNum, 1, 'error', message));
  }

  return results;
}

/** Configuration file syntax validator external tool definition (custom, always available). */
export const confTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: ['**/*.conf', '**/*.cfg'],
  isAvailable(): boolean {
    return true;
  },
  name: 'conf',
  outputFormat: 'text',
  transform: transformConfOutput,
};
