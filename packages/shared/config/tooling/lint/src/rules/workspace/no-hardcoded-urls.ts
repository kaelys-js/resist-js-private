/**
 * Rule: workspace/no-hardcoded-urls
 *
 * Source files must not contain hardcoded URLs with explicit port numbers,
 * which indicate dev/staging endpoints that should not be committed.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Source file extensions to scan. */
const SOURCE_EXTENSIONS: readonly string[] = [
  '.ts',
  '.js',
  '.json',
  '.yaml',
  '.yml',
  '.md',
  '.svelte',
];

/** Hostnames that are explicitly allowed even with port numbers. */
const ALLOWED_HOSTS: readonly string[] = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'example.com',
  'example.org',
];

/**
 * Regex that matches URLs with explicit port numbers:
 * http(s)://some-host:PORT/...
 */
const HARDCODED_URL_REGEX: RegExp = /https?:\/\/([a-zA-Z][a-zA-Z0-9.-]*):\d{2,5}/g;

/** Flags files containing hardcoded URLs with explicit ports. */
const rule: WorkspaceRule = {
  id: 'workspace/no-hardcoded-urls',
  description:
    'Source files must not contain hardcoded URLs with explicit port numbers (dev/staging endpoints).',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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
      if (!SOURCE_EXTENSIONS.some((ext: string): boolean => filePath.endsWith(ext))) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      HARDCODED_URL_REGEX.lastIndex = 0;
      let match: RegExpExecArray | null = HARDCODED_URL_REGEX.exec(content);
      let found: boolean = false;

      while (match !== null) {
        const host: string = match[1] ?? '';
        const isAllowed: boolean = ALLOWED_HOSTS.some(
          (allowed: string): boolean => host === allowed,
        );

        if (!isAllowed) {
          found = true;
          break;
        }

        match = HARDCODED_URL_REGEX.exec(content);
      }

      if (found) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-hardcoded-urls',
            filePath,
            1,
            1,
            'warning',
            `Hardcoded URL with explicit port found: ${relativePath}`,
            {
              tip: 'Replace hardcoded URLs with environment variables',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
