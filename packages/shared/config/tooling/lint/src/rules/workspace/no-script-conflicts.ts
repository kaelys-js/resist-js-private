/**
 * Rule: workspace/no-script-conflicts
 *
 * Detects same-named scripts with different values across package.json files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Detects conflicting script definitions across packages. */
const rule: WorkspaceRule = {
  id: 'workspace/no-script-conflicts',
  description: 'Detects same-named scripts with different values across package.json files.',
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

    const scriptRegistry: Map<string, { value: string; file: string }> = new Map<
      string,
      { value: string; file: string }
    >();
    const conflicts: Array<{
      scriptName: string;
      file: string;
      value: string;
      firstFile: string;
      firstValue: string;
    }> = [];

    for (const filePath of await ctx.allFiles()) {
      const fileName: string = basename(filePath);
      if (fileName !== 'package.json') {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;

      const scripts: unknown = parsed.scripts;
      if (scripts === undefined || scripts === null || typeof scripts !== 'object') {
        continue;
      }

      const scriptEntries: Record<string, unknown> = scripts as Record<string, unknown>;

      for (const [scriptName, scriptValue] of Object.entries(scriptEntries)) {
        if (typeof scriptValue !== 'string') {
          continue;
        }

        const existing: { value: string; file: string } | undefined =
          scriptRegistry.get(scriptName);
        if (existing !== undefined) {
          if (existing.value !== scriptValue) {
            conflicts.push({
              scriptName,
              file: filePath,
              value: scriptValue,
              firstFile: existing.file,
              firstValue: existing.value,
            });
          }
        } else {
          scriptRegistry.set(scriptName, { value: scriptValue, file: filePath });
        }
      }
    }

    for (const conflict of conflicts) {
      const relativePath: string = relative(ctx.rootDir, conflict.file);
      const firstRelativePath: string = relative(ctx.rootDir, conflict.firstFile);
      results.push(
        createResult(
          'workspace/no-script-conflicts',
          conflict.file,
          1,
          1,
          'warning',
          `Conflicting script "${conflict.scriptName}" in ${relativePath} differs from ${firstRelativePath}`,
          {
            tip: 'Use consistent script values across packages or rename for clarity',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
