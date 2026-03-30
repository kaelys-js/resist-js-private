/**
 * Rule: workspace/validate-all-contributorsrc
 *
 * Validates .all-contributorsrc structure when present:
 * must be valid JSON with $schema, projectName, and contributors array
 * where each contributor has a non-empty login and non-empty contributions array.
 *
 * @module
 */

import { join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Validates .all-contributorsrc structure when the file exists. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-all-contributorsrc',
  description: '.all-contributorsrc must be valid JSON with required fields when present.',
  scope: 'workspace',
  categories: ['workspace', 'config'],
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
    const filePath: string = join(ctx.rootDir, '.all-contributorsrc');

    const exists: boolean = await ctx.fileExists(filePath);
    if (!exists) {
      return [];
    }

    const content: string = await ctx.readFile(filePath);
    const relativePath: string = relative(ctx.rootDir, filePath);

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      results.push(
        createResult(
          'workspace/validate-all-contributorsrc',
          filePath,
          1,
          1,
          'error',
          `${relativePath} contains invalid JSON`,
          {
            tip: 'Fix the JSON syntax in .all-contributorsrc',
          },
        ),
      );
      return results;
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      results.push(
        createResult(
          'workspace/validate-all-contributorsrc',
          filePath,
          1,
          1,
          'error',
          `${relativePath} must be a JSON object`,
        ),
      );
      return results;
    }

    const obj: Record<string, unknown> = parsed as Record<string, unknown>;

    if (typeof obj['$schema'] !== 'string') {
      results.push(
        createResult(
          'workspace/validate-all-contributorsrc',
          filePath,
          1,
          1,
          'error',
          `${relativePath} missing required "$schema" field (must be a string)`,
          {
            tip: 'Add a "$schema" field pointing to the all-contributors schema',
          },
        ),
      );
    }

    if (typeof obj['projectName'] !== 'string') {
      results.push(
        createResult(
          'workspace/validate-all-contributorsrc',
          filePath,
          1,
          1,
          'error',
          `${relativePath} missing required "projectName" field (must be a string)`,
          {
            tip: 'Add a "projectName" field with the project name',
          },
        ),
      );
    }

    if (!Array.isArray(obj['contributors'])) {
      results.push(
        createResult(
          'workspace/validate-all-contributorsrc',
          filePath,
          1,
          1,
          'error',
          `${relativePath} missing required "contributors" field (must be an array)`,
          {
            tip: 'Add a "contributors" array with contributor objects',
          },
        ),
      );
      return results;
    }

    const contributors: unknown[] = obj['contributors'] as unknown[];
    for (let i: number = 0; i < contributors.length; i++) {
      const contributor: unknown = contributors[i];
      if (typeof contributor !== 'object' || contributor === null || Array.isArray(contributor)) {
        results.push(
          createResult(
            'workspace/validate-all-contributorsrc',
            filePath,
            1,
            1,
            'error',
            `${relativePath} contributors[${String(i)}] must be an object`,
          ),
        );
        continue;
      }

      const entry: Record<string, unknown> = contributor as Record<string, unknown>;

      if (typeof entry['login'] !== 'string' || entry['login'].trim().length === 0) {
        results.push(
          createResult(
            'workspace/validate-all-contributorsrc',
            filePath,
            1,
            1,
            'error',
            `${relativePath} contributors[${String(i)}] missing or empty "login" field`,
            {
              tip: 'Each contributor must have a non-empty "login" string',
            },
          ),
        );
      }

      if (
        !Array.isArray(entry['contributions']) ||
        (entry['contributions'] as unknown[]).length === 0
      ) {
        results.push(
          createResult(
            'workspace/validate-all-contributorsrc',
            filePath,
            1,
            1,
            'error',
            `${relativePath} contributors[${String(i)}] missing or empty "contributions" field`,
            {
              tip: 'Each contributor must have a non-empty "contributions" array',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
