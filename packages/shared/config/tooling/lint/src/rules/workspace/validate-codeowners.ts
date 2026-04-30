/**
 * Rule: workspace/validate-codeowners
 *
 * Validates CODEOWNERS file structure when present.
 * Checks three locations: CODEOWNERS, .github/CODEOWNERS, .gitlab/CODEOWNERS.
 * If found, ensures it is non-empty and each rule line has both a path and an owner.
 *
 * @module
 */

import { join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Possible locations for the CODEOWNERS file. */
const CODEOWNERS_PATHS: readonly string[] = [
  'CODEOWNERS',
  '.github/CODEOWNERS',
  '.gitlab/CODEOWNERS',
];

/** Validates CODEOWNERS file structure when present. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-codeowners',
  description: 'CODEOWNERS file must be non-empty with valid path + owner entries when present.',
  scope: 'workspace',
  categories: ['workspace', 'config'],
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

    let foundPath: string | undefined;

    for (const candidate of CODEOWNERS_PATHS) {
      const fullPath: string = join(ctx.rootDir, candidate);
      const exists: boolean = await ctx.fileExists(fullPath);

      if (exists) {
        foundPath = fullPath;
        break;
      }
    }

    if (foundPath === undefined) {
      return [];
    }

    const content: string = await ctx.readFile(foundPath);
    const relativePath: string = relative(ctx.rootDir, foundPath);

    if (content.trim().length === 0) {
      results.push(
        createResult(
          'workspace/validate-codeowners',
          foundPath,
          1,
          1,
          'error',
          `CODEOWNERS file is empty: ${relativePath}`,
          {
            tip: 'Add ownership rules (e.g. "* @org/team") or remove the file',
          },
        ),
      );
      return results;
    }

    const lines: string[] = content.split('\n');

    for (let i: number = 0; i < lines.length; i++) {
      const line: string = (lines[i] ?? '').trim();

      if (line.length === 0 || line.startsWith('#')) {
        continue;
      }

      const tokens: string[] = line.split(/\s+/);

      if (tokens.length < 2) {
        results.push(
          createResult(
            'workspace/validate-codeowners',
            foundPath,
            i + 1,
            1,
            'error',
            `${relativePath} line ${String(i + 1)} missing owner assignment`,
            {
              tip: 'Each CODEOWNERS rule must have at least a path and an owner (e.g. "*.ts @org/team")',
              source: line,
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
