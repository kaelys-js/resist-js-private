/**
 * External Tool: Thrift
 *
 * Validates Apache Thrift IDL files (.thrift) using the `thrift` compiler
 * in code-generation mode as a syntax check.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for thrift compiler error output.
 *
 * Matches lines like:
 * `[ERROR:service.thrift:12] (last token was '}') Missing type`
 * `[ERROR:types.thrift:5] Syntax error`
 */
const THRIFT_LINE: RegExp = /^\[ERROR:(.+?):(\d+)\]\s*(?:\(.*?\)\s*)?(.+)$/;

/**
 * Transform thrift compiler text output into LintResult[].
 *
 * The `thrift --gen js` command outputs syntax errors with lines like:
 * `[ERROR:filename:line] (last token was 'x') message`
 *
 * Lines that don't match the expected pattern (informational output,
 * blank lines) are silently skipped.
 *
 * @param {string} output - Raw text output from the thrift compiler
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformThriftOutput('[ERROR:service.thrift:12] Missing type');
 * // results[0].ruleId === 'thrift/syntax'
 * // results[0].line === 12
 * ```
 */
export function transformThriftOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const match: RegExpMatchArray | null = THRIFT_LINE.exec(line.trim());
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const message: string = match[3] ?? '';

    results.push(createResult('thrift/syntax', file, lineNum, 1, 'error', message));
  }

  return results;
}

/** Thrift external tool definition. */
export const thriftTool: ExternalTool = {
  args: ['--gen', 'js'],
  command: 'thrift',
  filePatterns: ['**/*.thrift'],
  isAvailable(): boolean {
    return isCommandAvailable('thrift');
  },
  name: 'thrift',
  outputFormat: 'text',
  transform: transformThriftOutput,
};
