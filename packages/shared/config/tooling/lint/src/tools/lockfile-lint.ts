/**
 * External Tool: lockfile-lint
 *
 * Lints package manager lockfiles for security issues such as
 * insecure registries (HTTP), tampered hashes, and disallowed hosts.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import type { LintStrings } from '@/lint/locale/schema.ts';

/**
 * Transform lockfile-lint text output into LintResult[].
 *
 * lockfile-lint outputs diagnostic lines containing keywords like:
 * - `ERR!` — error-level issues (e.g. disallowed host, tampered hash)
 * - `detected:` — detected insecure patterns
 * - `http://` — insecure registry URLs
 *
 * Lines that do not contain any of these markers are skipped.
 *
 * @param {string} output - Raw text output from lockfile-lint
 * @param {LintStrings} strings - Locale strings
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformLockfileLintOutput('ERR! registry uses http:// instead of https://');
 * // results[0].ruleId === 'lockfile-lint/security'
 * // results[0].severity === 'error'
 * ```
 */
export function transformLockfileLintOutput(output: string, strings: LintStrings): LintResult[] {
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

    /* Only process lines that contain diagnostic markers */
    const isError: boolean = stripped.includes('ERR!');
    const isDetected: boolean = stripped.includes('detected:');
    const isInsecure: boolean = stripped.includes('http://');

    if (!isError && !isDetected && !isInsecure) {
      continue;
    }

    /*
     * Attempt to extract a filename from the line.
     * lockfile-lint may prefix lines with the lockfile path.
     * Common patterns: "package-lock.json: ERR! ..." or just "ERR! ..."
     */
    let file: string = 'package-lock.json';
    let message: string = stripped;

    const fileMatch: RegExpMatchArray | null = stripped.match(
      /^([\w./-]*(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml)):\s*(.+)$/,
    );

    if (fileMatch) {
      file = fileMatch[1] ?? file;
      message = fileMatch[2] ?? stripped;
    }

    const severity: 'error' | 'warning' = isError ? 'error' : 'warning';

    results.push(
      createResult('lockfile-lint/security', file, 1, 1, severity, message, {
        tip: strings.tools.lockfileLintTip,
      }),
    );
  }

  return results;
}

/** lockfile-lint external tool definition. */
export const lockfileLintTool: ExternalTool = {
  args: [],
  command: 'lockfile-lint',
  filePatterns: ['**/package-lock.json', '**/yarn.lock', '**/pnpm-lock.yaml'],
  isAvailable(): boolean {
    return isCommandAvailable('lockfile-lint');
  },
  name: 'lockfile-lint',
  outputFormat: 'text',
  transform: transformLockfileLintOutput,
};
