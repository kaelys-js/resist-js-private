/**
 * Rule: workspace/gitlab-ci-stages-standard
 *
 * CI files must declare all required stages in correct order with no unapproved stages.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching GitLab CI YAML file paths. */
const CI_YAML_PATTERN: RegExp =
  /(^|\/)(\.gitlab-ci\.yml|gitlab-ci\.yml|\.gitlab\/ci\/.*\.ya?ml|gitlab\/ci\/.*\.ya?ml)$/;

/** Approved stages in required order. */
const APPROVED_STAGES: string[] = [
  'setup',
  'check',
  'lint',
  'test',
  'build',
  'migrate',
  'deploy',
  'integration',
  'docs',
];

/** CI files must declare all required stages in correct order. */
const rule: WorkspaceRule = {
  id: 'workspace/gitlab-ci-stages-standard',
  description: 'CI files must declare all required stages in correct order.',
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

      /** Extract stages array from YAML content. */
      const lines: string[] = content.split('\n');
      let inStages: boolean = false;
      const declaredStages: string[] = [];
      let stagesLine: number = 0;

      for (const [i, line] of lines.entries()) {
        if (/^\s*stages:\s*$/.test(line)) {
          inStages = true;
          stagesLine = i + 1;
          continue;
        }

        if (inStages) {
          const stageMatch: RegExpMatchArray | null = line.match(/^\s+-\s+(.+)$/);

          if (stageMatch?.[1]) {
            declaredStages.push(stageMatch[1].trim());
          } else if (!/^\s*$/.test(line) && !line.trim().startsWith('#')) {
            inStages = false;
          }
        }
      }

      if (declaredStages.length === 0) {
        continue;
      }

      const approvedSet: Set<string> = new Set(APPROVED_STAGES);

      /** Check for missing required stages. */
      for (const stage of APPROVED_STAGES) {
        if (!declaredStages.includes(stage)) {
          results.push(
            createResult(
              'workspace/gitlab-ci-stages-standard',
              filePath,
              stagesLine,
              1,
              'error',
              `Missing required stage '${stage}' in ${rel}`,
              {
                tip: `Add '${stage}' to the stages array`,
              },
            ),
          );
        }
      }

      /** Check for unapproved stages. */
      for (const stage of declaredStages) {
        if (!approvedSet.has(stage)) {
          results.push(
            createResult(
              'workspace/gitlab-ci-stages-standard',
              filePath,
              stagesLine,
              1,
              'error',
              `Unapproved CI stage in ${rel}: '${stage}'`,
              {
                tip: `Only use approved stages: ${APPROVED_STAGES.join(', ')}`,
              },
            ),
          );
        }
      }

      /** Check stage order. */
      const filteredDeclared: string[] = [];

      for (const s of declaredStages) {
        if (approvedSet.has(s)) {
          filteredDeclared.push(s);
        }
      }

      for (const [i, actual] of filteredDeclared.entries()) {
        const expected: string | undefined = APPROVED_STAGES[i];

        if (expected !== actual) {
          results.push(
            createResult(
              'workspace/gitlab-ci-stages-standard',
              filePath,
              stagesLine,
              1,
              'error',
              `Incorrect stage order in ${rel}: expected '${expected ?? ''}' at position ${String(i + 1)}, found '${actual}'`,
              {
                tip: `Sort stages to match: ${APPROVED_STAGES.join(', ')}`,
              },
            ),
          );
          break;
        }
      }
    }

    return results;
  },
};

export default rule;
