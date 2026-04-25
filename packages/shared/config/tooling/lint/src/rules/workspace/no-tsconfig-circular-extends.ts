/**
 * Rule: workspace/no-tsconfig-circular-extends
 *
 * Detects circular extends chains in tsconfig files.
 *
 * @module
 */

import { basename, dirname, join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Detects circular extends chains across tsconfig files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tsconfig-circular-extends',
  description: 'Detects circular extends chains in tsconfig files.',
  scope: 'workspace',
  categories: ['workspace', 'tsconfig'],
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

    // First pass: collect all tsconfig files and their resolved extends targets
    const extendsMap: Map<string, string | undefined> = new Map<string, string | undefined>();

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);
      if (!name.startsWith('tsconfig') || !name.endsWith('.json')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const extendsValue: unknown = parsed.extends;

      if (typeof extendsValue !== 'string') {
        extendsMap.set(filePath, undefined);
        continue;
      }

      // Skip scoped packages — can't resolve to local files
      if (extendsValue.startsWith('@')) {
        extendsMap.set(filePath, undefined);
        continue;
      }

      const dir: string = dirname(filePath);
      const resolved: string = join(dir, extendsValue);
      extendsMap.set(filePath, resolved);
    }

    // Second pass: follow extends chains and detect cycles
    for (const [filePath, _target] of extendsMap) {
      const visited: Set<string> = new Set<string>();
      let current: string | undefined = filePath;

      while (current !== undefined) {
        if (visited.has(current)) {
          // Cycle detected — report on the original file
          const relativePath: string = relative(ctx.rootDir, filePath);
          results.push(
            createResult(
              'workspace/no-tsconfig-circular-extends',
              filePath,
              1,
              1,
              'error',
              `Circular tsconfig extends chain detected — ${relativePath}`,
              {
                tip: 'Remove circular extends chain \u2014 A extending B which extends A',
              },
            ),
          );
          break;
        }

        visited.add(current);

        const next: string | undefined = extendsMap.get(current);
        if (next === undefined) {
          break;
        }

        // Check if the resolved target is in our map; if not, chain ends
        if (!extendsMap.has(next)) {
          // Try with .json suffix
          const withJson: string = `${next}.json`;
          if (extendsMap.has(withJson)) {
            current = withJson;
          } else {
            break;
          }
        } else {
          current = next;
        }
      }
    }

    return results;
  },
};

export default rule;
