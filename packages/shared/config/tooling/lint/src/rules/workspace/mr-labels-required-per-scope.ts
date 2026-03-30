/**
 * Rule: workspace/mr-labels-required-per-scope
 *
 * MR labels must match scoped paths modified in the MR.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Path-to-label scope mapping. */
const SCOPE_MAP: Array<[string, string]> = [
  ['packages/api', 'api'],
  ['packages/docs', 'docs'],
  ['infra/', 'infra'],
  ['.gitlab/', 'ci'],
];

/** MR labels must match scoped paths. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-labels-required-per-scope',
  description: 'MR labels must match scoped paths modified in the MR.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
  check(context: unknown): Promise<
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

    const modifiedPaths: string | undefined = process.env['MODIFIED_PATHS'];
    const labels: string | undefined = process.env['MR_LABELS'];
    if (modifiedPaths === undefined || labels === undefined) {
      return Promise.resolve(results);
    }

    const paths: string[] = modifiedPaths.split(/\s+/).filter(Boolean);

    for (const path of paths) {
      for (const [dir, requiredLabel] of SCOPE_MAP) {
        if (path.startsWith(dir)) {
          if (!labels.includes(requiredLabel)) {
            results.push(
              createResult(
                'workspace/mr-labels-required-per-scope',
                ctx.rootDir,
                1,
                1,
                'error',
                `MR modifies '${dir}' but is missing label: '${requiredLabel}'`,
                {
                  tip: `Add label '${requiredLabel}' to the MR`,
                },
              ),
            );
          }
        }
      }
    }

    return Promise.resolve(results);
  },
};

export default rule;
