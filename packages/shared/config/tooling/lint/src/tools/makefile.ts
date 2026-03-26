/**
 * External Tool: checkmake
 *
 * Validates Makefiles using checkmake.
 * Parses text output (custom format via `--format` flag) into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for checkmake output format: `lineNumber:ruleName:message`
 *
 * Configured via `--format='{{.LineNumber}}:{{.Rule}}:{{.Violation}}'`.
 */
const CHECKMAKE_LINE: RegExp = /^(\d+):([^:]+):(.+)$/;

/**
 * Transform checkmake text output into LintResult[].
 *
 * checkmake with `--format='{{.LineNumber}}:{{.Rule}}:{{.Violation}}'` outputs lines like:
 * `3:minphony:Missing required phony target "all"`
 *
 * @param {string} output - Raw text output from checkmake
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformCheckmakeOutput('3:minphony:Missing required phony target "all"');
 * // results[0].ruleId === 'makefile/minphony'
 * ```
 */
export function transformCheckmakeOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = CHECKMAKE_LINE.exec(stripped);
    if (!match) {
      continue;
    }

    const lineNum: number = Number.parseInt(match[1] ?? '1', 10);
    const ruleName: string = match[2] ?? 'unknown';
    const message: string = match[3] ?? '';

    results.push(createResult(`makefile/${ruleName}`, '', lineNum, 1, 'warning', message));
  }

  return results;
}

/** checkmake external tool definition for Makefile linting. */
export const checkmakeTool: ExternalTool = {
  args: ['--format={{.LineNumber}}:{{.Rule}}:{{.Violation}}'],
  command: 'checkmake',
  filePatterns: ['**/Makefile', '**/GNUmakefile', '**/*.mk'],
  isAvailable(): boolean {
    return isCommandAvailable('checkmake');
  },
  name: 'checkmake',
  outputFormat: 'text',
  transform: transformCheckmakeOutput,
};
