/**
 * External Tool: batch
 *
 * Placeholder validator for Windows batch/cmd scripts (.bat, .cmd).
 * This is a custom inline validator with no real external tool dependency.
 * The transform function parses a simple `filename:line: message` format.
 *
 * Currently a placeholder — `isAvailable` returns `false`.
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/** Regex for batch syntax output: `filename:line: message` */
const BATCH_LINE: RegExp = /^(.+?):(\d+): (.+)$/;

/**
 * Transform batch syntax check output into LintResult[].
 *
 * Parses a simple text format where each line is:
 * `script.bat:15: unexpected token`
 *
 * Returns empty results for empty or unparseable output.
 *
 * @param {string} output - Raw text output to parse
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformBatchOutput('deploy.bat:15: unexpected token after GOTO');
 * // results[0].ruleId === 'batch/syntax'
 * // results[0].line === 15
 * ```
 */
export function transformBatchOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const match: RegExpMatchArray | null = BATCH_LINE.exec(line.trim());

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const message: string = match[3] ?? '';

    results.push(createResult('batch/syntax', file, lineNum, 1, 'error', message));
  }

  return results;
}

/** Batch file external tool definition (placeholder). */
export const batchTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: ['**/*.bat', '**/*.cmd'],
  isAvailable(): boolean {
    return false;
  },
  name: 'batch',
  outputFormat: 'text',
  transform: transformBatchOutput,
};
