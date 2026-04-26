/**
 * Rule: workspace/validate-script-descriptions
 *
 * Requires meta.scripts.description entries for all package.json scripts
 * across the workspace.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Requires meta.scripts.description for all package.json scripts. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-script-descriptions',
  description: 'Requires meta.scripts.description for all package.json scripts.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
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
      const fileName: string = basename(filePath);

      if (fileName !== 'package.json') {
        continue;
      }

      /* Skip node_modules */
      if (filePath.includes('/node_modules/')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const pkgJson: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      /* If no scripts field, skip */
      const { scripts } = pkgJson;
      if (typeof scripts !== 'object' || scripts === null) {
        continue;
      }

      const scriptsObj: Record<string, unknown> = scripts as Record<string, unknown>;
      const scriptNames: string[] = Object.keys(scriptsObj);

      if (scriptNames.length === 0) {
        continue;
      }

      /* Check meta.scripts.description exists */
      const { meta } = pkgJson;
      let descriptions: Record<string, unknown> | undefined;

      if (typeof meta === 'object' && meta !== null) {
        const metaObj: Record<string, unknown> = meta as Record<string, unknown>;
        const metaScripts: unknown = metaObj.scripts;

        if (typeof metaScripts === 'object' && metaScripts !== null) {
          const metaScriptsObj: Record<string, unknown> = metaScripts as Record<string, unknown>;
          const desc: unknown = metaScriptsObj.description;

          if (typeof desc === 'object' && desc !== null) {
            descriptions = desc as Record<string, unknown>;
          }
        }
      }

      if (!descriptions) {
        results.push(
          createResult(
            'workspace/validate-script-descriptions',
            filePath,
            1,
            1,
            'error',
            `Missing meta.scripts.description in ${relativePath}`,
            {
              tip: 'Add descriptions under meta.scripts.description for each script',
            },
          ),
        );
        continue;
      }

      /* Check each script has a corresponding non-empty description */
      for (const scriptName of scriptNames) {
        const desc: unknown = descriptions[scriptName];

        if (typeof desc !== 'string' || desc.trim().length === 0) {
          results.push(
            createResult(
              'workspace/validate-script-descriptions',
              filePath,
              1,
              1,
              'error',
              `Script '${scriptName}' missing description in ${relativePath}`,
              {
                tip: 'Add descriptions under meta.scripts.description for each script',
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
