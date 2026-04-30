/**
 * External Tool: rstcheck
 *
 * Lints reStructuredText files (.rst) using rstcheck.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for rstcheck output lines.
 *
 * Matches lines like:
 * `docs/index.rst:15: (ERROR/3) Unknown directive type "codex".`
 * `README.rst:8: (WARNING/2) Title underline too short.`
 * `guide.rst:3: (INFO/1) Enumerated list start value not ordinal-1.`
 * `guide.rst:42: (SEVERE/4) Unexpected section title.`
 */
const RSTCHECK_LINE: RegExp = /^(.+):(\d+):\s*\((ERROR|WARNING|INFO|SEVERE)\/.+\)\s+(.+)$/;

/**
 * Transform rstcheck text output into LintResult[].
 *
 * rstcheck outputs diagnostics in the format:
 * `file:line: (LEVEL/N) message`
 *
 * Severity mapping:
 * - `ERROR`, `SEVERE` → error
 * - `WARNING` → warning
 * - `INFO` → info
 *
 * @param {string} output - Raw text output from rstcheck
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformRstcheckOutput('docs/index.rst:15: (ERROR/3) Unknown directive type "codex".');
 * // results[0].ruleId === 'rstcheck/error'
 * // results[0].severity === 'error'
 * ```
 */
export function transformRstcheckOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = RSTCHECK_LINE.exec(stripped);

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const level: string = match[3] ?? 'WARNING';
    const message: string = match[4] ?? '';

    const levelLower: string = level.toLowerCase();

    let severity: 'error' | 'warning' | 'info' = 'warning';

    if (level === 'ERROR' || level === 'SEVERE') {
      severity = 'error';
    } else if (level === 'INFO') {
      severity = 'info';
    }

    results.push(createResult(`rstcheck/${levelLower}`, file, lineNum, 1, severity, message));
  }

  return results;
}

/** rstcheck external tool definition. */
export const rstcheckTool: ExternalTool = {
  args: [],
  command: 'rstcheck',
  filePatterns: ['**/*.rst'],
  isAvailable(): boolean {
    return isCommandAvailable('rstcheck');
  },
  name: 'rstcheck',
  outputFormat: 'text',
  transform: transformRstcheckOutput,
};
