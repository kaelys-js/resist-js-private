/**
 * Rule: workspace/require-makefile-help-target
 *
 * Makefiles must define a help target for discoverability.
 * Ensures every Makefile contains a `help:` target so users can
 * discover available make commands.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex matching a help target definition in a Makefile. */
const HELP_TARGET_PATTERN: RegExp = /^help\s*:/m;

/** Makefiles must define a help target for discoverability. */
const rule: WorkspaceRule = {
  id: 'workspace/require-makefile-help-target',
  description: 'Makefiles must define a help target for discoverability.',
  scope: 'workspace',
  categories: ['workspace', 'build'],
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
      const name: string = basename(filePath);
      if (name !== 'Makefile') {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);

      if (HELP_TARGET_PATTERN.test(content) === false) {
        results.push(
          createResult(
            'workspace/require-makefile-help-target',
            filePath,
            1,
            1,
            'error',
            `Makefile missing 'help:' target in ${relativePath}`,
            {
              tip: 'Add a help: target that documents available make targets',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
