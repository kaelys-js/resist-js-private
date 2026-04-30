/**
 * External Tool: Buildifier (Bazel)
 *
 * Lints Bazel/Starlark files (.bzl, .bazel, .star) using buildifier.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for buildifier warning output.
 *
 * Matches lines like:
 * `rules.bzl:15: warning: function-docstring: "my_rule" has no docstring`
 * `BUILD.bazel:3: warning: load: Loaded symbol "foo" is unused`
 */
const BUILDIFIER_LINE: RegExp = /^(.+?):(\d+):\s*warning:\s*(.+)$/;

/**
 * Transform buildifier lint output into LintResult[].
 *
 * `buildifier -lint=warn -mode=check` outputs warnings with lines like:
 * `filename:line: warning: message`
 *
 * Lines that don't match the expected pattern (headers, summaries,
 * blank lines) are silently skipped.
 *
 * @param {string} output - Raw text output from buildifier
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformBazelOutput('rules.bzl:15: warning: function-docstring: missing');
 * // results[0].ruleId === 'bazel/lint'
 * // results[0].line === 15
 * ```
 */
export function transformBazelOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = BUILDIFIER_LINE.exec(stripped);

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const message: string = match[3] ?? '';

    results.push(createResult('bazel/lint', file, lineNum, 1, 'warning', message));
  }

  return results;
}

/** Buildifier (Bazel) external tool definition. */
export const bazelTool: ExternalTool = {
  args: ['-lint=warn', '-mode=check'],
  command: 'buildifier',
  filePatterns: ['**/*.bzl', '**/*.bazel', '**/*.star'],
  isAvailable(): boolean {
    return isCommandAvailable('buildifier');
  },
  name: 'buildifier',
  outputFormat: 'text',
  transform: transformBazelOutput,
};
