/**
 * External Tool: Astro Check
 *
 * Validates Astro component files (.astro) using `astro check`.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for astro check output lines.
 *
 * Matches lines like:
 * `src/components/Header.astro:12:5 - error: Type 'string' is not assignable to type 'number'.`
 * `src/pages/index.astro:3:1 - warning: Unused import 'foo'.`
 * `src/layouts/Base.astro:7:10 - hint: Prefer const over let.`
 */
const ASTRO_LINE: RegExp = /^(.+):(\d+):(\d+)\s+-\s+(error|warning|hint):\s+(.+)$/;

/**
 * Transform `astro check` text output into LintResult[].
 *
 * `astro check` outputs diagnostics in the format:
 * `file:line:col - severity: message`
 *
 * @param {string} output - Raw text output from `astro check`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformAstroOutput('src/pages/index.astro:3:1 - error: Cannot find module "./missing".');
 * // results[0].ruleId === 'astro/check'
 * // results[0].severity === 'error'
 * ```
 */
export function transformAstroOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = ASTRO_LINE.exec(stripped);

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const level: string = match[4] ?? 'warning';
    const message: string = match[5] ?? '';

    let severity: 'error' | 'warning' | 'info' = 'warning';

    if (level === 'error') {
      severity = 'error';
    } else if (level === 'hint') {
      severity = 'info';
    }

    results.push(createResult('astro/check', file, lineNum, column, severity, message));
  }

  return results;
}

/** Astro Check external tool definition. */
export const astroTool: ExternalTool = {
  args: ['check'],
  command: 'astro',
  filePatterns: ['**/*.astro'],
  isAvailable(): boolean {
    return isCommandAvailable('astro');
  },
  name: 'astro',
  outputFormat: 'text',
  transform: transformAstroOutput,
};
