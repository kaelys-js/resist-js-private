/**
 * External Tool: attw (Are The Types Wrong?)
 *
 * Checks TypeScript package types compatibility using attw.
 * Outputs JSON format, which is transformed into LintResult[].
 * This is a workspace-level tool (not per-file).
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { en } from '@/lint/locale/locales/en.ts';

/**
 * A single problem entry from attw JSON output.
 *
 * @example
 * ```typescript
 * const problem: AttwProblem = {
 *   kind: 'FalseESM',
 *   title: 'Types are ESM but implementation is CJS',
 *   entrypoint: '.',
 * };
 * ```
 */
type AttwProblem = {
  /** Problem kind identifier (e.g., 'FalseESM', 'FalseCJS', 'MissingTypes'). */
  kind: string;
  /** Human-readable description of the problem. */
  title: string;
  /** Package entrypoint affected (e.g., '.', './utils'). */
  entrypoint?: string;
};

/**
 * Transform attw JSON output into LintResult[].
 *
 * attw JSON output structure:
 * `{ problems: [{ kind, title, entrypoint }] }`
 *
 * @param {string} output - Raw JSON output from attw
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const json = '{"problems":[{"kind":"FalseESM","title":"Types say ESM but CJS","entrypoint":"."}]}';
 * const results = transformAttwOutput(json);
 * // results[0].ruleId === 'attw/FalseESM'
 * ```
 */
export function transformAttwOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return [];
  }

  const results: LintResult[] = [];
  const problems: unknown[] = (parsed.problems as unknown[]) ?? [];

  for (const prob of problems) {
    const entry: AttwProblem = prob as AttwProblem;
    const kind: string = entry.kind ?? 'unknown';
    const title: string = entry.title ?? 'Type compatibility issue';
    const entrypoint: string = entry.entrypoint ?? '.';

    results.push(
      createResult(
        `attw/${kind}`,
        'package.json',
        1,
        1,
        'error',
        `${title} (entrypoint: ${entrypoint})`,
        {
          tip: en.tools.attwTip,
        },
      ),
    );
  }

  return results;
}

/** attw external tool definition. */
export const attwTool: ExternalTool = {
  args: ['--pack', '--format', 'json'],
  command: 'attw',
  filePatterns: [],
  isAvailable(): boolean {
    return isCommandAvailable('attw');
  },
  name: 'attw',
  outputFormat: 'json',
  transform: transformAttwOutput,
};
