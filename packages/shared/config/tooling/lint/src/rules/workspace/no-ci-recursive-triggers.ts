/**
 * Rule: workspace/no-ci-recursive-triggers
 *
 * CI scripts must not contain recursive trigger patterns that could
 * cause infinite CI loops.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex matching dangerous recursive trigger patterns in CI files. */
const RECURSIVE_TRIGGER_PATTERN: RegExp =
  /(git\s+(push|commit|rebase|merge)\b|CI_JOB_TOKEN|trigger:\s)/;

/** Flags CI configurations containing recursive trigger patterns. */
const rule: WorkspaceRule = {
  id: 'workspace/no-ci-recursive-triggers',
  description: 'CI scripts must not contain recursive trigger patterns.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx = context as WorkspaceContext;
    return ctx.allFiles();
  },

  async check(context: unknown): Promise<
    Array<{
      ruleId: string;
      file: string;
      line: number;
      column: number;
      severity: 'error' | 'warning' | 'info';
      message: string;
      fix: { range: { start: number; end: number }; text: string };
      tip?: string;
      example?: string;
      source?: string;
      url?: string;
      endLine?: number;
      endColumn?: number;
    }>
  > {
    const ctx: WorkspaceContext = context as WorkspaceContext;
    const results: Array<ReturnType<typeof createResult>> = [];

    for (const filePath of await ctx.allFiles()) {
      const relativePath: string = relative(ctx.rootDir, filePath);

      /** Only check CI YAML files under .github/ or .gitlab/ directories. */
      const isGitHub: boolean = relativePath.startsWith('.github/');
      const isGitLab: boolean = relativePath.startsWith('.gitlab/');
      if (!isGitHub && !isGitLab) {
        continue;
      }
      if (!filePath.endsWith('.yml') && !filePath.endsWith('.yaml')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const lines: string[] = content.split('\n');
      for (const [i, line] of lines.entries()) {
        const match: RegExpMatchArray | null = line.match(RECURSIVE_TRIGGER_PATTERN);
        if (match !== null) {
          results.push(
            createResult(
              'workspace/no-ci-recursive-triggers',
              filePath,
              i + 1,
              (match.index ?? 0) + 1,
              'error',
              `Recursive CI trigger pattern '${match[0]}' found in ${relativePath}`,
              {
                tip: 'Remove git push/commit/rebase/merge from CI scripts to prevent infinite trigger loops',
              },
            ),
          );
        }
      }
    }

    return results;
  },
};

export default rule;
