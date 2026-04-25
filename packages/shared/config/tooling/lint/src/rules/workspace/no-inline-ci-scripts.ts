/**
 * Rule: workspace/no-inline-ci-scripts
 *
 * CI job scripts must reference external shell files, not inline commands.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex matching multi-line inline script blocks in CI YAML. */
const INLINE_SCRIPT_PATTERN: RegExp = /^\s*(?:run|script):\s*\|/;

/** Detects inline CI script blocks that should be extracted to .sh files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-inline-ci-scripts',
  description: 'CI job scripts must reference external shell files, not inline commands.',
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
      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i]!;
        if (INLINE_SCRIPT_PATTERN.test(line)) {
          results.push(
            createResult(
              'workspace/no-inline-ci-scripts',
              filePath,
              i + 1,
              1,
              'error',
              `Inline CI script block found — extract to external .sh file: ${relativePath}`,
              {
                tip: 'Move inline scripts to a file under ./scripts/ and reference it with `run: ./scripts/my-step.sh`',
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
