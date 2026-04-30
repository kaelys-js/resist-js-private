/**
 * Rule: workspace/gitlab-ci-jobs-have-script
 *
 * Every CI job must include a script: entry.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching GitLab CI YAML file paths. */
const CI_YAML_PATTERN: RegExp =
  /(^|\/)(\.gitlab-ci\.yml|gitlab-ci\.yml|\.gitlab\/ci\/.*\.ya?ml|gitlab\/ci\/.*\.ya?ml)$/;

/** Top-level keys that are NOT jobs. */
const NON_JOB_KEYS: Set<string> = new Set([
  'stages',
  'include',
  'default',
  'workflow',
  'variables',
  'before_script',
  'after_script',
]);

/** Every CI job must include a script: entry. */
const rule: WorkspaceRule = {
  id: 'workspace/gitlab-ci-jobs-have-script',
  description: 'Every CI job must include a script: entry.',
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
      let currentJob: string | null = null;
      let currentJobLine: number = 0;
      let hasScript: boolean = false;

      for (const [i, line] of lines.entries()) {
        /** Detect top-level key (no leading whitespace, ends with :). */
        const topKeyMatch: RegExpMatchArray | null = line.match(/^([a-zA-Z0-9_-]+):\s*$/);

        if (topKeyMatch?.[1]) {
          /** Flush previous job. */
          if (currentJob !== null && !hasScript) {
            results.push(
              createResult(
                'workspace/gitlab-ci-jobs-have-script',
                filePath,
                currentJobLine,
                1,
                'error',
                `CI job '${currentJob}' in ${rel} is missing a script: entry`,
                {
                  tip: 'Add a script: entry to this job',
                },
              ),
            );
          }

          const [, key] = topKeyMatch;

          if (NON_JOB_KEYS.has(key)) {
            currentJob = null;
          } else {
            currentJob = key;
            currentJobLine = i + 1;
            hasScript = false;
          }
        }

        /** Detect script: under current job. */
        if (currentJob !== null && /^\s+script:\s*/.test(line)) {
          hasScript = true;
        }
      }

      /** Flush last job. */
      if (currentJob !== null && !hasScript) {
        results.push(
          createResult(
            'workspace/gitlab-ci-jobs-have-script',
            filePath,
            currentJobLine,
            1,
            'error',
            `CI job '${currentJob}' in ${rel} is missing a script: entry`,
            {
              tip: 'Add a script: entry to this job',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
