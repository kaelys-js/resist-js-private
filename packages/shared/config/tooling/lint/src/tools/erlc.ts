/**
 * External Tool: erlc
 *
 * Validates Erlang files (.erl, .hrl) using `erlc -W` for compilation checking.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for erlc warning output.
 *
 * Matches lines like:
 * `filename:line: Warning: message`
 */
const ERLC_WARNING: RegExp = /^(.+?):(\d+):\s*Warning:\s*(.+)$/;

/**
 * Regex for erlc error output.
 *
 * Matches lines like:
 * `filename:line: error: message`
 */
const ERLC_ERROR: RegExp = /^(.+?):(\d+):\s*error:\s*(.+)$/;

/**
 * Transform erlc compilation output into LintResult[].
 *
 * `erlc -W` outputs warnings and errors on stderr with lines like:
 * `module.erl:15: Warning: variable 'X' is unused`
 * `module.erl:10: error: syntax error before: ')'`
 *
 * @param {string} output - Raw stderr output from `erlc -W`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformErlcOutput("module.erl:15: Warning: variable 'X' is unused");
 * // results[0].ruleId === 'erlc/compile'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformErlcOutput(output: string): LintResult[] {
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

    /* Try warning pattern first */
    const warnMatch: RegExpMatchArray | null = ERLC_WARNING.exec(stripped);
    if (warnMatch) {
      const file: string = warnMatch[1] ?? '';
      const lineNum: number = Number.parseInt(warnMatch[2] ?? '1', 10);
      const message: string = warnMatch[3] ?? '';

      results.push(createResult('erlc/compile', file, lineNum, 1, 'warning', message));
      continue;
    }

    /* Try error pattern */
    const errMatch: RegExpMatchArray | null = ERLC_ERROR.exec(stripped);
    if (errMatch) {
      const file: string = errMatch[1] ?? '';
      const lineNum: number = Number.parseInt(errMatch[2] ?? '1', 10);
      const message: string = errMatch[3] ?? '';

      results.push(createResult('erlc/compile', file, lineNum, 1, 'error', message));
      continue;
    }
  }

  return results;
}

/** erlc external tool definition. */
export const erlcTool: ExternalTool = {
  args: ['-W'],
  command: 'erlc',
  filePatterns: ['**/*.erl', '**/*.hrl'],
  isAvailable(): boolean {
    return isCommandAvailable('erlc');
  },
  name: 'erlc',
  outputFormat: 'text',
  transform: transformErlcOutput,
};
