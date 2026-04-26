/**
 * Rule: workspace/no-broken-markdown-links
 *
 * Markdown files must not contain broken local links.
 *
 * @module
 */

import {dirname, join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex to match markdown links: [text](href). */
const MARKDOWN_LINK_PATTERN: RegExp = /\[([^\]]+)\]\(([^)]+)\)/g;

/** Prefixes that indicate a non-local link. */
const EXTERNAL_PREFIXES: readonly string[] = ['http', 'https', 'mailto', '#', '/'];

/** Markdown files must not contain broken local links. */
const rule: WorkspaceRule = {
  id: 'workspace/no-broken-markdown-links',
  description: 'Markdown files must not contain broken local links.',
  scope: 'workspace',
  categories: ['workspace', 'docs'],
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
      if (!filePath.endsWith('.md')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);
      const fileDir: string = dirname(filePath);

      let match: RegExpExecArray | null = MARKDOWN_LINK_PATTERN.exec(content);
      while (match !== null) {
        const href: string = match[2] ?? '';

        const isExternal: boolean = EXTERNAL_PREFIXES.some((prefix: string): boolean =>
          href.startsWith(prefix),
        );

        if (!isExternal && href.length > 0) {
          const targetPath: string = join(fileDir, href);
          const targetWithMd: string = `${targetPath}.md`;
          const targetIndexMd: string = join(targetPath, 'index.md');

          const exists: boolean = await ctx.fileExists(targetPath);
          const existsWithMd: boolean = await ctx.fileExists(targetWithMd);
          const existsIndexMd: boolean = await ctx.fileExists(targetIndexMd);

          if (!exists && !existsWithMd && !existsIndexMd) {
            results.push(
              createResult(
                'workspace/no-broken-markdown-links',
                filePath,
                1,
                1,
                'warning',
                `Broken local link in ${relativePath}: ${href}`,
                {
                  tip: 'Fix the broken link target or rename the referenced file'},
              ),
            );
          }
        }

        match = MARKDOWN_LINK_PATTERN.exec(content);
      }
    }

    return results;
  }};

export default rule;
