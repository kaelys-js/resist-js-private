/**
 * External Tool: zsh
 *
 * Validates Zsh scripts (.zsh) using `zsh -n` for syntax checking.
 * Parses text output (stderr) format into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/** Regex for zsh syntax error output: `filename:line: error message` */
const ZSH_LINE: RegExp = /^(.+?):(\d+): (.+)$/;

/**
 * Transform zsh syntax check output into LintResult[].
 *
 * @param output - Raw stderr output from zsh -n (one diagnostic per line)
 * @returns Parsed lint results
 */
export function transformZshOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const match: RegExpMatchArray | null = ZSH_LINE.exec(line.trim());
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const message: string = match[3] ?? '';

    results.push(createResult('zsh/syntax', file, lineNum, 1, 'error', message));
  }

  return results;
}

/** zsh external tool definition. */
export const zshTool: ExternalTool = {
  args: ['-n'],
  command: 'zsh',
  filePatterns: ['**/*.zsh'],
  isAvailable(): boolean {
    return isCommandAvailable('zsh');
  },
  name: 'zsh',
  outputFormat: 'text',
  transform: transformZshOutput,
};
