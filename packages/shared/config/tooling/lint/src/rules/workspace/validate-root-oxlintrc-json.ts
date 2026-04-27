/**
 * Rule: workspace/validate-root-oxlintrc-json
 *
 * Ensures the workspace root has an .oxlintrc.json that only contains $schema
 * and extends — no inline configuration.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Allowed top-level keys in root .oxlintrc.json. */
const ALLOWED_KEYS: ReadonlySet<string> = new Set<string>(['$schema', 'extends']);

/** Root .oxlintrc.json must exist and only contain $schema and extends. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-root-oxlintrc-json',
  description: 'Root .oxlintrc.json must exist and only contain $schema and extends.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
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
    let found: boolean = false;

    for (const filePath of await ctx.allFiles()) {
      const relativePath: string = relative(ctx.rootDir, filePath);

      if (relativePath !== '.oxlintrc.json') {
        continue;
      }

      found = true;
      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;

      /* Check extends field exists. */
      if (!('extends' in parsed)) {
        results.push(
          createResult(
            'workspace/validate-root-oxlintrc-json',
            filePath,
            1,
            1,
            'error',
            ".oxlintrc.json missing 'extends' field",
            {
              tip: 'Root .oxlintrc.json should only contain $schema and extends',
            },
          ),
        );
      }

      /* Check for unexpected top-level keys. */
      for (const key of Object.keys(parsed)) {
        if (!ALLOWED_KEYS.has(key)) {
          results.push(
            createResult(
              'workspace/validate-root-oxlintrc-json',
              filePath,
              1,
              1,
              'error',
              `.oxlintrc.json should not define config directly — found unexpected key: ${key}`,
              {
                tip: 'Root .oxlintrc.json should only contain $schema and extends',
              },
            ),
          );
        }
      }
    }

    if (!found) {
      results.push(
        createResult(
          'workspace/validate-root-oxlintrc-json',
          `${ctx.rootDir}/.oxlintrc.json`,
          1,
          1,
          'error',
          'Missing root .oxlintrc.json',
          {
            tip: 'Root .oxlintrc.json should only contain $schema and extends',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
