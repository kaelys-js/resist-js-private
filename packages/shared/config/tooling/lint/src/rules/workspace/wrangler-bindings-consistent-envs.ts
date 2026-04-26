/**
 * Rule: workspace/wrangler-bindings-consistent-envs
 *
 * Verifies that Cloudflare bindings are consistent across environments
 * within each wrangler.json file.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Binding source types. */
const BINDING_SOURCES: readonly string[] = ['kv_namespaces', 'r2_buckets', 'd1_databases'];

/**
 * Extract binding names from a config level.
 *
 * @param config - Config object (top-level or env-level)
 * @returns Set of binding names
 */
function extractBindingNames(config: Record<string, unknown>): Set<string> {
  const names: Set<string> = new Set<string>();

  for (const source of BINDING_SOURCES) {
    const items: unknown = config[source];
    if (!Array.isArray(items)) {
      continue;
    }
    for (const item of items) {
      if (typeof item === 'object' && item !== null) {
        const obj: Record<string, unknown> = item as Record<string, unknown>;
        if (typeof obj.binding === 'string') {
          names.add(obj.binding);
        }
      }
    }
  }

  /* durable_objects.bindings */
  const durableObjects: unknown = config.durable_objects;
  if (typeof durableObjects === 'object' && durableObjects !== null) {
    const doObj: Record<string, unknown> = durableObjects as Record<string, unknown>;
    if (Array.isArray(doObj.bindings)) {
      for (const item of doObj.bindings) {
        if (typeof item === 'object' && item !== null) {
          const obj: Record<string, unknown> = item as Record<string, unknown>;
          if (typeof obj.name === 'string') {
            names.add(obj.name);
          }
        }
      }
    }
  }

  return names;
}

/** Checks binding consistency across wrangler environments. */
const rule: WorkspaceRule = {
  id: 'workspace/wrangler-bindings-consistent-envs',
  description: 'Wrangler bindings must be consistent across all environments.',
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

      const { env } = parsed;
      if (typeof env !== 'object' || env === null) {
        continue;
      }

      const topLevelBindings: Set<string> = extractBindingNames(parsed);
      if (topLevelBindings.size === 0) {
        continue;
      }

      const envObj: Record<string, unknown> = env as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      for (const [envName, envConfig] of Object.entries(envObj)) {
        if (typeof envConfig !== 'object' || envConfig === null) {
          continue;
        }

        const envBindings: Set<string> = extractBindingNames(envConfig as Record<string, unknown>);

        /* Check for bindings in top-level missing from this env. */
        for (const binding of topLevelBindings) {
          if (envBindings.size > 0 && !envBindings.has(binding)) {
            results.push(
              createResult(
                'workspace/wrangler-bindings-consistent-envs',
                filePath,
                1,
                1,
                'error',
                `Binding '${binding}' exists at top level but missing from env '${envName}' in ${relativePath}`,
                {
                  tip: `Add binding '${binding}' to env.${envName} or remove env-level binding overrides`,
                },
              ),
            );
          }
        }
      }
    }

    return results;
  },
};

export default rule;
