/**
 * Rule: workspace/validate-image-optimization
 *
 * Image files should be optimized for size.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Maximum allowed size for .webp files (300KB). */
const MAX_WEBP_SIZE: number = 307200;

/** Maximum allowed size for .svg files (100KB). */
const MAX_SVG_SIZE: number = 102400;

/** Pattern for excessive indentation in SVG files (8+ leading spaces). */
const EXCESSIVE_INDENT_RE: RegExp = /^\s{8,}/m;

/** Pattern for multiple consecutive blank lines in SVG files. */
const MULTIPLE_BLANK_LINES_RE: RegExp = /\n\s*\n\s*\n/;

/** Warns about image files that are not optimized for size. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-image-optimization',
  description: 'Image files should be optimized for size.',
  scope: 'workspace',
  categories: ['workspace', 'assets'],
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
      const lowerPath: string = filePath.toLowerCase();
      const isWebp: boolean = lowerPath.endsWith('.webp');
      const isSvg: boolean = lowerPath.endsWith('.svg');

      if (!isWebp && !isSvg) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);
      const contentLength: number = content.length;

      if (isWebp && contentLength > MAX_WEBP_SIZE) {
        results.push(
          createResult(
            'workspace/validate-image-optimization',
            filePath,
            1,
            1,
            'warning',
            `WebP file exceeds 300KB (${Math.round(contentLength / 1024)}KB): ${relativePath}`,
            {
              tip: 'Compress the image further or reduce its dimensions to improve load times',
            },
          ),
        );
      }

      if (isSvg) {
        if (contentLength > MAX_SVG_SIZE) {
          results.push(
            createResult(
              'workspace/validate-image-optimization',
              filePath,
              1,
              1,
              'warning',
              `SVG file exceeds 100KB (${Math.round(contentLength / 1024)}KB): ${relativePath}`,
              {
                tip: 'Optimize the SVG using svgo or simplify the vector paths',
              },
            ),
          );
        }

        /** Check for excessive whitespace indicating unminified SVGs. */
        const hasExcessiveIndent: boolean = EXCESSIVE_INDENT_RE.test(content);
        const hasMultipleBlankLines: boolean = MULTIPLE_BLANK_LINES_RE.test(content);

        if (hasExcessiveIndent || hasMultipleBlankLines) {
          results.push(
            createResult(
              'workspace/validate-image-optimization',
              filePath,
              1,
              1,
              'warning',
              `SVG file appears unminified (excessive whitespace): ${relativePath}`,
              {
                tip: 'Minify the SVG using svgo to reduce file size',
              },
            ),
          );
        }
      }
    }

    return results;
  },
};

export default rule;
