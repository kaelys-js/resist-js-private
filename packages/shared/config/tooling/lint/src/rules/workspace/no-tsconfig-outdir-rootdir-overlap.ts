/**
 * Rule: workspace/no-tsconfig-outdir-rootdir-overlap
 *
 * compilerOptions.outDir must not equal rootDir or be ".".
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags outDir/rootDir overlap in tsconfig files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tsconfig-outdir-rootdir-overlap',
  description: 'compilerOptions.outDir must not equal rootDir or be ".".',
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

    for await (const filePath of ctx.allFiles()) {
      const name: string = basename(filePath);
      if (!name.includes('tsconfig') || !name.endsWith('.json')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const compilerOptions: Record<string, unknown> = (parsed.compilerOptions ?? {}) as Record<
        string,
        unknown
      >;
      const relativePath: string = relative(ctx.rootDir, filePath);
      const outDir: unknown = compilerOptions.outDir;
      const rootDir: unknown = compilerOptions.rootDir;

      if (typeof outDir !== 'string' || outDir === '') {
        continue;
      }

      const effectiveRootDir: string =
        typeof rootDir === 'string' && rootDir !== '' ? rootDir : 'src';

      if (outDir === effectiveRootDir || outDir === '.') {
        results.push(
          createResult(
            'workspace/no-tsconfig-outdir-rootdir-overlap',
            filePath,
            1,
            1,
            'error',
            `outDir must not match rootDir in ${relativePath} — outDir: "${outDir}", rootDir: "${effectiveRootDir}"`,
            {
              tip: 'Use a dedicated build folder for outDir like "dist/"',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
