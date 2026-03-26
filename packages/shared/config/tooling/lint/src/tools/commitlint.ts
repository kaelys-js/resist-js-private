/**
 * External Tool: commitlint
 *
 * Lints commit messages using commitlint.
 * Parses text output into LintResult[].
 * This is a workspace-level tool (not per-file).
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform commitlint text output into LintResult[].
 *
 * commitlint outputs lines in the format:
 * ```
 * ✖   message [rule-name]
 * ⚠   message [rule-name]
 * ```
 *
 * @param {string} output - Raw text output from commitlint
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformCommitlintOutput('✖   subject may not be empty [subject-empty]');
 * // results[0].ruleId === 'commitlint/subject-empty'
 * ```
 */
export function transformCommitlintOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /*
   * Match lines like:
   *   ✖   subject may not be empty [subject-empty]
   *   ⚠   header must not be longer than 72 characters [header-max-length]
   */
  const pattern: RegExp = /^\s*[✖⚠]\s+(.+?)\s+\[(.+?)\]\s*$/;

  for (const line of lines) {
    const match: RegExpMatchArray | null = line.match(pattern);
    if (!match) {
      continue;
    }

    const message: string = match[1] ?? '';
    const ruleName: string = match[2] ?? 'unknown';
    const isError: boolean = line.includes('✖');

    results.push(
      createResult(
        `commitlint/${ruleName}`,
        '.git/COMMIT_EDITMSG',
        1,
        1,
        isError ? 'error' : 'warning',
        message,
      ),
    );
  }

  return results;
}

/** commitlint external tool definition. */
export const commitlintTool: ExternalTool = {
  args: ['--from', 'HEAD~1'],
  command: 'commitlint',
  filePatterns: [],
  isAvailable(): boolean {
    return isCommandAvailable('commitlint');
  },
  name: 'commitlint',
  outputFormat: 'text',
  transform: transformCommitlintOutput,
};
