/**
 * Rule: workspace/pr-svg-optimized
 *
 * Changed SVG files must be optimized — detect unoptimized SVG patterns.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Patterns indicating an unoptimized SVG. */
const UNOPTIMIZED_PATTERNS: RegExp[] = [
  /xmlns:xlink/,
  /<metadata[\s>]/,
  /inkscape:/,
  /sodipodi:/,
  /<!--[\s\S]*?-->/,
  /data-name=/,
  /style="[^"]*fill:\s*none[^"]*"/,
];

/** Changed SVG files must be optimized — detect unoptimized SVG patterns. */
const rule: WorkspaceRule = {
  id: 'workspace/pr-svg-optimized',
  description: 'Changed SVG files must be optimized — detect unoptimized SVG patterns.',
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

    const changedFilesEnv: string | undefined = process.env['MR_CHANGED_FILES'];
    let svgFiles: string[];

    if (changedFilesEnv !== undefined) {
      svgFiles = changedFilesEnv
        .split(/[\n\s]+/)
        .filter((f: string): boolean => f.endsWith('.svg'));
    } else {
      const allFiles: readonly string[] = await ctx.allFiles();
      svgFiles = allFiles.filter((f: string): boolean => f.endsWith('.svg'));
    }

    for (const file of svgFiles) {
      let content: string;
      try {
        content = await ctx.readFile(file);
      } catch {
        continue;
      }

      for (const pattern of UNOPTIMIZED_PATTERNS) {
        if (pattern.test(content)) {
          results.push(
            createResult(
              'workspace/pr-svg-optimized',
              file,
              1,
              1,
              'warning',
              `SVG file "${file}" is not optimized — use svgo to optimize`,
              { tip: 'Run svgo on the file before committing' },
            ),
          );
          break;
        }
      }
    }

    return results;
  },
};

export default rule;
