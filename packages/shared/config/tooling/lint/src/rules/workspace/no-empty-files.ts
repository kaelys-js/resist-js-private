/**
 * Rule: workspace/no-empty-files
 *
 * Files must have content (>0 bytes, not just whitespace).
 * Only checks common source file extensions.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Source file extensions to check for emptiness. */
const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set(['.ts', '.js', '.mjs', '.svelte']);

/** Description. */
const rule: WorkspaceRule = {
  id: 'workspace/no-empty-files',
  description: 'Source files must not be empty or contain only whitespace.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
  stages: ['lint', 'pre-commit', 'ci'],
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
      /* Check extension */
      const lastDot: number = filePath.lastIndexOf('.');
      if (lastDot < 0) {
        continue;
      }
      const ext: string = filePath.slice(lastDot);
      if (!SOURCE_EXTENSIONS.has(ext)) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (content.trim().length === 0) {
        results.push(
          createResult(
            'workspace/no-empty-files',
            filePath,
            1,
            1,
            'warning',
            'File is empty or contains only whitespace',
            {
              tip: 'Add content or delete the file if unused.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
