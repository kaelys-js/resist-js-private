/**
 * External Tool: fish
 *
 * Validates Fish shell scripts (.fish) using `fish --no-execute` for syntax checking.
 * Parses text output format into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/** Regex for fish syntax error output: `filename (line N): error message` */
const FISH_LINE: RegExp = /^(.+?) \(line (\d+)\): (.+)$/;

/**
 * Transform fish syntax check output into LintResult[].
 *
 * `fish --no-execute` outputs syntax errors with lines like:
 * `script.fish (line 5): Unexpected end of string`
 *
 * @param {string} output - Raw output from `fish --no-execute`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformFishOutput('script.fish (line 5): Unexpected end of string');
 * // results[0].ruleId === 'fish/syntax'
 * // results[0].line === 5
 * ```
 */
export function transformFishOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const match: RegExpMatchArray | null = FISH_LINE.exec(line.trim());
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const message: string = match[3] ?? '';

    results.push(createResult('fish/syntax', file, lineNum, 1, 'error', message));
  }

  return results;
}

/** fish external tool definition. */
export const fishTool: ExternalTool = {
  args: ['--no-execute'],
  command: 'fish',
  filePatterns: ['**/*.fish'],
  isAvailable(): boolean {
    return isCommandAvailable('fish');
  },
  name: 'fish',
  outputFormat: 'text',
  transform: transformFishOutput,
};
