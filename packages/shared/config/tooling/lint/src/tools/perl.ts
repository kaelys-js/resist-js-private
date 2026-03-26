/**
 * External Tool: Perl
 *
 * Validates Perl files (.pl, .pm) using `perl -c` for syntax checking.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for Perl syntax error output.
 *
 * Matches lines like:
 * `message at filename line N`
 *
 * Lines containing "syntax OK" are skipped.
 */
const PERL_ERROR: RegExp = /^(.+?)\s+at\s+(.+?)\s+line\s+(\d+)/;

/**
 * Transform Perl syntax check output into LintResult[].
 *
 * `perl -c` outputs syntax errors on stderr with lines like:
 * `syntax error at script.pl line 42`
 * `Can't locate Module.pm in @INC at script.pl line 3`
 *
 * Lines containing "syntax OK" indicate successful parsing and are ignored.
 *
 * @param {string} output - Raw stderr output from `perl -c`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformPerlOutput("syntax error at script.pl line 42");
 * // results[0].ruleId === 'perl/syntax'
 * // results[0].line === 42
 * ```
 */
export function transformPerlOutput(output: string): LintResult[] {
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

    /* Skip success messages */
    if (stripped.includes('syntax OK')) {
      continue;
    }

    const match: RegExpMatchArray | null = PERL_ERROR.exec(stripped);
    if (!match) {
      continue;
    }

    const message: string = match[1] ?? '';
    const file: string = match[2] ?? '';
    const lineNum: number = Number.parseInt(match[3] ?? '1', 10);

    results.push(createResult('perl/syntax', file, lineNum, 1, 'error', message));
  }

  return results;
}

/** Perl external tool definition. */
export const perlTool: ExternalTool = {
  args: ['-c'],
  command: 'perl',
  filePatterns: ['**/*.pl', '**/*.pm'],
  isAvailable(): boolean {
    return isCommandAvailable('perl');
  },
  name: 'perl',
  outputFormat: 'text',
  transform: transformPerlOutput,
};
