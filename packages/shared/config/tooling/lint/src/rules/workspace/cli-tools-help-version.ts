/**
 * Rule: workspace/cli-tools-help-version
 *
 * All CLI executables must support --help and --version flags.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** All CLI executables must support --help and --version flags. */
const rule: WorkspaceRule = {
  id: 'workspace/cli-tools-help-version',
  description: 'All CLI executables must support --help and --version flags.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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

      /** Only check executables in bin/ or scripts/ directories. */
      if (
        !rel.includes('/bin/') &&
        !rel.includes('/scripts/') &&
        !rel.startsWith('bin/') &&
        !rel.startsWith('scripts/')
      ) {
        continue;
      }
      if (filePath.includes('node_modules') || filePath.includes('.git/')) {
        continue;
      }
      if (!filePath.endsWith('.sh') && !filePath.endsWith('.ts')) {
        continue;
      }

      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      /** Check if the file handles --help flag. */
      const hasHelp: boolean =
        content.includes('--help') || content.includes('-h') || content.includes('usage');

      if (!hasHelp) {
        results.push(
          createResult(
            'workspace/cli-tools-help-version',
            filePath,
            1,
            1,
            'warning',
            `CLI tool does not appear to support --help: ${rel}`,
            {
              tip: 'Add --help flag handling to display usage information',
            },
          ),
        );
      }

      /** Check if the file handles --version flag. */
      const hasVersion: boolean = content.includes('--version') || content.includes('version');

      if (!hasVersion) {
        results.push(
          createResult(
            'workspace/cli-tools-help-version',
            filePath,
            1,
            1,
            'warning',
            `CLI tool does not appear to support --version: ${rel}`,
            {
              tip: 'Add --version flag handling to display version information',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
