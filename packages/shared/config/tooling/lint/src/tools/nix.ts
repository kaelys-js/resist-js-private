/**
 * External Tool: nix-instantiate
 *
 * Validates Nix expression files (.nix) using `nix-instantiate --parse`
 * for syntax checking.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for nix-instantiate error output.
 *
 * Matches lines like:
 * `error: syntax error, unexpected '}', at /path/to/file.nix:12:5`
 * `error: undefined variable 'foo' at config.nix:3:1`
 */
const NIX_LINE: RegExp = /^error:\s+(.+?),?\s+at\s+(.+?):(\d+):(\d+)$/;

/**
 * Transform nix-instantiate parse output into LintResult[].
 *
 * Lines that don't match the expected pattern (trace output,
 * blank lines) are silently skipped.
 *
 * @param {string} output - Raw text output from nix-instantiate (one diagnostic per line)
 * @returns {LintResult[]} Parsed lint results
 */
export function transformNixOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const match: RegExpMatchArray | null = NIX_LINE.exec(line.trim());
    if (!match) {
      continue;
    }

    const message: string = match[1] ?? '';
    const file: string = match[2] ?? '';
    const lineNum: number = Number.parseInt(match[3] ?? '1', 10);
    const column: number = Number.parseInt(match[4] ?? '1', 10);

    results.push(createResult('nix/syntax', file, lineNum, column, 'error', message));
  }

  return results;
}

/** nix-instantiate external tool definition. */
export const nixTool: ExternalTool = {
  args: ['--parse'],
  command: 'nix-instantiate',
  filePatterns: ['**/*.nix'],
  isAvailable(): boolean {
    return isCommandAvailable('nix-instantiate');
  },
  name: 'nix-instantiate',
  outputFormat: 'text',
  transform: transformNixOutput,
};
