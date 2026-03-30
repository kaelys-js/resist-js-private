/**
 * Rule: workspace/no-tsconfig-outdir-rootdir-files
 *
 * Warns when monorepo tsconfigs (inside packages/) use outDir, rootDir,
 * or files instead of include/exclude.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Fields that monorepo tsconfigs should avoid. */
const DISCOURAGED_FIELDS: ReadonlyArray<string> = ['outDir', 'rootDir', 'files'];

/** Warns when monorepo tsconfigs use outDir, rootDir, or files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tsconfig-outdir-rootdir-files',
  description: 'Monorepo tsconfigs should use include/exclude instead of outDir/rootDir/files.',
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

      /* Only check tsconfigs inside packages/ directories. */
      const relativePath: string = relative(ctx.rootDir, filePath);
      if (!relativePath.startsWith('packages/')) {
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

      const compilerOptions: unknown = parsed.compilerOptions;
      if (typeof compilerOptions !== 'object' || compilerOptions === null) {
        /* Check top-level files field. */
        if (Array.isArray(parsed.files)) {
          results.push(
            createResult(
              'workspace/no-tsconfig-outdir-rootdir-files',
              filePath,
              1,
              1,
              'warning',
              `Monorepo tsconfig ${relativePath} uses 'files' — prefer include/exclude instead`,
              {
                tip: 'Use include and exclude patterns instead of explicit files list',
              },
            ),
          );
        }
        continue;
      }

      const options: Record<string, unknown> = compilerOptions as Record<string, unknown>;

      for (const field of DISCOURAGED_FIELDS) {
        if (field === 'files') {
          /* files is top-level, not in compilerOptions. */
          if (Array.isArray(parsed.files)) {
            results.push(
              createResult(
                'workspace/no-tsconfig-outdir-rootdir-files',
                filePath,
                1,
                1,
                'warning',
                `Monorepo tsconfig ${relativePath} uses '${field}' — prefer include/exclude instead`,
                {
                  tip: 'Use include and exclude patterns instead of explicit files list',
                },
              ),
            );
          }
        } else if (options[field] !== undefined) {
          results.push(
            createResult(
              'workspace/no-tsconfig-outdir-rootdir-files',
              filePath,
              1,
              1,
              'warning',
              `Monorepo tsconfig ${relativePath} uses '${field}' — prefer include/exclude instead`,
              {
                tip: `Remove ${field} from compilerOptions and use include/exclude patterns`,
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
