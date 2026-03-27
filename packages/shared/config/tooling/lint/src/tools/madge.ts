/**
 * External Tool: madge
 *
 * Detects circular dependencies in JavaScript/TypeScript projects using madge.
 * Outputs JSON format, which is transformed into LintResult[].
 * This is a workspace-level tool (not per-file).
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';

/**
 * Transform madge JSON output into LintResult[].
 *
 * madge `--circular --json` output is an array of arrays, where each inner
 * array represents a circular dependency chain:
 * `[["a.ts", "b.ts", "a.ts"], ["c.ts", "d.ts", "e.ts", "c.ts"]]`
 *
 * @param {string} output - Raw JSON output from madge
 * @param {LintStrings} strings - Locale strings
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const json = '[["src/a.ts","src/b.ts","src/a.ts"]]';
 * const results = transformMadgeOutput(json);
 * // results[0].ruleId === 'madge/circular-dependency'
 * // results[0].message === 'Circular dependency: src/a.ts → src/b.ts → src/a.ts'
 * ```
 */
export function transformMadgeOutput(output: string, strings: LintStrings): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const results: LintResult[] = [];
  const chains: unknown[][] = parsed as unknown[][];

  for (const chain of chains) {
    if (!Array.isArray(chain) || chain.length === 0) {
      continue;
    }

    const files: string[] = chain.map((entry: unknown): string =>
      typeof entry === 'string' ? entry : '',
    );
    const firstFile: string = files[0] ?? '';
    const chainStr: string = files.join(' \u2192 ');

    results.push(
      createResult(
        'madge/circular-dependency',
        firstFile,
        1,
        1,
        'error',
        format(strings.tools.madgeMessage, { chain: chainStr }),
        {
          tip: strings.tools.madgeTip,
        },
      ),
    );
  }

  return results;
}

/** madge external tool definition. */
export const madgeTool: ExternalTool = {
  args: ['--circular', '--json'],
  command: 'madge',
  filePatterns: [],
  isAvailable(): boolean {
    return isCommandAvailable('madge');
  },
  name: 'madge',
  outputFormat: 'json',
  transform: transformMadgeOutput,
};
