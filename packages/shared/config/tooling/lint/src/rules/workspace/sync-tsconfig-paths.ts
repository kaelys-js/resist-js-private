/**
 * Rule: sync/tsconfig-paths
 *
 * Ensures every path alias in tsconfig.json `paths` points to an
 * existing file or directory.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Validates tsconfig path alias targets exist on disk. */
const rule: WorkspaceRule = {
  id: 'sync/tsconfig-paths',
  description: 'TSConfig path aliases must point to existing files.',
  scope: 'workspace',
  categories: ['sync', 'workspace'],
  stages: ['lint', 'ci'],
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

    const tsconfigPath: string = join(ctx.rootDir, 'tsconfig.json');
    const exists: boolean = await ctx.fileExists(tsconfigPath);
    if (!exists) {
      return results;
    }

    let tsconfig: Record<string, unknown>;
    try {
      tsconfig = JSON.parse(await ctx.readFile(tsconfigPath)) as Record<string, unknown>;
    } catch {
      return results;
    }

    const compilerOptions: Record<string, unknown> = (tsconfig.compilerOptions ?? {}) as Record<
      string,
      unknown
    >;
    const paths: Record<string, string[]> = (compilerOptions.paths ?? {}) as Record<
      string,
      string[]
    >;

    /* Read raw file for line numbers */
    const rawContent: string = await ctx.readFile(tsconfigPath);
    const lines: string[] = rawContent.split('\n');

    /* Build flat list of alias+target pairs to check */
    const checks: Array<{ alias: string; target: string }> = [];
    for (const [alias, targets] of Object.entries(paths)) {
      if (!Array.isArray(targets)) {
        continue;
      }
      for (const target of targets) {
        if (typeof target !== 'string') {
          continue;
        }
        /* Skip wildcard targets — can't statically verify globs */
        if (target.includes('*')) {
          continue;
        }
        checks.push({ alias, target });
      }
    }

    await Promise.all(
      checks.map(async (check: { alias: string; target: string }): Promise<void> => {
        const resolvedPath: string = join(ctx.rootDir, check.target);
        const fileOk: boolean = await ctx.fileExists(resolvedPath);
        const dirOk: boolean = await ctx.dirExists(resolvedPath);

        if (!fileOk && !dirOk) {
          /* Find line number */
          let lineNum: number = 1;
          for (let i: number = 0; i < lines.length; i++) {
            if (lines[i]?.includes(`"${check.alias}"`) || lines[i]?.includes(check.target)) {
              lineNum = i + 1;
              break;
            }
          }

          results.push(
            createResult(
              'sync/tsconfig-paths',
              tsconfigPath,
              lineNum,
              1,
              'error',
              `Path alias '${check.alias}' target '${check.target}' does not exist`,
              {
                tip: 'Update the path alias to point to an existing file or create the missing file',
              },
            ),
          );
        }
      }),
    );

    return results;
  },
};

export default rule;
