/**
 * Rule: workspace/no-unreferenced-shell-scripts
 *
 * Shell scripts in scripts/ directories must be referenced in project files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Reference file extensions to search for script mentions. */
const REFERENCE_EXTENSIONS: readonly string[] = ['.json', '.yml', '.yaml', '.md'];

/** Ensures shell scripts under scripts/ directories are referenced somewhere. */
const rule: WorkspaceRule = {
  id: 'workspace/no-unreferenced-shell-scripts',
  description: 'Shell scripts in scripts/ directories must be referenced in project files.',
  scope: 'workspace',
  categories: ['workspace', 'shell'],
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

    /** First pass: collect shell scripts under scripts/ directories. */
    const shellScripts: string[] = [];
    /** Second pass: collect reference file paths. */
    const referenceFiles: string[] = [];

    for (const filePath of await ctx.allFiles()) {
      if (filePath.endsWith('.sh') && filePath.includes('/scripts/')) {
        shellScripts.push(filePath);
      }

      for (const ext of REFERENCE_EXTENSIONS) {
        if (filePath.endsWith(ext)) {
          referenceFiles.push(filePath);
          break;
        }
      }
    }

    if (shellScripts.length === 0) {
      return results;
    }

    /** Build concatenated reference content for substring matching. */
    const referenceChunks: string[] = [];
    for (const refFile of referenceFiles) {
      try {
        const content: string = await ctx.readFile(refFile);
        referenceChunks.push(content);
      } catch {
        continue;
      }
    }
    const referenceContent: string = referenceChunks.join('\n');

    for (const scriptPath of shellScripts) {
      const scriptBasename: string = basename(scriptPath);
      if (!referenceContent.includes(scriptBasename)) {
        const relativePath: string = relative(ctx.rootDir, scriptPath);
        results.push(
          createResult(
            'workspace/no-unreferenced-shell-scripts',
            scriptPath,
            1,
            1,
            'warning',
            `Shell script '${scriptBasename}' in ${relativePath} is not referenced in any project config or docs`,
            {
              tip: 'Reference this script in package.json, CI config, or README, or remove it',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
