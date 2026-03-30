/**
 * Rule: workspace/svg-symbol-requires-viewbox
 *
 * SVG <symbol> elements must include a viewBox attribute.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching a <symbol> element with a viewBox attribute. */
const SYMBOL_WITH_VIEWBOX_RE: RegExp = /<symbol[^>]*viewBox=/i;

/** SVG <symbol> elements must include a viewBox attribute. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-symbol-requires-viewbox',
  description: 'SVG <symbol> elements must include a viewBox attribute.',
  scope: 'workspace',
  categories: ['workspace', 'encoding'],
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
      if (!filePath.toLowerCase().endsWith('.svg')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (content.includes('<symbol') && !SYMBOL_WITH_VIEWBOX_RE.test(content)) {
        results.push(
          createResult(
            'workspace/svg-symbol-requires-viewbox',
            filePath,
            1,
            1,
            'error',
            `SVG <symbol> element is missing a viewBox attribute: ${filePath}`,
            {
              tip: 'Add viewBox="0 0 width height" to all <symbol> elements',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
