/**
 * Rule: workspace/mr-dependency-changes-reviewed
 *
 * Dependency file changes require deps-reviewed label.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Dependency file changes require deps-reviewed label. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-dependency-changes-reviewed',
  description: 'Dependency file changes require deps-reviewed label.',
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
    if (modifiedPaths === undefined) {
      return Promise.resolve(results);
    }

    const paths: string[] = modifiedPaths.split(/\s+/).filter(Boolean);

    for (const path of paths) {
      if (path.endsWith('package.json') || path.endsWith('pnpm-lock.yaml')) {
        if (!labels?.includes('deps-reviewed')) {
          results.push(
            createResult(
              'workspace/mr-dependency-changes-reviewed',
              ctx.rootDir,
              1,
              1,
              'error',
              `Dependency file changed without 'deps-reviewed' label: ${path}`,
              {
                tip: "Add 'deps-reviewed' label after peer review of changes",
              },
            ),
          );
          return Promise.resolve(results);
        }
      }
    }

    return Promise.resolve(results);
  },
};

export default rule;
