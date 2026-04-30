/**
 * External Tool: Luacheck
 *
 * Lints Lua files (.lua) using Luacheck.
 * Parses plain text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for Luacheck plain formatter output.
 *
 * Matches lines like:
 * `filename:line:column: (W611) message`
 * `filename:line:column: (E011) message`
 *
 * The code prefix letter determines severity: W=warning, E=error.
 */
const LUACHECK_LINE: RegExp = /^(.+?):(\d+):(\d+):\s*\(([WE]\d+)\)\s*(.+)$/;

/**
 * Transform Luacheck plain text output into LintResult[].
 *
 * Luacheck with `--formatter plain` outputs lines in the format:
 * `filename:line:column: (WDDD) message`
 *
 * The first letter of the code determines severity:
 * - `W` → 'warning'
 * - `E` → 'error'
 *
 * @param {string} output - Raw text output from Luacheck
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformLuacheckOutput("main.lua:5:10: (W611) line contains only whitespace");
 * // results[0].ruleId === 'luacheck/W611'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformLuacheckOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = LUACHECK_LINE.exec(stripped);

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const code: string = match[4] ?? 'W000';
    const message: string = match[5] ?? '';

    const severity: 'error' | 'warning' = code.startsWith('E') ? 'error' : 'warning';

    results.push(createResult(`luacheck/${code}`, file, lineNum, column, severity, message));
  }

  return results;
}

/** Luacheck external tool definition. */
export const luacheckTool: ExternalTool = {
  args: ['--formatter', 'plain'],
  command: 'luacheck',
  filePatterns: ['**/*.lua'],
  isAvailable(): boolean {
    return isCommandAvailable('luacheck');
  },
  name: 'luacheck',
  outputFormat: 'text',
  transform: transformLuacheckOutput,
};
