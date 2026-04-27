/**
 * Rule: workspace/wrangler-binding-names-unique
 *
 * Detects duplicate binding names across wrangler.json files
 * (kv_namespaces, r2_buckets, d1_databases, durable_objects.bindings).
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Binding source types to extract names from. */
const BINDING_SOURCES: readonly string[] = ['kv_namespaces', 'r2_buckets', 'd1_databases'];

/**
 * Extract binding names from a wrangler config object.
 *
 * @param config - Parsed wrangler.json
 * @param filePath - Path to the wrangler.json for error reporting
 * @returns Array of { name, source, file } objects
 */
function extractBindingNames(
  config: Record<string, unknown>,
  filePath: string,
): Array<{ name: string; source: string; file: string }> {
  const bindings: Array<{ name: string; source: string; file: string }> = [];

  for (const source of BINDING_SOURCES) {
    const items: unknown = config[source];
    if (!Array.isArray(items)) {
      continue;
    }

    for (const item of items) {
      if (typeof item === 'object' && item !== null) {
        const obj: Record<string, unknown> = item as Record<string, unknown>;
        const bindingName: unknown = obj.binding;
        if (typeof bindingName === 'string') {
          bindings.push({ name: bindingName, source, file: filePath });
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
          const bindingName: unknown = obj.name;
          if (typeof bindingName === 'string') {
            bindings.push({ name: bindingName, source: 'durable_objects', file: filePath });
          }
        }
      }
    }
  }

  return bindings;
}

/** Detects duplicate binding names across wrangler.json files. */
const rule: WorkspaceRule = {
  id: 'workspace/wrangler-binding-names-unique',
  description: 'Wrangler binding names must be unique across all wrangler.json files.',
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

    /* Collect all binding names across all wrangler files. */
    const allBindings: Array<{ name: string; source: string; file: string }> = [];

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

      const bindings: Array<{ name: string; source: string; file: string }> = extractBindingNames(
        parsed,
        filePath,
      );
      allBindings.push(...bindings);
    }

    /* Detect duplicates. */
    const seen: Map<string, { source: string; file: string }> = new Map();

    for (const binding of allBindings) {
      const existing: { source: string; file: string } | undefined = seen.get(binding.name);
      if (existing === undefined) {
        seen.set(binding.name, { source: binding.source, file: binding.file });
      } else {
        const relFile: string = relative(ctx.rootDir, binding.file);
        const relExisting: string = relative(ctx.rootDir, existing.file);
        results.push(
          createResult(
            'workspace/wrangler-binding-names-unique',
            binding.file,
            1,
            1,
            'error',
            `Duplicate binding name '${binding.name}' in ${relFile} (${binding.source}) — already defined in ${relExisting} (${existing.source})`,
            {
              tip: 'Use unique binding names across all wrangler.json files',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
