/**
 * Rule: workspace/require-ci-job-timeouts
 *
 * CI jobs must declare timeout values within safe limits.
 * Validates that any timeout-minutes (GitHub Actions) or timeout (GitLab CI)
 * values do not exceed 60 minutes.
 *
 * @module
 */

import { join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex matching GitHub Actions timeout-minutes values. */
const GITHUB_TIMEOUT_PATTERN: RegExp = /timeout-minutes:\s*(\d+)/g;

/** Regex matching GitLab CI timeout values (numeric minutes). */
const GITLAB_TIMEOUT_PATTERN: RegExp = /timeout:\s*(\d+)/g;

/** Maximum allowed timeout in minutes. */
const MAX_TIMEOUT_MINUTES: number = 60;

/** CI jobs must declare timeout values within safe limits. */
const rule: WorkspaceRule = {
  id: 'workspace/require-ci-job-timeouts',
  description: 'CI jobs must declare timeout values within safe limits.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule depends on git/CI state via execSync. */
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

    const githubPrefix: string = join(ctx.rootDir, '.github');
    const gitlabPrefix: string = join(ctx.rootDir, '.gitlab');

    for (const filePath of await ctx.allFiles()) {
      const isGithub: boolean = filePath.startsWith(`${githubPrefix}/`);
      const isGitlab: boolean = filePath.startsWith(`${gitlabPrefix}/`);

      if (!isGithub && !isGitlab) {
        continue;
      }

      if (!filePath.endsWith('.yml') && !filePath.endsWith('.yaml')) {
        continue;
      }

      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);
      const lines: string[] = content.split('\n');

      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i] ?? '';

        /* Check GitHub Actions timeout-minutes. */
        GITHUB_TIMEOUT_PATTERN.lastIndex = 0;
        const githubMatch: RegExpExecArray | null = GITHUB_TIMEOUT_PATTERN.exec(line);

        if (githubMatch !== null) {
          const value: number = Number(githubMatch[1]);

          if (value > MAX_TIMEOUT_MINUTES) {
            results.push(
              createResult(
                'workspace/require-ci-job-timeouts',
                filePath,
                i + 1,
                1,
                'error',
                `CI job timeout exceeds 60 minutes in ${relativePath} line ${String(i + 1)}: timeout-minutes: ${String(value)}`,
                {
                  tip: `Reduce timeout-minutes to ${String(MAX_TIMEOUT_MINUTES)} or less`,
                  source: line.trim(),
                },
              ),
            );
          }
        }

        /* Check GitLab CI timeout. */
        GITLAB_TIMEOUT_PATTERN.lastIndex = 0;
        const gitlabMatch: RegExpExecArray | null = GITLAB_TIMEOUT_PATTERN.exec(line);

        if (gitlabMatch !== null) {
          const value: number = Number(gitlabMatch[1]);

          if (value > MAX_TIMEOUT_MINUTES) {
            results.push(
              createResult(
                'workspace/require-ci-job-timeouts',
                filePath,
                i + 1,
                1,
                'error',
                `CI job timeout exceeds 60 minutes in ${relativePath} line ${String(i + 1)}: timeout: ${String(value)}`,
                {
                  tip: `Reduce timeout to ${String(MAX_TIMEOUT_MINUTES)} or less`,
                  source: line.trim(),
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
