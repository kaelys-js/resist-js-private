/**
 * Rule: workspace/no-duplicate-ci-job-names
 *
 * CI job names must be unique across all CI configuration files.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex matching top-level YAML keys (no leading whitespace). */
const TOP_LEVEL_KEY_PATTERN: RegExp = /^([a-zA-Z][a-zA-Z0-9_-]*):/;

/** Reserved YAML keys that are not job names. */
const RESERVED_KEYS: ReadonlySet<string> = new Set([
  'name',
  'on',
  'jobs',
  'stages',
  'include',
  'default',
  'workflow',
  'variables',
  'before_script',
  'after_script',
  'env',
  'permissions',
  'concurrency',
  'true',
  'false',
]);

/** Flags duplicate CI job names across all CI configuration files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-duplicate-ci-job-names',
  description: 'CI job names must be unique across all CI configuration files.',
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

    /** Track job names globally: name → { file, line }. */
    const jobNameMap: Map<string, { file: string; line: number }> = new Map();

    for (const filePath of await ctx.allFiles()) {
      const relativePath: string = relative(ctx.rootDir, filePath);

      /** Only check CI YAML files under .github/ or .gitlab/ directories. */
      const isGitHub: boolean = relativePath.startsWith('.github/');
      const isGitLab: boolean = relativePath.startsWith('.gitlab/');
      if (!isGitHub && !isGitLab) {
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

      const lines: string[] = content.split('\n');
      for (const [i, line] of lines.entries()) {
        const match: RegExpMatchArray | null = line.match(TOP_LEVEL_KEY_PATTERN);
        if (match === null) {
          continue;
        }

        const jobName: string = match[1] ?? '';
        if (RESERVED_KEYS.has(jobName)) {
          continue;
        }

        const existing: { file: string; line: number } | undefined = jobNameMap.get(jobName);
        if (existing === undefined) {
          jobNameMap.set(jobName, { file: filePath, line: i + 1 });
        } else {
          const existingRelative: string = relative(ctx.rootDir, existing.file);
          results.push(
            createResult(
              'workspace/no-duplicate-ci-job-names',
              filePath,
              i + 1,
              1,
              'error',
              `Duplicate CI job name '${jobName}' found in both ${existingRelative} and ${relativePath}`,
              {
                tip: 'Rename the job to be unique across all CI configuration files',
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
