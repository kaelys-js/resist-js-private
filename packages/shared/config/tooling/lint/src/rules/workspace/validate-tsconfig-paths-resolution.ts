/**
 * Rule: workspace/validate-tsconfig-paths-resolution
 *
 * Verifies compilerOptions.paths entries are syntactically valid
 * (no empty arrays, no empty strings).
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Validates tsconfig paths entries. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-tsconfig-paths-resolution',
  description: 'TSConfig paths entries must be syntactically valid.',
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
      if (!name.startsWith('tsconfig') || !name.endsWith('.json')) {
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
        continue;
      }

      const options: Record<string, unknown> = compilerOptions as Record<string, unknown>;
      const paths: unknown = options.paths;

      if (typeof paths !== 'object' || paths === null) {
        continue;
      }

      const pathsObj: Record<string, unknown> = paths as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      for (const [alias, targets] of Object.entries(pathsObj)) {
        if (!Array.isArray(targets)) {
          results.push(
            createResult(
              'workspace/validate-tsconfig-paths-resolution',
              filePath,
              1,
              1,
              'error',
              `Path alias '${alias}' in ${relativePath} must map to an array`,
              {
                tip: 'Paths values must be arrays of strings',
              },
            ),
          );
          continue;
        }

        if (targets.length === 0) {
          results.push(
            createResult(
              'workspace/validate-tsconfig-paths-resolution',
              filePath,
              1,
              1,
              'error',
              `Path alias '${alias}' in ${relativePath} has empty targets array`,
              {
                tip: 'Add at least one target path for this alias',
              },
            ),
          );
          continue;
        }

        for (const target of targets) {
          if (typeof target !== 'string') {
            results.push(
              createResult(
                'workspace/validate-tsconfig-paths-resolution',
                filePath,
                1,
                1,
                'error',
                `Path alias '${alias}' in ${relativePath} contains non-string target`,
                {
                  tip: 'Path targets must be strings',
                },
              ),
            );
          } else if (target.length === 0) {
            results.push(
              createResult(
                'workspace/validate-tsconfig-paths-resolution',
                filePath,
                1,
                1,
                'error',
                `Path alias '${alias}' in ${relativePath} contains empty string target`,
                {
                  tip: 'Remove empty string from paths targets',
                },
              ),
            );
          }
        }
      }
    }

    return results;
  },
};

export default rule;
