/**
 * Rule: workspace/no-merge-conflicts
 *
 * Scan files for unresolved merge conflict markers
 * (`<<<<<<<`, `=======`, `>>>>>>>`).
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/**
 * Regex matching unresolved merge conflict markers.
 *
 * Real git conflict markers are exactly 7 characters followed by
 * whitespace or end-of-line:
 * - `<<<<<<< HEAD`
 * - `=======`
 * - `>>>>>>> branch-name`
 *
 * Lines with more than 7 repeated characters (e.g. section separators
 * like `====...====`) are NOT conflict markers.
 */
const CONFLICT_MARKER: RegExp = /^(<{7}(?:\s|$)|={7}(?:\s|$)|>{7}(?:\s|$))/;

/** Description. */
const rule: WorkspaceRule = {
  id: 'workspace/no-merge-conflicts',
  description: 'Files must not contain unresolved merge conflict markers.',
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
      /* Skip binary / non-text files by extension */
      if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.woff2')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const lines: string[] = content.split('\n');
      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i] ?? '';
        if (CONFLICT_MARKER.test(line)) {
          results.push(
            createResult(
              'workspace/no-merge-conflicts',
              filePath,
              i + 1,
              1,
              'error',
              `Unresolved merge conflict marker: ${line.slice(0, 7)}`,
              {
                source: line,
                tip: 'Resolve the merge conflict and remove conflict markers.',
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
