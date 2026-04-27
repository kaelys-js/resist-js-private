/**
 * Rule: workspace/vitest-config-and-coverage
 *
 * Enforce Vitest config, coverage, naming, and test hygiene.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Enforce Vitest config, coverage, naming, and test hygiene. */
const rule: WorkspaceRule = {
  id: 'workspace/vitest-config-and-coverage',
  description: 'Enforce Vitest config, coverage, naming, and test hygiene.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
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
    const allFiles: readonly string[] = await ctx.allFiles();

    // 1. Shared vitest.config must exist
    const configPaths: string[] = ['vitest.config.ts', 'vitest.config.js'];
    const hasConfig: boolean = allFiles.some((f: string): boolean =>
      configPaths.some(
        (c: string): boolean =>
          f.endsWith(`/shared/utils/test/${c}`) || f.endsWith(`shared/utils/test/${c}`),
      ),
    );
    if (!hasConfig) {
      results.push(
        createResult(
          'workspace/vitest-config-and-coverage',
          ctx.rootDir,
          1,
          1,
          'error',
          'Missing shared vitest.config.ts or .js',
          { tip: 'Place a central Vitest config in packages/shared/utils/test/' },
        ),
      );
    }

    // 2. No rogue vitest.config files outside shared utils
    for (const file of allFiles) {
      if (/vitest\.config\.(ts|js|mjs)$/.test(file) && !file.includes('shared/utils/test/')) {
        results.push(
          createResult(
            'workspace/vitest-config-and-coverage',
            file,
            1,
            1,
            'error',
            `Unexpected Vitest config outside shared utils: ${file}`,
            { tip: 'Consolidate Vitest configuration in shared/utils/test/ only' },
          ),
        );
      }
    }

    // 3. Test files must use .test.ts or .spec.ts suffix (no test code in plain .ts)
    for (const file of allFiles) {
      if (
        file.endsWith('.ts') &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.spec.ts') &&
        !file.endsWith('.bench.ts') &&
        !file.endsWith('.d.ts') &&
        !file.includes('node_modules')
      ) {
        try {
          const content: string = await ctx.readFile(file);
          if (/\b(describe|it|test)\s*\(/.test(content) && /\bexpect\s*\(/.test(content)) {
            results.push(
              createResult(
                'workspace/vitest-config-and-coverage',
                file,
                1,
                1,
                'error',
                `Test code found in non-conforming file: ${file}`,
                { tip: 'Rename to .test.ts or .spec.ts' },
              ),
            );
          }
        } catch {
          continue;
        }
      }
    }

    // 4. No .skip/.only/.todo in test files
    for (const file of allFiles) {
      if (file.endsWith('.test.ts') || file.endsWith('.spec.ts')) {
        try {
          const content: string = await ctx.readFile(file);
          const lines: string[] = content.split('\n');
          for (let i: number = 0; i < lines.length; i++) {
            if (/\b(it|test|describe)\.(skip|only|todo)\b/.test(lines[i] ?? '')) {
              results.push(
                createResult(
                  'workspace/vitest-config-and-coverage',
                  file,
                  i + 1,
                  1,
                  'error',
                  'Skipped or focused test found',
                  { tip: 'Remove .skip/.only/.todo to ensure all tests run' },
                ),
              );
            }
          }
        } catch {
          continue;
        }
      }
    }

    // 5. No committed .snap files
    for (const file of allFiles) {
      if (file.endsWith('.snap')) {
        results.push(
          createResult(
            'workspace/vitest-config-and-coverage',
            file,
            1,
            1,
            'error',
            `Snapshot file detected: ${file}`,
            { tip: 'Remove snapshot tests or add .snap to .gitignore' },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
