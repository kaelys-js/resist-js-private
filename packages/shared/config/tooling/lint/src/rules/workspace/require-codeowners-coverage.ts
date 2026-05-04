/**
 * Rule: workspace/require-codeowners-coverage
 *
 * CODEOWNERS must cover critical workspace directories.
 * Verifies that the CODEOWNERS file includes patterns for key directories
 * such as packages/, scripts/, .github/, .vscode/, and docs/.
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

/** Critical paths that must be covered by CODEOWNERS. */
const CRITICAL_PATHS: readonly string[] = [
  'packages/',
  'scripts/',
  '.github/',
  '.vscode/',
  'docs/',
];

/** CODEOWNERS must cover critical workspace directories. */
const rule: WorkspaceRule = {
  id: 'workspace/require-codeowners-coverage',
  description: 'CODEOWNERS must cover critical workspace directories.',
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

    /* Find CODEOWNERS file from possible locations. */
    let foundPath: string | undefined;

    for (const candidate of CODEOWNERS_PATHS) {
      const fullPath: string = join(ctx.rootDir, candidate);
      const exists: boolean = await ctx.fileExists(fullPath);

      if (exists) {
        foundPath = fullPath;
        break;
      }
    }

    /* If no CODEOWNERS found, skip (handled by validate-codeowners rule). */
    if (foundPath === undefined) {
      return [];
    }

    let content: string;

    try {
      content = await ctx.readFile(foundPath);
    } catch {
      return [];
    }

    const relativePath: string = relative(ctx.rootDir, foundPath);
    const lines: string[] = content.split('\n');

    /* Collect non-comment, non-empty lines for pattern matching. */
    const ruleLines: string[] = [];

    for (const line of lines) {
      const trimmed: string = line.trim();

      if (trimmed.length > 0 && !trimmed.startsWith('#')) {
        ruleLines.push(trimmed);
      }
    }

    /* Check each critical path for coverage. */
    for (const criticalPath of CRITICAL_PATHS) {
      let isCovered: boolean = false;

      for (const ruleLine of ruleLines) {
        if (ruleLine.includes(criticalPath)) {
          isCovered = true;
          break;
        }
      }

      if (!isCovered) {
        results.push(
          createResult(
            'workspace/require-codeowners-coverage',
            foundPath,
            1,
            1,
            'error',
            `CODEOWNERS is missing coverage for critical path '${criticalPath}' in ${relativePath}`,
            {
              tip: `Add a CODEOWNERS rule for '${criticalPath}' (e.g. '${criticalPath}* @org/team')`,
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
