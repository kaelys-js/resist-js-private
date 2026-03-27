/**
 * External Tool: Julia Formatter
 *
 * Checks Julia source files (.jl) for formatting using JuliaFormatter.
 * The command runs `julia -e 'using JuliaFormatter; format_file(ARGS[1], overwrite=false)'`
 * which outputs "true" if the file is already formatted, or "false" if it needs formatting.
 * Produces a LintResult when the output contains "false".
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { en } from '@/lint/locale/locales/en.ts';

/**
 * Transform Julia formatter output into LintResult[].
 *
 * JuliaFormatter's `format_file` with `overwrite=false` returns `true` if the
 * file is already properly formatted, or `false` if it would be reformatted.
 *
 * When the output contains "false", a lint result is created indicating the
 * file needs formatting.
 *
 * @param {string} output - Raw text output from julia format_file
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformJuliaOutput('false');
 * // results[0].ruleId === 'julia/format'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformJuliaOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  /*
   * JuliaFormatter outputs "true" or "false" per file.
   * If any line contains "false", the corresponding file needs formatting.
   * Since the tool runs per-file, any "false" in the output means the
   * processed file is not formatted.
   */
  const lines: string[] = trimmed.split('\n');

  for (const line of lines) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    if (stripped.toLowerCase() === 'false') {
      results.push(
        createResult('julia/format', 'unknown', 1, 1, 'warning', en.tools.juliaNotFormatted, {
          tip: en.tools.juliaTip,
        }),
      );
    }
  }

  return results;
}

/** Julia formatter external tool definition. */
export const juliaTool: ExternalTool = {
  args: ['-e', 'using JuliaFormatter; format_file(ARGS[1], overwrite=false)'],
  command: 'julia',
  filePatterns: ['**/*.jl'],
  isAvailable(): boolean {
    return isCommandAvailable('julia');
  },
  name: 'julia',
  outputFormat: 'text',
  transform: transformJuliaOutput,
};
