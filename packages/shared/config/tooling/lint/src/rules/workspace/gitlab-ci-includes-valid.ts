/**
 * Rule: workspace/gitlab-ci-includes-valid
 *
 * All local include paths in .gitlab-ci.yml must resolve to existing files.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex to extract local include paths from CI YAML. */
const LOCAL_INCLUDE_PATTERN: RegExp = /^\s*-\s+local:\s*"?([^"\s]+)"?\s*$/;

/** All local include paths in .gitlab-ci.yml must resolve to existing files. */
const rule: WorkspaceRule = {
  id: 'workspace/gitlab-ci-includes-valid',
  description: 'All local include paths in .gitlab-ci.yml must resolve to existing files.',
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

    const ciFile: string = `${ctx.rootDir}/.gitlab-ci.yml`;

    let content: string;
    try {
      content = await ctx.readFile(ciFile);
    } catch {
      return results;
    }

    const allFiles: readonly string[] = await ctx.allFiles();
    const fileSet: Set<string> = new Set(allFiles);

    const lines: string[] = content.split('\n');
    for (let i: number = 0; i < lines.length; i++) {
      const match: RegExpMatchArray | null = lines[i]!.match(LOCAL_INCLUDE_PATTERN);
      if (match?.[1]) {
        const includePath: string = match[1];
        const fullPath: string = `${ctx.rootDir}/${includePath}`;
        if (!fileSet.has(fullPath)) {
          results.push(
            createResult(
              'workspace/gitlab-ci-includes-valid',
              ciFile,
              i + 1,
              1,
              'error',
              `Included CI config not found: ${includePath}`,
              {
                tip: 'Verify the path under the include: section of .gitlab-ci.yml',
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
