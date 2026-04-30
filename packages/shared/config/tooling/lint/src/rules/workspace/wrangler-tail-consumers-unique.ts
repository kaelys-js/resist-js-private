/**
 * Rule: workspace/wrangler-tail-consumers-unique
 *
 * Wrangler tail consumer service names must be globally unique.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Ensures tail_consumers service names are globally unique across wrangler configs. */
const rule: WorkspaceRule = {
  id: 'workspace/wrangler-tail-consumers-unique',
  description: 'Wrangler tail consumer service names must be globally unique.',
  scope: 'workspace',
  categories: ['workspace', 'wrangler'],
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

    /** Track service name → first occurrence info. */
    const seen: Map<string, { file: string; env: string }> = new Map();

    /** Duplicates to report after collecting all files. */
    const duplicates: Array<{
      service: string;
      file: string;
      env: string;
      firstFile: string;
      firstEnv: string;
    }> = [];

    /** Collect wrangler config files first. */
    const wranglerFiles: string[] = [];

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);

      if (name === 'wrangler.json' || name === 'wrangler.jsonc') {
        wranglerFiles.push(filePath);
      }
    }

    for (const filePath of wranglerFiles) {
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

      const relativePath: string = relative(ctx.rootDir, filePath);

      /**
       * Process tail_consumers from a given level.
       *
       * @param tailConsumers - Raw tail_consumers value (expected: array)
       * @param envName - Environment label for diagnostic messages
       */
      const processTailConsumers = (tailConsumers: unknown, envName: string): void => {
        if (!Array.isArray(tailConsumers)) {
          return;
        }
        for (const consumer of tailConsumers) {
          if (typeof consumer !== 'object' || consumer === null) {
            continue;
          }

          const { service } = consumer as Record<string, unknown>;

          if (typeof service !== 'string') {
            continue;
          }

          const existing: { file: string; env: string } | undefined = seen.get(service);

          if (existing) {
            duplicates.push({
              service,
              file: relativePath,
              env: envName,
              firstFile: existing.file,
              firstEnv: existing.env,
            });
          } else {
            seen.set(service, { file: relativePath, env: envName });
          }
        }
      };

      /* Top-level tail_consumers. */
      processTailConsumers(parsed['tail_consumers'], 'top-level');

      /* Per-env tail_consumers. */
      const env: Record<string, unknown> | undefined = parsed['env'] as
        | Record<string, unknown>
        | undefined;

      if (env && typeof env === 'object') {
        for (const [envName, envConfig] of Object.entries(env)) {
          if (typeof envConfig === 'object' && envConfig !== null) {
            processTailConsumers(
              (envConfig as Record<string, unknown>)['tail_consumers'],
              `env.${envName}`,
            );
          }
        }
      }
    }

    for (const dup of duplicates) {
      results.push(
        createResult(
          'workspace/wrangler-tail-consumers-unique',
          dup.file,
          1,
          1,
          'error',
          `Duplicate tail_consumers service '${dup.service}' in ${dup.file} (${dup.env}) — first seen in ${dup.firstFile} (${dup.firstEnv})`,
          {
            tip: 'Each tail_consumers service name must be globally unique across all wrangler configs.',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
