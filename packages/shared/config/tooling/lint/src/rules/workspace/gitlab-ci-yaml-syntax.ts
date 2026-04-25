/**
 * Rule: workspace/gitlab-ci-yaml-syntax
 *
 * GitLab CI YAML files must be valid YAML (basic structural validation).
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching GitLab CI YAML file paths. */
const CI_YAML_PATTERN: RegExp =
  /(^|\/)(\.gitlab-ci\.yml|gitlab-ci\.yml|\.gitlab\/ci\/.*\.ya?ml|gitlab\/ci\/.*\.ya?ml)$/;

/** GitLab CI YAML files must be valid YAML. */
const rule: WorkspaceRule = {
  id: 'workspace/gitlab-ci-yaml-syntax',
  description: 'GitLab CI YAML files must be valid YAML.',
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

    for (const filePath of await ctx.allFiles()) {
      const rel: string = relative(ctx.rootDir, filePath);
      if (!CI_YAML_PATTERN.test(rel)) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const lines: string[] = content.split('\n');
      let hasError: boolean = false;

      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i]!;
        /** Tabs are not valid YAML indentation. */
        if (line.startsWith('\t') || (line.length > 0 && /^\s*\t/.test(line))) {
          results.push(
            createResult(
              'workspace/gitlab-ci-yaml-syntax',
              filePath,
              i + 1,
              1,
              'error',
              `Tab character found in YAML indentation: ${rel}:${String(i + 1)}`,
              {
                tip: 'Use spaces for YAML indentation, not tabs',
              },
            ),
          );
          hasError = true;
        }
      }

      /** Check for unbalanced braces/brackets. */
      if (!hasError) {
        let braces: number = 0;
        let brackets: number = 0;
        for (const line of lines) {
          const trimmed: string = line.trim();
          if (trimmed.startsWith('#')) {
            continue;
          }
          for (const ch of trimmed) {
            if (ch === '{') {
              braces++;
            }
            if (ch === '}') {
              braces--;
            }
            if (ch === '[') {
              brackets++;
            }
            if (ch === ']') {
              brackets--;
            }
          }
        }
        if (braces !== 0 || brackets !== 0) {
          results.push(
            createResult(
              'workspace/gitlab-ci-yaml-syntax',
              filePath,
              1,
              1,
              'error',
              `Unbalanced braces or brackets in YAML file: ${rel}`,
              {
                tip: 'Check for mismatched { } or [ ] in the file',
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
