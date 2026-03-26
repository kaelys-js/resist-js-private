/**
 * External Tool: sort-package-json
 *
 * Checks if package.json files have their keys sorted consistently
 * using sort-package-json with --check flag.
 * Parses text output into LintResult[].
 * This is a workspace-level tool (not per-file).
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform sort-package-json text output into LintResult[].
 *
 * sort-package-json `--check` outputs lines like:
 * ```
 * package.json is not sorted
 * packages/foo/package.json is not sorted
 * ```
 *
 * If all files are sorted, output contains "already sorted" or is empty.
 *
 * @param {string} output - Raw text output from sort-package-json --check
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformSortPackageJsonOutput('package.json is not sorted\n');
 * // results[0].ruleId === 'sort-package-json/order'
 * ```
 */
export function transformSortPackageJsonOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  /* If the output says already sorted, nothing to report */
  if (trimmed.includes('already sorted')) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /*
   * Match lines indicating unsorted files:
   *   package.json is not sorted
   *   packages/foo/package.json is not sorted
   *
   * Also match lines that are just file paths (some versions output differently).
   */
  const notSortedPattern: RegExp = /^(.+?)\s+is not sorted\s*$/;

  for (const line of lines) {
    const lineStr: string = line.trim();
    if (lineStr.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = lineStr.match(notSortedPattern);
    if (match) {
      const file: string = match[1] ?? 'package.json';

      results.push(
        createResult('sort-package-json/order', file, 1, 1, 'warning', `${file} is not sorted`, {
          tip: 'Run sort-package-json to fix the key ordering',
        }),
      );
      continue;
    }

    /* Fallback: if the line contains "not sorted", report it generically */
    if (lineStr.includes('not sorted')) {
      results.push(
        createResult('sort-package-json/order', 'package.json', 1, 1, 'warning', lineStr, {
          tip: 'Run sort-package-json to fix the key ordering',
        }),
      );
    }
  }

  return results;
}

/** sort-package-json external tool definition. */
export const sortPackageJsonTool: ExternalTool = {
  args: ['--check'],
  command: 'sort-package-json',
  filePatterns: [],
  isAvailable(): boolean {
    return isCommandAvailable('sort-package-json');
  },
  name: 'sort-package-json',
  outputFormat: 'text',
  transform: transformSortPackageJsonOutput,
};
