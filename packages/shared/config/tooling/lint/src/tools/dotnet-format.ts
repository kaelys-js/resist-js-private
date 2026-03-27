/**
 * External Tool: dotnet format
 *
 * Checks C# source files (.cs) for formatting issues using `dotnet format`.
 * Runs in `--verify-no-changes` mode to report files that are not properly formatted.
 * Parses text output format into LintResult[].
 *
 * If the output does NOT contain "Formatted 0" or mentions file changes,
 * a lint result is produced for each formatted file path detected.
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { en } from '@/lint/locale/locales/en.ts';
import { format } from '@/lint/locale/schema.ts';

/**
 * Regex to capture file paths from dotnet format output.
 *
 * Matches lines that reference a `.cs` file path, such as:
 * `  Formatted code file '/src/Program.cs'.`
 * `  /src/Program.cs - was formatted.`
 *
 * Captures the file path ending in `.cs`.
 */
const DOTNET_FORMAT_FILE: RegExp = /(\S+\.cs)/;

/**
 * Transform `dotnet format --verify-no-changes` output into LintResult[].
 *
 * `dotnet format` in verify mode exits non-zero when files need formatting.
 * Lines mentioning `.cs` file paths are captured as formatting issues.
 * If the output contains "Formatted 0" (indicating no changes needed),
 * an empty result set is returned.
 *
 * @param {string} output - Raw text output from dotnet format
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformDotnetFormatOutput("  Formatted code file 'src/Program.cs'.");
 * // results[0].ruleId === 'dotnet-format/style'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformDotnetFormatOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  /* If output indicates no formatting changes needed, return clean */
  if (trimmed.includes('Formatted 0')) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  for (const line of lines) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = DOTNET_FORMAT_FILE.exec(stripped);
    if (match) {
      const file: string = match[1] ?? '';

      results.push(
        createResult('dotnet-format/style', file, 1, 1, 'warning', en.tools.formatRequiresChanges, {
          tip: format(en.tools.formatRunTool, { tool: 'dotnet format' }),
        }),
      );
    }
  }

  return results;
}

/** dotnet format external tool definition. */
export const dotnetFormatTool: ExternalTool = {
  args: ['format', '--verify-no-changes'],
  command: 'dotnet',
  filePatterns: ['**/*.cs'],
  isAvailable(): boolean {
    return isCommandAvailable('dotnet');
  },
  name: 'dotnet-format',
  outputFormat: 'text',
  transform: transformDotnetFormatOutput,
};
