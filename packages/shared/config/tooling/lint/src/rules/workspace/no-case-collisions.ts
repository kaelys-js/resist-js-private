/**
 * Rule: workspace/no-case-collisions
 *
 * Files must not have case-insensitive path collisions.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags files whose paths collide case-insensitively. */
const rule: WorkspaceRule = {
  id: 'workspace/no-case-collisions',
  description: 'Files must not have case-insensitive path collisions.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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

    /** Map of lowercased relative paths to original relative paths. */
    const caseMap: Map<string, string[]> = new Map();

    for await (const filePath of ctx.allFiles()) {
      const relativePath: string = relative(ctx.rootDir, filePath);
      const lower: string = relativePath.toLowerCase();
      const existing: string[] | undefined = caseMap.get(lower);

      if (existing !== undefined) {
        existing.push(relativePath);
      } else {
        caseMap.set(lower, [relativePath]);
      }
    }

    for (const [, paths] of caseMap) {
      if (paths.length < 2) {
        continue;
      }

      for (const currentPath of paths) {
        const otherPaths: string[] = paths.filter((p: string): boolean => p !== currentPath);
        const otherPath: string = otherPaths[0]!;

        results.push(
          createResult(
            'workspace/no-case-collisions',
            `${ctx.rootDir}/${currentPath}`,
            1,
            1,
            'error',
            `Case-insensitive collision: "${currentPath}" collides with "${otherPath}"`,
            {
              tip: 'Rename to avoid case-only differences — macOS/Windows filesystems are case-insensitive',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
