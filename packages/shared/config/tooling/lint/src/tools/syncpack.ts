/**
 * External Tool: syncpack
 *
 * Detects version mismatches across packages in a monorepo using syncpack.
 * Parses text output into LintResult[].
 * This is a workspace-level tool (not per-file).
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';

/**
 * Transform syncpack list-mismatches text output into LintResult[].
 *
 * syncpack `list-mismatches` outputs lines like:
 * ```
 * ✘ package-name has mismatched versions
 *   1.0.0 in /packages/a/package.json
 *   2.0.0 in /packages/b/package.json
 * ```
 *
 * @param {string} output - Raw text output from syncpack list-mismatches
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformSyncpackOutput('✘ lodash has mismatched versions\n  4.17.20 in a\n  4.17.21 in b\n');
 * // results[0].ruleId === 'syncpack/version-mismatch'
 * ```
  * @param {Type} strings - Description
 */
export function transformSyncpackOutput(output: string, strings: LintStrings): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /*
   * Match mismatch lines:
   *   ✘ package-name has mismatched versions
   *   ✘ package-name ...mismatched...
   *
   * Also match lines with the cross mark followed by package details.
   */
  const mismatchPattern: RegExp =
    /^\s*[✘✗×]\s+(.+?)(?:\s+has\s+mismatched\s+versions|\s+.+mismatch.+)\s*$/i;

  /* Simpler fallback: just look for the cross-mark + any text */
  const crossMarkPattern: RegExp = /^\s*[✘✗×]\s+(.+?)\s*$/;

  for (const line of lines) {
    const lineStr: string = line.trim();
    if (lineStr.length === 0) {
      continue;
    }

    /* Try the specific mismatch pattern first */
    let match: RegExpMatchArray | null = lineStr.match(mismatchPattern);
    if (match) {
      const pkgName: string = match[1] ?? 'unknown';

      results.push(
        createResult(
          'syncpack/version-mismatch',
          'package.json',
          1,
          1,
          'warning',
          format(strings.tools.syncpackMessage, { package: pkgName }),
          {
            tip: strings.tools.syncpackTip,
          },
        ),
      );
      continue;
    }

    /* Fallback: any line with a cross mark indicates a mismatch */
    match = lineStr.match(crossMarkPattern);
    if (match) {
      const detail: string = match[1] ?? 'unknown';

      results.push(
        createResult(
          'syncpack/version-mismatch',
          'package.json',
          1,
          1,
          'warning',
          format(strings.tools.syncpackMismatch, { detail }),
          {
            tip: strings.tools.syncpackTip,
          },
        ),
      );
    }
  }

  return results;
}

/** syncpack external tool definition. */
export const syncpackTool: ExternalTool = {
  args: ['list-mismatches'],
  command: 'syncpack',
  filePatterns: [],
  isAvailable(): boolean {
    return isCommandAvailable('syncpack');
  },
  name: 'syncpack',
  outputFormat: 'text',
  transform: transformSyncpackOutput,
};
