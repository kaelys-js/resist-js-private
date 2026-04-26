/**
 * Rule: workspace/no-hardcoded-service-urls
 *
 * Warns on hardcoded private IPs and service URLs in source files.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching private IPs and known service URLs. */
const SERVICE_URL_RE: RegExp =
  /(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|api\.cloudflare\.com)/g;

/** Source extensions to scan. */
const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set<string>(['.ts', '.tsx', '.js', '.jsx']);

/** Patterns to exclude. */
const EXCLUDED_PATTERNS: readonly string[] = [
  '.test.',
  '.spec.',
  '.e2e.',
  '__tests__',
  '__mocks__',
  'vitest.config',
  'vite.config',
];

/** Warns on hardcoded service URLs. */
const rule: WorkspaceRule = {
  id: 'workspace/no-hardcoded-service-urls',
  description: 'Source code should not contain hardcoded service URLs or private IPs.',
  scope: 'workspace',
  categories: ['workspace', 'security'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule depends on git/CI state via execSync. */
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
      const hasSrcExt: boolean = [...SOURCE_EXTENSIONS].some((ext: string): boolean =>
        filePath.endsWith(ext),
      );
      if (!hasSrcExt) {
        continue;
      }

      const isExcluded: boolean = EXCLUDED_PATTERNS.some((p: string): boolean =>
        filePath.includes(p),
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

      let match: RegExpExecArray | null = SERVICE_URL_RE.exec(content);

      while (match !== null) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-hardcoded-service-urls',
            filePath,
            1,
            1,
            'warning',
            `Hardcoded service URL '${match[0]}' in ${relativePath}`,
            {
              tip: 'Use environment variables or a config abstraction for service URLs',
            },
          ),
        );
        match = SERVICE_URL_RE.exec(content);
      }

      SERVICE_URL_RE.lastIndex = 0;
    }

    return results;
  },
};

export default rule;
