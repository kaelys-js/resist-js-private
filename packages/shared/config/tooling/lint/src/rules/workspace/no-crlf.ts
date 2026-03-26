/**
 * Rule: workspace/no-crlf
 *
 * Check text files for Windows-style line endings (CRLF).
 * Only checks common text file extensions.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Text file extensions to check for CRLF. */
const TEXT_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.yaml',
  '.yml',
  '.html',
  '.css',
  '.svelte',
  '.toml',
  '.sh',
]);

/**
 * Get the file extension, supporting compound extensions like `.svelte.ts`.
 *
 * @param filePath - File path
 * @returns Extension including the dot
 */
function getExtension(filePath: string): string {
  const lastSlash: number = filePath.lastIndexOf('/');
  const name: string = filePath.slice(lastSlash + 1);
  const dotIdx: number = name.indexOf('.');
  if (dotIdx < 0) {
    return '';
  }
  return name.slice(dotIdx);
}

const rule: WorkspaceRule = {
  id: 'workspace/no-crlf',
  description: 'Text files must use LF line endings, not CRLF.',
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
      const ext: string = getExtension(filePath);
      if (!TEXT_EXTENSIONS.has(ext)) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (content.includes('\r\n')) {
        results.push(
          createResult(
            'workspace/no-crlf',
            filePath,
            1,
            1,
            'error',
            'File uses CRLF line endings',
            {
              tip: 'Convert to LF line endings. Configure git: git config core.autocrlf input',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
