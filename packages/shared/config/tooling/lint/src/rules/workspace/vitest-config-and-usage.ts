/**
 * Rule: workspace/vitest-config-and-usage
 *
 * Enforce Vitest standards and config consistency.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Enforce Vitest standards and config consistency. */
const rule: WorkspaceRule = {
  id: 'workspace/vitest-config-and-usage',
  description: 'Enforce Vitest standards and config consistency.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
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
    const allFiles: readonly string[] = await ctx.allFiles();

    // Find all vitest.config.ts files
    const configFiles: string[] = [...allFiles].filter((f: string): boolean =>
      /vitest\.config\.ts$/.test(f),
    );

    for (const configFile of configFiles) {
      let content: string;
      try {
        content = await ctx.readFile(configFile);
      } catch {
        continue;
      }

      // 1. Must use defineConfig
      if (!content.includes('defineConfig')) {
        results.push(
          createResult(
            'workspace/vitest-config-and-usage',
            configFile,
            1,
            1,
            'error',
            `Missing defineConfig wrapper in ${configFile}`,
            { tip: 'Always wrap config in defineConfig() for type safety' },
          ),
        );
      }

      // 2. Must include isolate: true
      if (!/isolate:\s*true/.test(content)) {
        results.push(
          createResult(
            'workspace/vitest-config-and-usage',
            configFile,
            1,
            1,
            'error',
            `Missing 'isolate: true' in ${configFile}`,
            { tip: 'Enabling isolate mode prevents test contamination' },
          ),
        );
      }

      // 3. Must include coverage config
      if (!content.includes('coverage')) {
        results.push(
          createResult(
            'workspace/vitest-config-and-usage',
            configFile,
            1,
            1,
            'error',
            `Missing coverage thresholds in ${configFile}`,
            { tip: 'Enforce minimum test coverage via test.coverage settings' },
          ),
        );
      }
    }

    // 4. No shared exports of vitest utilities
    for (const file of allFiles) {
      if (
        file.includes('packages/shared') &&
        file.endsWith('.ts') &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.spec.ts')
      ) {
        try {
          const content: string = await ctx.readFile(file);
          if (/export.*from.*['"]vitest['"]/.test(content)) {
            results.push(
              createResult(
                'workspace/vitest-config-and-usage',
                file,
                1,
                1,
                'error',
                'Shared package is exporting test-only Vitest utilities',
                { tip: 'Avoid polluting shared exports with test-specific code' },
              ),
            );
          }
        } catch {
          continue;
        }
      }
    }

    return results;
  },
};

export default rule;
