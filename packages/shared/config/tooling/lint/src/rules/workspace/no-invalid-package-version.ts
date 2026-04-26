/**
 * Rule: workspace/no-invalid-package-version
 *
 * Validates that package.json version fields are valid semver or workspace:* (for private packages only).
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex for valid semantic version with optional prerelease. */
const SEMVER_REGEX: RegExp = /^([0-9]+\.[0-9]+\.[0-9]+(-[a-z]+\.[0-9]+)?)$/;

/** Validates package.json version fields. */
const rule: WorkspaceRule = {
  id: 'workspace/no-invalid-package-version',
  description:
    'Validates that package.json version fields are valid semver or workspace:* (for private packages only).',
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

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      const { version } = parsed;
      if (typeof version !== 'string' || version.trim().length === 0) {
        results.push(
          createResult(
            'workspace/no-invalid-package-version',
            filePath,
            1,
            1,
            'error',
            `Missing or empty "version" field in ${relativePath}`,
            {
              tip: 'Add a valid semver version like "1.0.0"',
            },
          ),
        );
        continue;
      }

      if (version === 'workspace:*') {
        const isPrivate: boolean = parsed.private === true;
        if (!isPrivate) {
          results.push(
            createResult(
              'workspace/no-invalid-package-version',
              filePath,
              1,
              1,
              'error',
              `"workspace:*" version used in non-private package ${relativePath}`,
              {
                tip: 'Only private packages should use version "workspace:*"',
              },
            ),
          );
        }
        continue;
      }

      if (!SEMVER_REGEX.test(version)) {
        results.push(
          createResult(
            'workspace/no-invalid-package-version',
            filePath,
            1,
            1,
            'error',
            `Invalid version "${version}" in ${relativePath}`,
            {
              tip: 'Use semantic versioning (e.g. "1.0.0") or prerelease (e.g. "0.1.0-beta.1")',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
