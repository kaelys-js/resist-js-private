/**
 * Rule: workspace/validate-shell-scripts
 *
 * Validates .sh files for `set -euo pipefail` strict mode presence.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern for strict mode. */
const STRICT_MODE_RE: RegExp = /set\s+-euo\s+pipefail/;

/** Validates shell script strict mode. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-shell-scripts',
  description: 'Shell scripts must use set -euo pipefail strict mode.',
  scope: 'workspace',
  categories: ['workspace', 'scripts'],
  stages: ['lint', 'check'],
  fixable: false,
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

    for await (const filePath of ctx.allFiles()) {
      if (!filePath.endsWith('.sh')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (!STRICT_MODE_RE.test(content)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/validate-shell-scripts',
            filePath,
            1,
            1,
            'error',
            `Shell script ${relativePath} missing 'set -euo pipefail' strict mode`,
            {
              tip: 'Add set -euo pipefail near the top of the script',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
