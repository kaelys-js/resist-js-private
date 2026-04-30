/**
 * Rule: workspace/gitlab-ci-schema-header
 *
 * All GitLab CI YAML files must include the required schema header as the first line.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Expected schema header for GitLab CI YAML files. */
const REQUIRED_SCHEMA: string =
  '# yaml-language-server: $schema=https://gitlab.com/gitlab-org/gitlab/-/raw/master/app/assets/javascripts/editor/schema/ci.json';

/** Pattern matching GitLab CI YAML file paths. */
const CI_YAML_PATTERN: RegExp =
  /(^|\/)(\.gitlab-ci\.yml|gitlab-ci\.yml|\.gitlab\/ci\/.*\.ya?ml|gitlab\/ci\/.*\.ya?ml)$/;

/** All GitLab CI YAML files must include the required schema header. */
const rule: WorkspaceRule = {
  id: 'workspace/gitlab-ci-schema-header',
  description: 'All GitLab CI YAML files must include the required schema header.',
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

      const firstLine: string = content.split('\n')[0] ?? '';

      if (firstLine !== REQUIRED_SCHEMA) {
        results.push(
          createResult(
            'workspace/gitlab-ci-schema-header',
            filePath,
            1,
            1,
            'error',
            `GitLab CI file is missing required YAML schema header: ${rel}`,
            {
              tip: 'Add the schema header as the FIRST line for IDE support',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
