/**
 * Rule: workspace/no-lockfile-local-links
 *
 * Detects file: and link: protocol dependencies in pnpm-lock.yaml
 * which indicate local overrides that break CI installs.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Description. */
const rule: WorkspaceRule = {
  id: 'workspace/no-lockfile-local-links',
  description: 'pnpm-lock.yaml must not contain file: or link: protocol dependencies.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
  stages: ['lint', 'ci'],
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
    const lockfilePath: string = join(ctx.rootDir, 'pnpm-lock.yaml');

    const exists: boolean = await ctx.fileExists(lockfilePath);

    if (!exists) {
      return [];
    }

    const content: string = await ctx.readFile(lockfilePath);
    const lines: string[] = content.split('\n');
    const results: Array<ReturnType<typeof createResult>> = [];
    const localLinkPattern: RegExp = /\b(?:file|link):/;

    for (const [i, line] of lines.entries()) {
      if (localLinkPattern.test(line)) {
        results.push(
          createResult(
            'workspace/no-lockfile-local-links',
            lockfilePath,
            i + 1,
            1,
            'error',
            `Local dependency detected in lockfile: ${line.trim()}`,
            {
              tip: 'Replace file:/link: references with published packages or workspace: protocol',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
