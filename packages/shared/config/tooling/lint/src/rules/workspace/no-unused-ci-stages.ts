/**
 * Rule: workspace/no-unused-ci-stages
 *
 * Declared CI stages must be referenced by at least one job.
 * Parses `stages:` array entries and `stage:` references from CI YAML files
 * to detect declared stages that are never used.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex matching a stage reference in a job definition. */
const STAGE_REF_PATTERN: RegExp = /^\s+stage:\s*(.+)/;

/** Declared CI stages must be referenced by at least one job. */
const rule: WorkspaceRule = {
  id: 'workspace/no-unused-ci-stages',
  description: 'Declared CI stages must be referenced by at least one job.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
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
      if (!filePath.endsWith('.yml') && !filePath.endsWith('.yaml')) {
        continue;
      }

      /* Only process CI YAML files under .github/ or .gitlab/. */
      const relativePath: string = relative(ctx.rootDir, filePath);
      if (!relativePath.startsWith('.github/') && !relativePath.startsWith('.gitlab/')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const lines: string[] = content.split('\n');
      const declaredStages: Map<string, number> = new Map();
      const usedStages: Set<string> = new Set();

      /* Extract declared stages from the `stages:` block. */
      let inStagesBlock: boolean = false;
      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i] ?? '';

        if (line.match(/^stages:\s*$/) !== null) {
          inStagesBlock = true;
          continue;
        }

        if (inStagesBlock) {
          const stageEntry: RegExpMatchArray | null = line.match(/^\s+-\s+(.+)/);
          if (stageEntry !== null) {
            const stageName: string = (stageEntry[1] ?? '').trim().replace(/^['"]|['"]$/g, '');
            if (stageName.length > 0) {
              declaredStages.set(stageName, i + 1);
            }
          } else {
            /* Exit stages block when line doesn't match list item pattern. */
            inStagesBlock = false;
          }
        }

        /* Extract stage references from job definitions. */
        const refMatch: RegExpMatchArray | null = line.match(STAGE_REF_PATTERN);
        if (refMatch !== null) {
          const stageName: string = (refMatch[1] ?? '').trim().replace(/^['"]|['"]$/g, '');
          if (stageName.length > 0) {
            usedStages.add(stageName);
          }
        }
      }

      /* Flag declared stages that are never referenced. */
      for (const [stageName, lineNumber] of declaredStages) {
        if (!usedStages.has(stageName)) {
          results.push(
            createResult(
              'workspace/no-unused-ci-stages',
              filePath,
              lineNumber,
              1,
              'error',
              `Stage '${stageName}' is declared but never referenced by any job in ${relativePath}`,
              {
                tip: `Remove the unused stage '${stageName}' or add a job that references it`,
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
