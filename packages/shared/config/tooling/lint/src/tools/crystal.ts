/**
 * External Tool: Crystal Format Checker
 *
 * Checks Crystal source files (.cr) for formatting issues using
 * `crystal tool format --check`. Parses text output for lines mentioning
 * formatting issues or file paths into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';

/**
 * Regex for Crystal format --check output lines.
 *
 * Matches lines like:
 * `formatting 'src/main.cr'`
 * `formatting 'lib/utils.cr'`
 *
 * When `--check` is used, Crystal outputs the names of files that
 * would be reformatted, prefixed with "formatting".
 */
const CRYSTAL_FORMAT_LINE: RegExp = /^formatting\s+'(.+?)'$/;

/**
 * Regex to match a bare file path line ending in .cr.
 *
 * Some versions of Crystal format output just the file path:
 * `src/main.cr`
 */
const CRYSTAL_FILE_LINE: RegExp = /^(.+\.cr)$/;

/**
 * Transform Crystal format checker text output into LintResult[].
 *
 * `crystal tool format --check` outputs lines indicating files that need
 * reformatting. Two output formats are handled:
 *
 * 1. `formatting 'filename'` — the standard format
 * 2. Bare file paths ending in `.cr` — alternative format
 *
 * Any line mentioning "formatting" or containing a `.cr` file path
 * produces a lint result.
 *
 * @param {string} output - Raw text output from crystal tool format --check
 * @param {LintStrings} strings - Locale strings
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformCrystalOutput("formatting 'src/main.cr'");
 * // results[0].ruleId === 'crystal/format'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformCrystalOutput(output: string, strings: LintStrings): LintResult[] {
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

    /* Try the standard "formatting 'file'" pattern */
    const formatMatch: RegExpMatchArray | null = CRYSTAL_FORMAT_LINE.exec(stripped);

    if (formatMatch) {
      const file: string = formatMatch[1] ?? '';
      const crystalTip: string = format(strings.tools.formatRunTool, {
        tool: 'crystal tool format',
      });
      results.push(
        createResult(
          'crystal/format',
          file,
          1,
          1,
          'warning',
          strings.tools.formatFileNotFormatted,
          {
            tip: crystalTip,
          },
        ),
      );
      continue;
    }

    /* Try bare file path pattern */
    const fileMatch: RegExpMatchArray | null = CRYSTAL_FILE_LINE.exec(stripped);

    if (fileMatch) {
      const file: string = fileMatch[1] ?? '';
      results.push(
        createResult(
          'crystal/format',
          file,
          1,
          1,
          'warning',
          strings.tools.formatFileNotFormatted,
          {
            tip: format(strings.tools.formatRunTool, { tool: 'crystal tool format' }),
          },
        ),
      );
      continue;
    }

    /* Catch-all: any line mentioning "formatting" */
    if (stripped.toLowerCase().includes('formatting')) {
      results.push(
        createResult(
          'crystal/format',
          stripped,
          1,
          1,
          'warning',
          strings.tools.formatIssueDetected,
          {
            tip: format(strings.tools.formatRunTool, { tool: 'crystal tool format' }),
          },
        ),
      );
    }
  }

  return results;
}

/** Crystal format checker external tool definition. */
export const crystalTool: ExternalTool = {
  args: ['tool', 'format', '--check'],
  command: 'crystal',
  filePatterns: ['**/*.cr'],
  isAvailable(): boolean {
    return isCommandAvailable('crystal');
  },
  name: 'crystal',
  outputFormat: 'text',
  transform: transformCrystalOutput,
};
