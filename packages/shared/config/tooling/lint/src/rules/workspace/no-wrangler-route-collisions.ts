/**
 * Rule: workspace/no-wrangler-route-collisions
 *
 * Detects duplicate route definitions across wrangler.json files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/**
 * Extract routes from a wrangler config.
 *
 * @param config - Parsed wrangler.json
 * @param filePath - Source file path
 * @returns Array of { route, file } objects
 */
function extractRoutes(
  config: Record<string, unknown>,
  filePath: string,
): Array<{ route: string; file: string }> {
  const routes: Array<{ route: string; file: string }> = [];

  /* Top-level routes. */
  if (Array.isArray(config.routes)) {
    for (const route of config.routes) {
      if (typeof route === 'string') {
        routes.push({ route, file: filePath });
      } else if (typeof route === 'object' && route !== null) {
        const routeObj: Record<string, unknown> = route as Record<string, unknown>;
        if (typeof routeObj.pattern === 'string') {
          routes.push({ route: routeObj.pattern, file: filePath });
        }
      }
    }
  }

  /* Top-level route (singular). */
  if (typeof config.route === 'string') {
    routes.push({ route: config.route, file: filePath });
  }

  /* Environment-level routes. */
  const env: unknown = config.env;
  if (typeof env === 'object' && env !== null) {
    const envObj: Record<string, unknown> = env as Record<string, unknown>;
    for (const envConfig of Object.values(envObj)) {
      if (typeof envConfig === 'object' && envConfig !== null) {
        const envCfg: Record<string, unknown> = envConfig as Record<string, unknown>;
        if (Array.isArray(envCfg.routes)) {
          for (const route of envCfg.routes) {
            if (typeof route === 'string') {
              routes.push({ route, file: filePath });
            } else if (typeof route === 'object' && route !== null) {
              const routeObj: Record<string, unknown> = route as Record<string, unknown>;
              if (typeof routeObj.pattern === 'string') {
                routes.push({ route: routeObj.pattern, file: filePath });
              }
            }
          }
        }
        if (typeof envCfg.route === 'string') {
          routes.push({ route: envCfg.route, file: filePath });
        }
      }
    }
  }

  return routes;
}

/** Detects duplicate routes across wrangler.json files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-wrangler-route-collisions',
  description: 'Wrangler routes must not collide across workers.',
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

    const allRoutes: Array<{ route: string; file: string }> = [];

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

      const routes: Array<{ route: string; file: string }> = extractRoutes(parsed, filePath);
      allRoutes.push(...routes);
    }

    /* Detect duplicates. */
    const seen: Map<string, string> = new Map();

    for (const entry of allRoutes) {
      const existing: string | undefined = seen.get(entry.route);
      if (existing !== undefined) {
        const relFile: string = relative(ctx.rootDir, entry.file);
        const relExisting: string = relative(ctx.rootDir, existing);
        results.push(
          createResult(
            'workspace/no-wrangler-route-collisions',
            entry.file,
            1,
            1,
            'error',
            `Duplicate route '${entry.route}' in ${relFile} — already defined in ${relExisting}`,
            {
              tip: 'Each route pattern should be unique across all workers',
            },
          ),
        );
      } else {
        seen.set(entry.route, entry.file);
      }
    }

    return results;
  },
};

export default rule;
