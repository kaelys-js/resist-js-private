/**
 * Rule: workspace/gitlab-ci-standard-naming
 *
 * CI job names and stage values must use approved conventions.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching GitLab CI YAML file paths. */
const CI_YAML_PATTERN: RegExp =
  /(^|\/)(\.gitlab-ci\.yml|gitlab-ci\.yml|\.gitlab\/ci\/.*\.ya?ml|gitlab\/ci\/.*\.ya?ml)$/;

/** Approved CI stage names. */
const ALLOWED_STAGES: Set<string> = new Set([
  'setup',
  'lint',
  'test',
  'build',
  'deploy',
  'release',
]);

/** Approved CI job name prefixes. */
const ALLOWED_JOBS: Set<string> = new Set([
  'setup',
  'install',
  'lint',
  'test',
  'build',
  'deploy',
  'release',
  'publish',
  'docs',
  'preview',
]);

/** CI job names and stage values must use approved conventions. */
const rule: WorkspaceRule = {
  id: 'workspace/gitlab-ci-standard-naming',
  description: 'CI job names and stage values must use approved conventions.',
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

      for (const [i, line] of lines.entries()) {
        /** Top-level key (job name). */
        const jobMatch: RegExpMatchArray | null = line.match(/^([a-zA-Z0-9_-]+):\s*$/);

        if (jobMatch?.[1]) {
          const [, jobName] = jobMatch;

          if (!ALLOWED_JOBS.has(jobName)) {
            results.push(
              createResult(
                'workspace/gitlab-ci-standard-naming',
                filePath,
                i + 1,
                1,
                'warning',
                `Invalid CI job name in ${rel}: ${jobName}`,
                {
                  tip: `Use one of: ${[...ALLOWED_JOBS].join(', ')}`,
                },
              ),
            );
          }
        }

        /** Stage value under a job. */
        const stageMatch: RegExpMatchArray | null = line.match(/^\s+stage:\s*([a-zA-Z0-9_-]+)\s*$/);

        if (stageMatch?.[1]) {
          const [, stage] = stageMatch;

          if (!ALLOWED_STAGES.has(stage)) {
            results.push(
              createResult(
                'workspace/gitlab-ci-standard-naming',
                filePath,
                i + 1,
                1,
                'warning',
                `Invalid CI stage in ${rel}: ${stage}`,
                {
                  tip: `Allowed stages: ${[...ALLOWED_STAGES].join(', ')}`,
                },
              ),
            );
          }
        }
      }
    }

    return results;
  },
};

export default rule;
