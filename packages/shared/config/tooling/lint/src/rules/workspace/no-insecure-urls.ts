/**
 * Rule: workspace/no-insecure-urls
 *
 * Source files must not contain insecure HTTP URLs.
 * Localhost and loopback URLs are allowed.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Source file extensions to scan. */
const SOURCE_EXTENSIONS: readonly string[] = ['.ts', '.js', '.json', '.yaml', '.yml', '.md'];

/** Prefixes for allowed HTTP URLs (localhost/loopback). */
const ALLOWED_PREFIXES: readonly string[] = [
  'http://localhost',
  'http://127.0.0.1',
  'http://0.0.0.0',
];

/** Flags files containing insecure HTTP URLs. */
const rule: WorkspaceRule = {
  id: 'workspace/no-insecure-urls',
  description: 'Source files must not contain insecure HTTP URLs.',
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
      if (!SOURCE_EXTENSIONS.some((ext: string): boolean => filePath.endsWith(ext))) {
        continue;
      }

      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      /** Find all http:// occurrences and check if any are non-local. */
      let idx: number = content.indexOf('http://');
      let found: boolean = false;

      while (idx !== -1) {
        const substr: string = content.slice(idx);
        const isAllowed: boolean = ALLOWED_PREFIXES.some((prefix: string): boolean =>
          substr.startsWith(prefix),
        );

        if (!isAllowed) {
          found = true;
          break;
        }

        idx = content.indexOf('http://', idx + 1);
      }

      if (found) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-insecure-urls',
            filePath,
            1,
            1,
            'warning',
            `Insecure HTTP URL found: ${relativePath}`,
            {
              tip: 'Use https:// instead of http://',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
