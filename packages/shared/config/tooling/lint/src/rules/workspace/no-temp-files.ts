/**
 * Rule: workspace/no-temp-files
 *
 * Workspace must not contain leftover temp/debug files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** File extensions that indicate temp/debug files. */
const TEMP_EXTENSIONS: readonly string[] = [
  '.log',
  '.tmp',
  '.bak',
  '.orig',
  '.swp',
  '.swo',
  '.swn',
];

/** Flags leftover temp/debug files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-temp-files',
  description: 'Workspace must not contain leftover temp/debug files.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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

    for await (const filePath of ctx.allFiles()) {
      const name: string = basename(filePath);
      let isTemp: boolean = false;

      /* Check basename */
      if (name === '.DS_Store') {
        isTemp = true;
      }

      /* Check if file ends with ~ */
      if (!isTemp && filePath.endsWith('~')) {
        isTemp = true;
      }

      /* Check temp extensions */
      if (!isTemp) {
        for (const ext of TEMP_EXTENSIONS) {
          if (filePath.endsWith(ext)) {
            isTemp = true;
            break;
          }
        }
      }

      if (isTemp) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-temp-files',
            filePath,
            1,
            1,
            'error',
            `Leftover temp/debug file: ${relativePath}`,
            {
              tip: 'Remove or add to .gitignore',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
