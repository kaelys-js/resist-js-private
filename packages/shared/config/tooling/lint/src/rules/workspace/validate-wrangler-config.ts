/**
 * Rule: workspace/validate-wrangler-config
 *
 * Wrangler config bindings must have valid names and no duplicates.
 * Validates KV namespaces, R2 buckets, D1 databases, and Durable Objects
 * bindings across wrangler.json / wrangler.jsonc files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Wrangler config filenames to check. */
const WRANGLER_FILES: ReadonlySet<string> = new Set(['wrangler.json', 'wrangler.jsonc']);

/**
 * Safely extract an array from parsed JSON by key.
 *
 * @param {Record<string, unknown>} obj - Parsed JSON object
 * @param {string} key - Key to extract
 * @returns {unknown[]} The array value, or empty array if not present/not an array
 */
function getArray(obj: Record<string, unknown>, key: string): unknown[] {
  const val: unknown = obj[key];
  return Array.isArray(val) ? (val as unknown[]) : [];
}

/** Validates wrangler config bindings for duplicates and placeholder values. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-wrangler-config',
  description: 'Wrangler config bindings must have valid names and no duplicates.',
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

      if (!WRANGLER_FILES.has(name)) {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);
      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      let config: Record<string, unknown>;
      try {
        config = JSON.parse(content) as Record<string, unknown>;
      } catch {
        results.push(
          createResult(
            'workspace/validate-wrangler-config',
            filePath,
            1,
            1,
            'error',
            `Failed to parse wrangler config: ${relativePath}`,
          ),
        );
        continue;
      }

      const allBindingNames: string[] = [];

      /* KV namespaces */
      for (const item of getArray(config, 'kv_namespaces')) {
        const entry: Record<string, unknown> = item as Record<string, unknown>;
        if (typeof entry.binding === 'string') {
          allBindingNames.push(entry.binding);
        }
      }

      /* R2 buckets */
      for (const item of getArray(config, 'r2_buckets')) {
        const entry: Record<string, unknown> = item as Record<string, unknown>;
        if (typeof entry.binding === 'string') {
          allBindingNames.push(entry.binding);
        }
      }

      /* D1 databases */
      for (const item of getArray(config, 'd1_databases')) {
        const entry: Record<string, unknown> = item as Record<string, unknown>;
        if (typeof entry.binding === 'string') {
          allBindingNames.push(entry.binding);
        }
      }

      /* Durable Objects */
      const durableObjects: unknown = config.durable_objects;
      if (typeof durableObjects === 'object' && durableObjects !== null) {
        const doConfig: Record<string, unknown> = durableObjects as Record<string, unknown>;
        for (const item of getArray(doConfig, 'bindings')) {
          const entry: Record<string, unknown> = item as Record<string, unknown>;

          if (typeof entry.name === 'string') {
            allBindingNames.push(entry.name);
          }

          /* Validate class_name */
          if (typeof entry.class_name !== 'string') {
            results.push(
              createResult(
                'workspace/validate-wrangler-config',
                filePath,
                1,
                1,
                'error',
                `Missing class_name for DO binding in ${relativePath}`,
              ),
            );
          } else if (entry.class_name === 'Example' || entry.class_name === 'ExampleDO') {
            results.push(
              createResult(
                'workspace/validate-wrangler-config',
                filePath,
                1,
                1,
                'error',
                `Placeholder class_name '${entry.class_name}' found in ${relativePath}`,
                {
                  tip: 'Replace placeholder class_name with the actual Durable Object class',
                },
              ),
            );
          }
        }
      }

      /* Check for duplicate binding names across all types */
      const seen: Set<string> = new Set();
      for (const bindingName of allBindingNames) {
        if (seen.has(bindingName)) {
          results.push(
            createResult(
              'workspace/validate-wrangler-config',
              filePath,
              1,
              1,
              'error',
              `Duplicate binding name '${bindingName}' in ${relativePath}`,
              {
                tip: 'Each binding name must be unique across KV, R2, D1, and Durable Objects',
              },
            ),
          );
        }
        seen.add(bindingName);
      }
    }

    return results;
  },
};

export default rule;
