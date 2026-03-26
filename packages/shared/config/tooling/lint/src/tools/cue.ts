/**
 * External Tool: CUE
 *
 * Validates CUE configuration files (.cue) using `cue vet`.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for cue vet error output.
 *
 * Matches lines like:
 * `schema.cue:12:5: conflicting values string and int`
 * `config.cue:3:1: reference "foo" not found`
 */
const CUE_LINE: RegExp = /^(.+?):(\d+):(\d+):\s*(.+)$/;

/**
 * Transform cue vet text output into LintResult[].
 *
 * `cue vet` outputs validation errors with lines like:
 * `filename:line:column: message`
 *
 * Lines that don't match the expected pattern (blank lines,
 * context output) are silently skipped.
 *
 * @param {string} output - Raw text output from cue vet
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformCueOutput('schema.cue:12:5: conflicting values string and int');
 * // results[0].ruleId === 'cue/vet'
 * // results[0].line === 12
 * ```
 */
export function transformCueOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = CUE_LINE.exec(stripped);
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const message: string = match[4] ?? '';

    results.push(createResult('cue/vet', file, lineNum, column, 'error', message));
  }

  return results;
}

/** CUE external tool definition. */
export const cueTool: ExternalTool = {
  args: ['vet'],
  command: 'cue',
  filePatterns: ['**/*.cue'],
  isAvailable(): boolean {
    return isCommandAvailable('cue');
  },
  name: 'cue',
  outputFormat: 'text',
  transform: transformCueOutput,
};
