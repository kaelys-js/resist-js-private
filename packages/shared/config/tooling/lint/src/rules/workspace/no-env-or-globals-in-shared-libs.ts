/**
 * Rule: workspace/no-env-or-globals-in-shared-libs
 *
 * Block direct process.env/globalThis/global access in shared library code.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Patterns to detect global/env access with their human-readable type labels. */
const GLOBAL_PATTERNS: ReadonlyArray<{ regex: RegExp; type: string }> = [
  { regex: /(?:^|[^a-zA-Z])process\.env\./m, type: 'process.env' },
  { regex: /(?:^|[^a-zA-Z])globalThis\./m, type: 'globalThis' },
  { regex: /(?:^|[^a-zA-Z])global\./m, type: 'global' },
];

/** Segments in a file path that indicate test/mock files to skip. */
const SKIP_SEGMENTS: readonly string[] = ['__tests__', '.test.', '.spec.', 'mock', 'fixture'];

/** Block direct process.env/globalThis/global access in shared library code. */
const rule: WorkspaceRule = {
  id: 'workspace/no-env-or-globals-in-shared-libs',
  description: 'Shared library code must not directly access process.env, globalThis, or global.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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
      const relativePath: string = relative(ctx.rootDir, filePath);

      if (!relativePath.startsWith('packages/shared/')) {
        continue;
      }

      if (!filePath.endsWith('.ts') && !filePath.endsWith('.js')) {
        continue;
      }

      let isTestFile: boolean = false;

      for (const segment of SKIP_SEGMENTS) {
        if (filePath.includes(segment)) {
          isTestFile = true;
          break;
        }
      }
      if (isTestFile) {
        continue;
      }

      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      for (const { regex, type } of GLOBAL_PATTERNS) {
        if (regex.test(content)) {
          results.push(
            createResult(
              'workspace/no-env-or-globals-in-shared-libs',
              filePath,
              1,
              1,
              'error',
              `Direct ${type} access in shared library: ${relativePath}`,
              {
                tip: 'Inject config via function arguments or adapters instead of accessing env/globals directly',
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
