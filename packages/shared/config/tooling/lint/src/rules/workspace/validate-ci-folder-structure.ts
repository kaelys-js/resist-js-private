/**
 * Rule: workspace/validate-ci-folder-structure
 *
 * Ensures files under .github/ and .gitlab/ directories use only
 * valid extensions (.yml, .yaml, .json, .jsonc, .md).
 *
 * @module
 */

import { join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Extensions allowed inside CI directories. */
const VALID_EXTENSIONS: ReadonlySet<string> = new Set(['.yml', '.yaml', '.json', '.jsonc', '.md']);

/**
 * Check whether a filename ends with one of the valid extensions.
 *
 * @param {string} filePath - File path to check
 * @returns {boolean} True if the extension is valid
 */
function hasValidExtension(filePath: string): boolean {
  for (const ext of VALID_EXTENSIONS) {
    if (filePath.endsWith(ext)) {
      return true;
    }
  }
  return false;
}

/** Validates that CI folder files use only allowed extensions. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-ci-folder-structure',
  description:
    'Files under .github/ and .gitlab/ must use valid extensions (.yml, .yaml, .json, .jsonc, .md).',
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

    const githubPrefix: string = join(ctx.rootDir, '.github');
    const gitlabPrefix: string = join(ctx.rootDir, '.gitlab');

    for (const filePath of await ctx.allFiles()) {
      const isGithub: boolean = filePath.startsWith(githubPrefix + '/');
      const isGitlab: boolean = filePath.startsWith(gitlabPrefix + '/');

      if (!isGithub && !isGitlab) {
        continue;
      }

      if (!hasValidExtension(filePath)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/validate-ci-folder-structure',
            filePath,
            1,
            1,
            'error',
            `Invalid file extension in CI directory: ${relativePath} — only .yml, .yaml, .json, .jsonc, .md are allowed`,
            {
              tip: 'Remove or rename the file to use a valid extension',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
