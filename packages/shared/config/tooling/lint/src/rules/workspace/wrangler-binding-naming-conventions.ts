/**
 * Rule: workspace/wrangler-binding-naming-conventions
 *
 * Validates that all Cloudflare binding names match the naming convention
 * `^[a-zA-Z][a-zA-Z0-9_-]{0,62}$`.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Valid binding name pattern. */
const BINDING_NAME_RE: RegExp = /^[a-zA-Z][a-zA-Z0-9_-]{0,62}$/;

/** Binding source types. */
const BINDING_SOURCES: ReadonlyArray<string> = ['kv_namespaces', 'r2_buckets', 'd1_databases'];

/**
 * Extract all binding names from a config level.
 *
 * @param config - Config object
 * @returns Array of binding name strings
 */
function extractAllBindingNames(config: Record<string, unknown>): string[] {
  const names: string[] = [];

  for (const source of BINDING_SOURCES) {
    const items: unknown = config[source];
    if (!Array.isArray(items)) {
      continue;
    }
    for (const item of items) {
      if (typeof item === 'object' && item !== null) {
        const obj: Record<string, unknown> = item as Record<string, unknown>;
        if (typeof obj.binding === 'string') {
          names.push(obj.binding);
        }
      }
    }
  }

  const durableObjects: unknown = config.durable_objects;
  if (typeof durableObjects === 'object' && durableObjects !== null) {
    const doObj: Record<string, unknown> = durableObjects as Record<string, unknown>;
    if (Array.isArray(doObj.bindings)) {
      for (const item of doObj.bindings) {
        if (typeof item === 'object' && item !== null) {
          const obj: Record<string, unknown> = item as Record<string, unknown>;
          if (typeof obj.name === 'string') {
            names.push(obj.name);
          }
        }
      }
    }
  }

  /* Tail consumers. */
  const tailConsumers: unknown = config.tail_consumers;
  if (Array.isArray(tailConsumers)) {
    for (const item of tailConsumers) {
      if (typeof item === 'object' && item !== null) {
        const obj: Record<string, unknown> = item as Record<string, unknown>;
        if (typeof obj.service === 'string') {
          names.push(obj.service);
        }
      }
    }
  }

  return names;
}

/** Validates binding naming conventions. */
const rule: WorkspaceRule = {
  id: 'workspace/wrangler-binding-naming-conventions',
  description: 'Wrangler binding names must follow naming conventions.',
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

      const relativePath: string = relative(ctx.rootDir, filePath);

      /* Check top-level bindings. */
      const topNames: string[] = extractAllBindingNames(parsed);
      for (const bindingName of topNames) {
        if (!BINDING_NAME_RE.test(bindingName)) {
          results.push(
            createResult(
              'workspace/wrangler-binding-naming-conventions',
              filePath,
              1,
              1,
              'error',
              `Invalid binding name '${bindingName}' in ${relativePath} — must match [a-zA-Z][a-zA-Z0-9_-]{0,62}`,
              {
                tip: 'Binding names must start with a letter and contain only alphanumeric, underscore, or hyphen characters',
              },
            ),
          );
        }
      }

      /* Check env-level bindings. */
      const env: unknown = parsed.env;
      if (typeof env === 'object' && env !== null) {
        const envObj: Record<string, unknown> = env as Record<string, unknown>;
        for (const envConfig of Object.values(envObj)) {
          if (typeof envConfig !== 'object' || envConfig === null) {
            continue;
          }
          const envNames: string[] = extractAllBindingNames(envConfig as Record<string, unknown>);
          for (const bindingName of envNames) {
            if (!BINDING_NAME_RE.test(bindingName)) {
              results.push(
                createResult(
                  'workspace/wrangler-binding-naming-conventions',
                  filePath,
                  1,
                  1,
                  'error',
                  `Invalid binding name '${bindingName}' in ${relativePath} — must match [a-zA-Z][a-zA-Z0-9_-]{0,62}`,
                  {
                    tip: 'Binding names must start with a letter and contain only alphanumeric, underscore, or hyphen characters',
                  },
                ),
              );
            }
          }
        }
      }
    }

    return results;
  },
};

export default rule;
