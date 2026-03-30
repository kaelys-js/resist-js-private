/**
 * Rule: workspace/no-hardcoded-localhost-ports
 *
 * Rejects hardcoded localhost:PORT and 127.0.0.1 URLs in source files.
 * Excludes test files and config files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching hardcoded localhost URLs. */
const LOCALHOST_RE: RegExp = /(?:localhost:\d{2,5}|127\.0\.0\.1(?::\d{2,5})?)/g;

/** Source file extensions to scan. */
const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set<string>(['.ts', '.tsx', '.js', '.jsx']);

/** File patterns to exclude from checking. */
const EXCLUDED_PATTERNS: ReadonlyArray<string> = [
  '.test.',
  '.spec.',
  '.e2e.',
  '__tests__',
  '__mocks__',
  'vitest.config',
  'vite.config',
  'playwright.config',
  'jest.config',
];

/** Rejects hardcoded localhost URLs in source files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-hardcoded-localhost-ports',
  description: 'Source code must not contain hardcoded localhost URLs.',
  scope: 'workspace',
  categories: ['workspace', 'security'],
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
      /* Only scan source files. */
      const hasSourceExt: boolean = [...SOURCE_EXTENSIONS].some((ext: string): boolean =>
        filePath.endsWith(ext),
      );
      if (!hasSourceExt) {
        continue;
      }

      /* Exclude test/config files. */
      const name: string = basename(filePath);
      const isExcluded: boolean = EXCLUDED_PATTERNS.some(
        (pattern: string): boolean => name.includes(pattern) || filePath.includes(pattern),
      );
      if (isExcluded) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      let match: RegExpExecArray | null = LOCALHOST_RE.exec(content);

      while (match !== null) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-hardcoded-localhost-ports',
            filePath,
            1,
            1,
            'error',
            `Hardcoded localhost URL '${match[0]}' found in ${relativePath}`,
            {
              tip: 'Use environment variables or configuration for URLs',
            },
          ),
        );

        match = LOCALHOST_RE.exec(content);
      }

      /* Reset regex lastIndex for next file. */
      LOCALHOST_RE.lastIndex = 0;
    }

    return results;
  },
};

export default rule;
