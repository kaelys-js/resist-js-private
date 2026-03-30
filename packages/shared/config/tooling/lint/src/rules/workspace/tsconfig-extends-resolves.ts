/**
 * Rule: workspace/tsconfig-extends-resolves
 *
 * The extends target in tsconfig files must resolve to an actual file.
 *
 * @module
 */

import { basename, dirname, join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Validates that tsconfig extends targets resolve to existing files. */
const rule: WorkspaceRule = {
  id: 'workspace/tsconfig-extends-resolves',
  description: 'The extends target in tsconfig files must resolve to an actual file.',
  scope: 'workspace',
  categories: ['workspace', 'tsconfig'],
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
      if (!name.startsWith('tsconfig') || !name.endsWith('.json')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const extendsValue: unknown = parsed.extends;

      if (typeof extendsValue !== 'string') {
        continue;
      }

      // Skip scoped packages — they resolve via node_modules
      if (extendsValue.startsWith('@')) {
        continue;
      }

      const dir: string = dirname(filePath);
      const resolved: string = join(dir, extendsValue);

      let exists: boolean = await ctx.fileExists(resolved);

      // If not found and doesn't already end in .json, try appending .json
      if (!exists && !resolved.endsWith('.json')) {
        const withJson: string = `${resolved}.json`;
        exists = await ctx.fileExists(withJson);
      }

      if (!exists) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/tsconfig-extends-resolves',
            filePath,
            1,
            1,
            'error',
            `tsconfig extends target "${extendsValue}" does not resolve — ${relativePath}`,
            {
              tip: 'Ensure extends target exists or use correct relative path',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
