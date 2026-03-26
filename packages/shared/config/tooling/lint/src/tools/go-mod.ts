/**
 * External Tool: go mod verify
 *
 * Verifies Go module dependencies using `go mod verify`.
 * Checks that downloaded module contents match their expected checksums.
 * Output is either "all modules verified" (clean) or error lines.
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform `go mod verify` output into LintResult[].
 *
 * `go mod verify` outputs either:
 * - "all modules verified" when everything is fine
 * - Error lines describing verification failures
 *
 * Any non-empty, non-"verified" line is treated as an error.
 *
 * @param {string} output - Raw text output from `go mod verify`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformGoModOutput('all modules verified');
 * // results.length === 0  (clean)
 *
 * const errors = transformGoModOutput('github.com/foo/bar v1.0.0: dir has been modified');
 * // errors[0].ruleId === 'go-mod/verify'
 * // errors[0].severity === 'error'
 * ```
 */
export function transformGoModOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  /* Clean output — all modules verified */
  if (trimmed.includes('all modules verified')) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    results.push(createResult('go-mod/verify', 'go.mod', 1, 1, 'error', stripped));
  }

  return results;
}

/** go-mod external tool definition. */
export const goModTool: ExternalTool = {
  args: ['mod', 'verify'],
  command: 'go',
  filePatterns: ['**/go.mod'],
  isAvailable(): boolean {
    return isCommandAvailable('go');
  },
  name: 'go-mod',
  outputFormat: 'text',
  transform: transformGoModOutput,
};
