/**
 * External Tool: Fantomas
 *
 * Checks F# source files (.fs) for formatting issues using Fantomas.
 * Runs in `--check` mode to report files that are not properly formatted.
 * Parses text output format into LintResult[].
 *
 * Lines like `filename was not formatted` or `Error: ...` produce results.
 * If the output contains "was unchanged" for all files, no results are produced.
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for Fantomas "not formatted" output: `filename was not formatted`
 *
 * Captures the file path before " was not formatted".
 */
const FANTOMAS_NOT_FORMATTED: RegExp = /^(.+?)\s+was not formatted$/;

/**
 * Regex for Fantomas error output: `Error: message`
 *
 * Captures the error message after "Error: ".
 */
const FANTOMAS_ERROR: RegExp = /^Error:\s*(.+)$/;

/**
 * Transform Fantomas `--check` output into LintResult[].
 *
 * Fantomas with `--check` outputs status lines for each file:
 * - `src/Module.fs was unchanged` — file is already formatted (no result)
 * - `src/Module.fs was not formatted` — file needs formatting (produces result)
 * - `Error: some parsing error` — error encountered (produces result)
 *
 * @param {string} output - Raw text output from fantomas --check
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformFantomasOutput('src/Module.fs was not formatted');
 * // results[0].ruleId === 'fantomas/format'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformFantomasOutput(output: string): LintResult[] {
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

    /* Skip lines that indicate the file was unchanged */
    if (stripped.includes('was unchanged')) {
      continue;
    }

    /* Match "filename was not formatted" */
    const notFormattedMatch: RegExpMatchArray | null = FANTOMAS_NOT_FORMATTED.exec(stripped);
    if (notFormattedMatch) {
      const file: string = notFormattedMatch[1] ?? '';

      results.push(
        createResult('fantomas/format', file, 1, 1, 'warning', 'File is not properly formatted', {
          tip: 'Run `fantomas` to auto-format this file',
        }),
      );
      continue;
    }

    /* Match "Error: message" */
    const errorMatch: RegExpMatchArray | null = FANTOMAS_ERROR.exec(stripped);
    if (errorMatch) {
      const message: string = errorMatch[1] ?? '';

      results.push(
        createResult('fantomas/format', 'unknown', 1, 1, 'error', message, {
          tip: 'Run `fantomas` to auto-format this file',
        }),
      );
    }
  }

  return results;
}

/** Fantomas external tool definition. */
export const fantomasTool: ExternalTool = {
  args: ['--check'],
  command: 'fantomas',
  filePatterns: ['**/*.fs'],
  isAvailable(): boolean {
    return isCommandAvailable('fantomas');
  },
  name: 'fantomas',
  outputFormat: 'text',
  transform: transformFantomasOutput,
};
