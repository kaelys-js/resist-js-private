/**
 * Rule: workspace/validate-wrangler-environments
 *
 * Enforces that wrangler.json files only use `production` and `preview`
 * as named environments.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Allowed environment names. */
const ALLOWED_ENVS: ReadonlySet<string> = new Set<string>(['production', 'preview']);

/** Validates wrangler environment names. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-wrangler-environments',
  description: 'Wrangler environments must be limited to production and preview.',
  scope: 'workspace',
  categories: ['workspace', 'wrangler'],
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

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);
      if (name !== 'wrangler.json' && name !== 'wrangler.jsonc') {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content) as Record<string, unknown>;
      } catch {
        continue;
      }

      const env: unknown = parsed.env;
      if (typeof env !== 'object' || env === null) {
        continue;
      }

      const envObj: Record<string, unknown> = env as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      for (const envName of Object.keys(envObj)) {
        if (!ALLOWED_ENVS.has(envName)) {
          results.push(
            createResult(
              'workspace/validate-wrangler-environments',
              filePath,
              1,
              1,
              'error',
              `Invalid environment '${envName}' in ${relativePath} — only 'production' and 'preview' are allowed`,
              {
                tip:
                  envName === 'staging'
                    ? 'Use top-level config instead of env.staging'
                    : `Remove env.${envName} and use production or preview`,
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
