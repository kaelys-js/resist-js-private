/**
 * Rule: workspace/validate-package-tags
 *
 * Enforce valid tags in package.json files under packages/.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Approved tag values for package.json files. */
const APPROVED_TAGS: ReadonlySet<string> = new Set([
  'core',
  'lib',
  'ui',
  'api',
  'service',
  'worker',
  'cli',
  'plugin',
  'internal',
  'external',
  'shared',
  'private',
  'public',
  'backend',
  'frontend',
  'mobile',
  'web',
  'edge',
  'cloud',
  'integration',
  'system',
  'database',
  'config',
  'infra',
  'build',
  'test',
  'devtools',
  'sdk',
  'runtime',
  'schema',
]);

/** Tag format must be lowercase alphanumeric with hyphens. */
const TAG_FORMAT_REGEX: RegExp = /^[a-z0-9-]+$/;

/** Enforce valid tags in package.json files under packages/. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-package-tags',
  description: 'Package.json files under packages/ must have valid tags.',
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
      const name: string = basename(filePath);
      if (name !== 'package.json') {
        continue;
      }
      if (filePath.includes('node_modules')) {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);
      if (!relativePath.startsWith('packages/')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content) as Record<string, unknown>;
      } catch {
        continue;
      }

      const { tags } = parsed;

      if (!Array.isArray(tags)) {
        results.push(
          createResult(
            'workspace/validate-package-tags',
            filePath,
            1,
            1,
            'error',
            `Missing 'tags' field in ${relativePath}`,
            {
              tip: 'Use only approved tags from the standard set',
            },
          ),
        );
        continue;
      }

      if (tags.length === 0) {
        results.push(
          createResult(
            'workspace/validate-package-tags',
            filePath,
            1,
            1,
            'error',
            `Empty 'tags' array in ${relativePath}`,
            {
              tip: 'Use only approved tags from the standard set',
            },
          ),
        );
        continue;
      }

      for (const tag of tags) {
        if (typeof tag !== 'string') {
          continue;
        }

        if (!TAG_FORMAT_REGEX.test(tag)) {
          results.push(
            createResult(
              'workspace/validate-package-tags',
              filePath,
              1,
              1,
              'error',
              `Invalid tag format '${tag}' in ${relativePath}`,
              {
                tip: 'Use only approved tags from the standard set',
              },
            ),
          );
        } else if (!APPROVED_TAGS.has(tag)) {
          results.push(
            createResult(
              'workspace/validate-package-tags',
              filePath,
              1,
              1,
              'error',
              `Unknown tag '${tag}' in ${relativePath} — not in approved set`,
              {
                tip: 'Use only approved tags from the standard set',
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
