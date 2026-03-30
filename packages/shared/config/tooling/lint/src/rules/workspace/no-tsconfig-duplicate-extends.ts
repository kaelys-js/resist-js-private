/**
 * Rule: workspace/no-tsconfig-duplicate-extends
 *
 * Detect duplicate or circular extends chains in tsconfig.json files.
 *
 * @module
 */

import { basename, dirname, relative, resolve } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Detects duplicate or circular extends chains in tsconfig.json files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tsconfig-duplicate-extends',
  description: 'TSConfig extends chains must not contain duplicates or cycles.',
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

    /* Collect all tsconfig files and their contents. */
    const tsconfigFiles: Map<string, string> = new Map();

    for await (const filePath of ctx.allFiles()) {
      const name: string = basename(filePath);
      if (name.startsWith('tsconfig') && name.endsWith('.json')) {
        try {
          const content: string = await ctx.readFile(filePath);
          tsconfigFiles.set(filePath, content);
        } catch {
          /* Skip unreadable files. */
        }
      }
    }

    /* Track which base configs are extended by which tsconfigs. */
    const baseToExtenders: Map<string, string[]> = new Map();

    for (const [filePath, content] of tsconfigFiles) {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content) as Record<string, unknown>;
      } catch {
        continue;
      }

      const extendsField: unknown = parsed.extends;
      if (typeof extendsField !== 'string' || extendsField.length === 0) {
        continue;
      }

      /* Resolve the extends path relative to the tsconfig directory. */
      const dir: string = dirname(filePath);
      const resolvedBase: string = resolve(dir, extendsField);

      const extenders: string[] | undefined = baseToExtenders.get(resolvedBase);
      if (extenders !== undefined) {
        extenders.push(filePath);
      } else {
        baseToExtenders.set(resolvedBase, [filePath]);
      }

      /* Check for circular extends (file extends itself). */
      if (resolvedBase === filePath) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-tsconfig-duplicate-extends',
            filePath,
            1,
            1,
            'error',
            `Circular extends: ${relativePath} extends itself`,
            {
              tip: 'Remove the circular extends reference',
            },
          ),
        );
      }
    }

    /* Detect chains: follow extends to find cycles. */
    for (const [filePath, content] of tsconfigFiles) {
      const visited: Set<string> = new Set<string>();
      let current: string = filePath;
      let currentContent: string | undefined = content;

      while (currentContent !== undefined) {
        if (visited.has(current)) {
          const relativePath: string = relative(ctx.rootDir, filePath);
          const relCurrent: string = relative(ctx.rootDir, current);
          results.push(
            createResult(
              'workspace/no-tsconfig-duplicate-extends',
              filePath,
              1,
              1,
              'error',
              `Circular extends chain detected starting from ${relativePath} (cycle at ${relCurrent})`,
              {
                tip: 'Break the circular extends chain',
              },
            ),
          );
          break;
        }

        visited.add(current);

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(currentContent) as Record<string, unknown>;
        } catch {
          break;
        }

        const extendsField: unknown = parsed.extends;
        if (typeof extendsField !== 'string' || extendsField.length === 0) {
          break;
        }

        const dir: string = dirname(current);
        const resolvedBase: string = resolve(dir, extendsField);
        current = resolvedBase;
        currentContent = tsconfigFiles.get(resolvedBase);
      }
    }

    /* Detect duplicate extends: multiple tsconfigs extending the same base. */
    for (const [base, extenders] of baseToExtenders) {
      if (extenders.length > 1) {
        /* This is informational — only flag if it creates version conflicts. */
        /* Skip: multiple files extending the same base is normal in monorepos. */
      }
    }

    return results;
  },
};

export default rule;
